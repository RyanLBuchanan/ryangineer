// Keyless Earth viewer. Observations and the latest NHC advisory remain separate.
export const HOME = [-87.5736, 30.2697];
export const NHC = 'https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer';
const GIBS = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';
const SATELLITE = 'GOES-East_ABI_GeoColor';
const empty = () => ({ type: 'FeatureCollection', features: [] });

export function domainFrames(domains, now = Date.now()) {
  const result = new Set();
  for (const domain of domains) {
    const [start, end, step] = domain.trim().split('/');
    const a = Date.parse(start), b = end ? Date.parse(end) : a;
    const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(step || 'PT10M');
    const stride = match ? (+match[1] || 0) * 3600000 + (+match[2] || 0) * 60000 + (+match[3] || 0) * 1000 : 600000;
    if (!Number.isFinite(a) || !Number.isFinite(b) || stride <= 0 || b < a) continue;
    // Only expand the recent part, even when a domain spans months.
    const first = a + Math.max(0, Math.ceil((now - 3 * 3600000 - a) / stride)) * stride;
    for (let time = first; time <= Math.min(b, now); time += stride) result.add(time);
  }
  return [...result].sort((a, b) => a - b).slice(-19).map(time => ({ time, kind: 'satellite' }));
}

export function forecastTime(properties) {
  const m = /^(\d{2})\/(\d{2})(\d{2})$/.exec(String(properties.validtime || ''));
  const reference = Number(properties.idp_filedate);
  if (!m || !Number.isFinite(reference)) return null;
  const date = new Date(reference);
  const candidates = [-1, 0, 1].map(offset => Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, +m[1], +m[2], +m[3]));
  return candidates.sort((a, b) => Math.abs(a - reference) - Math.abs(b - reference))[0];
}

export function stormKey(feature) {
  const p = feature.properties || {};
  // NHC points have idp_subset; lines/cones use differently cased idp_source.
  const id = p.idp_subset || /^([a-z]{2}\d{6})/i.exec(String(p.idp_source || ''))?.[1];
  return String(id || p.stormname || '').toLowerCase();
}
export function selectStorm(features, key) { return { type: 'FeatureCollection', features: features.filter(f => stormKey(f) === key) }; }

export function stormOptions(features) {
  const groups = new Map();
  for (const feature of features) {
    if (feature.geometry?.type !== 'Point' || !feature.geometry.coordinates.every(Number.isFinite)) continue;
    const key = stormKey(feature), p = feature.properties || {};
    if (!key) continue;
    const [lon, lat] = feature.geometry.coordinates;
    const distance = ((lon - HOME[0]) * Math.cos(HOME[1] * Math.PI / 180)) ** 2 + (lat - HOME[1]) ** 2;
    if (!groups.has(key) || +p.tau === 0) groups.set(key, { key, name: String(p.stormname || key), distance, basin: p.basin });
  }
  return [...groups.values()].sort((a, b) => (a.basin === 'AL' ? 0 : 1) - (b.basin === 'AL' ? 0 : 1) || a.distance - b.distance);
}

export function forecastFrames(features, key) {
  return selectStorm(features, key).features.map(feature => ({ feature, time: forecastTime(feature.properties), kind: 'forecast' }))
    .filter(frame => frame.time !== null).sort((a, b) => a.time - b.time);
}

async function request(url, text = false) {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 18000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = text ? await response.text() : await response.json();
    if (data?.error) throw new Error(data.error.message || 'Service error');
    return data;
  } finally { clearTimeout(timer); }
}

async function start() {
  const $ = id => document.getElementById(id);
  if (!$('earth-map')) return;
  const state = { map: null, layer: 'satellite', mode: 'observed', globe: false, frames: [], satellite: [], radar: [], radarHost: '', index: 0, timer: null, busy: false, lastRefresh: 0, nhc: {}, key: '', cache: [], desiredImage: null, shownImage: null, loadingImage: false, health: {} };
  const clock = time => new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(time));
  const age = time => `${Math.max(0, Math.round((Date.now() - time) / 60000))} min old`;
  const setStatus = () => { $('earth-source-status').textContent = Object.values(state.health).join(' · '); };
  const stop = () => {
    clearInterval(state.timer); state.timer = null;
    $('earth-play').textContent = 'Play'; $('earth-play').setAttribute('aria-label', 'Play Earth animation');
    $('earth-play').setAttribute('aria-pressed', 'false');
  };
  function sourceData(id, data) { state.map.getSource(id).setData(data); }
  function clearImagery() {
    state.desiredImage = state.shownImage = null; state.loadingImage = false;
    for (const id of state.cache) { if (state.map.getLayer(id)) state.map.removeLayer(id); if (state.map.getSource(id)) state.map.removeSource(id); }
    state.cache = [];
  }
  function applyStorm() {
    for (const id of ['cone', 'past', 'track', 'points']) sourceData(`earth-${id}`, selectStorm(state.nhc[id]?.features || [], state.key));
    const points = selectStorm(state.nhc.points?.features || [], state.key).features;
    const current = points.find(f => +f.properties.tau === 0);
    sourceData('earth-current', { type: 'FeatureCollection', features: current ? [current] : [] });
    if (current) {
      const p = current.properties;
      $('earth-storm-status').textContent = `${p.stormname} · ${Math.round(Number(p.maxwind) * 1.15078)} mph sustained · Advisory ${p.advisnum} issued ${p.advdate}`;
    } else $('earth-storm-status').textContent = state.key ? 'Current storm position unavailable in this advisory.' : 'No active storm returned by NHC.';
  }
  function chooseFrames() {
    stop(); clearImagery();
    state.frames = state.mode === 'forecast' ? forecastFrames(state.nhc.points?.features || [], state.key) : state[state.layer];
    state.index = state.mode === 'forecast' ? 0 : Math.max(0, state.frames.length - 1);
    $('earth-timeline').max = String(Math.max(0, state.frames.length - 1));
    $('earth-timeline').disabled = state.frames.length < 2;
    $('earth-play').disabled = state.frames.length < 2;
    $('earth-latest').disabled = !state.frames.length;
    $('earth-layer').disabled = state.mode === 'forecast';
    $('earth-observed').setAttribute('aria-pressed', String(state.mode === 'observed'));
    $('earth-forecast').setAttribute('aria-pressed', String(state.mode === 'forecast'));
    $('earth-context').textContent = state.mode === 'forecast'
      ? 'Playback steps through published NHC forecast positions. These are predictions; future satellite images do not exist.'
      : 'Playback shows recent observed imagery. The track and cone show the latest NHC advisory and stay fixed during playback.';
    sourceData('earth-selected', empty());
    renderFrame();
  }
  function imagery(frame) {
    const id = `earth-image-${frame.kind}-${frame.time}`;
    if (state.map.getSource(id)) return id;
    const tiles = frame.kind === 'satellite'
      ? [`${GIBS}/${SATELLITE}/default/${new Date(frame.time).toISOString().replace('.000Z', 'Z')}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`]
      : [`${state.radarHost}${frame.path}/512/{z}/{x}/{y}/2/1_1.png`];
    state.map.addSource(id, { type: 'raster', tiles, tileSize: frame.kind === 'satellite' ? 256 : 512, maxzoom: frame.kind === 'satellite' ? 6 : 7, attribution: frame.kind === 'satellite' ? 'NASA GIBS / NOAA GOES-East' : '<a href="https://www.rainviewer.com/">RainViewer</a>' });
    state.map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } }, 'earth-cone-fill');
    state.cache.push(id);
    return id;
  }
  function renderFrame() {
    const frame = state.frames[state.index];
    $('earth-timeline').value = String(state.index);
    if (!frame) { $('earth-frame').textContent = state.mode === 'forecast' ? 'Forecast positions unavailable. Try Refresh layers.' : 'Imagery unavailable. Choose another weather layer or try Refresh layers.'; return; }
    if (state.mode === 'forecast') {
      sourceData('earth-selected', { type: 'FeatureCollection', features: [frame.feature] });
      const p = frame.feature.properties;
      $('earth-frame').textContent = `${+p.tau === 0 ? 'Advisory position' : `Forecast +${p.tau} h`} · ${clock(frame.time)} · ${Math.round(Number(p.maxwind) * 1.15078)} mph`;
    } else {
      const active = imagery(frame);
      state.desiredImage = active; state.loadingImage = !state.map.isSourceLoaded(active);
      // Keep the previous scan visible until the selected tiles arrive.
      state.map.setPaintProperty(active, 'raster-opacity', .001);
      revealImagery();
      // Bound memory on phones; only the active and a few recent frames survive.
      while (state.cache.length > 4) {
        const old = state.cache.find(id => id !== active && id !== state.shownImage);
        state.map.removeLayer(old); state.map.removeSource(old); state.cache.splice(state.cache.indexOf(old), 1);
      }
      if (state.loadingImage) $('earth-frame').textContent = `Loading ${frame.kind} scan for ${clock(frame.time)}…`;
    }
    $('earth-timeline').setAttribute('aria-valuetext', $('earth-frame').textContent);
  }
  function revealImagery() {
    if (state.mode !== 'observed' || !state.desiredImage || !state.map.isSourceLoaded(state.desiredImage)) return;
    const frame = state.frames[state.index]; if (!frame) return;
    for (const id of state.cache) state.map.setPaintProperty(id, 'raster-opacity', id === state.desiredImage ? (frame.kind === 'radar' ? .78 : 1) : 0);
    state.shownImage = state.desiredImage; state.loadingImage = false;
    $('earth-frame').textContent = `Observed ${frame.kind === 'satellite' ? 'GOES-East satellite' : 'radar'} · ${clock(frame.time)} · ${age(frame.time)}`;
    $('earth-timeline').setAttribute('aria-valuetext', $('earth-frame').textContent);
  }
  async function loadSatellite() {
    try {
      const start = new Date(Date.now() - 4 * 3600000).toISOString().replace('.000Z', 'Z');
      const xml = await request(`${GIBS}/1.0.0/${SATELLITE}/default/GoogleMapsCompatible_Level7/all/${start}.xml`, true);
      const doc = new DOMParser().parseFromString(xml, 'application/xml');
      const frames = domainFrames([...doc.getElementsByTagName('Domain')].map(el => el.textContent));
      if (!frames.length) throw new Error('No recent satellite scans');
      state.satellite = frames; state.health.satellite = `Satellite: latest ${clock(frames.at(-1).time)} (${age(frames.at(-1).time)})`;
    } catch (_) { state.satellite = []; state.health.satellite = 'Satellite unavailable'; }
  }
  async function loadRadar() {
    try {
      const data = await request('https://api.rainviewer.com/public/weather-maps.json');
      const host = new URL(data.host);
      if (host.protocol !== 'https:' || !/(^|\.)rainviewer\.com$/.test(host.hostname)) throw new Error('Invalid radar host');
      state.radarHost = host.origin;
      state.radar = (data.radar?.past || []).filter(f => Number.isFinite(f.time) && /^\/v2\/radar\/[\w-]+$/.test(f.path)).map(f => ({ ...f, time: f.time * 1000, kind: 'radar' })).sort((a,b) => a.time - b.time);
      if (!state.radar.length) throw new Error('No radar scans');
      state.health.radar = `Radar: latest ${clock(state.radar.at(-1).time)} (${age(state.radar.at(-1).time)})`;
    } catch (_) { state.radar = []; state.health.radar = 'Radar unavailable'; }
  }
  async function loadNHC() {
    const layers = { points: 5, track: 6, cone: 7, past: 11 };
    const results = await Promise.allSettled(Object.entries(layers).map(async ([name, id]) => {
      const data = await request(`${NHC}/${id}/query?where=1%3D1&outFields=*&outSR=4326&f=geojson`);
      if (!Array.isArray(data.features) || data.exceededTransferLimit) throw new Error('Incomplete NHC response');
      return [name, data];
    }));
    state.nhc = {}; const failed = [];
    results.forEach((result, i) => { if (result.status === 'fulfilled') state.nhc[result.value[0]] = result.value[1]; else failed.push(Object.keys(layers)[i]); });
    const options = stormOptions(state.nhc.points?.features || []);
    const select = $('earth-storm'); select.replaceChildren();
    for (const item of options) { const option = document.createElement('option'); option.value = item.key; option.textContent = item.name; select.append(option); }
    if (!options.length) { const option = document.createElement('option'); option.textContent = failed.includes('points') ? 'Storm data unavailable' : 'No active storms'; option.value = ''; select.append(option); }
    state.key = options.some(o => o.key === state.key) ? state.key : options[0]?.key || '';
    select.value = state.key; select.disabled = !options.length;
    state.health.nhc = failed.length ? `NHC: unavailable ${failed.join(', ')}` : options.length ? 'NHC: latest advisory loaded' : 'NHC: no active storms';
    applyStorm();
  }
  async function refresh() {
    if (state.busy) return;
    stop(); state.busy = true; $('earth-refresh').disabled = true;
    $('earth-source-status').textContent = 'Refreshing satellite, radar and NHC advisory…';
    try {
      await Promise.allSettled([loadSatellite(), loadRadar(), loadNHC()]);
      state.lastRefresh = Date.now(); setStatus(); chooseFrames();
    } finally { state.busy = false; $('earth-refresh').disabled = false; }
  }
  function view(globe) {
    state.globe = globe; state.map.setProjection({ type: globe ? 'globe' : 'mercator' });
    state.map.flyTo({ center: HOME, zoom: globe ? 1.8 : 4.4, pitch: 0, bearing: 0, essential: false });
    $('earth-globe').setAttribute('aria-pressed', String(globe)); $('earth-flat').setAttribute('aria-pressed', String(!globe));
  }
  try {
    if (!window.maplibregl) throw new Error('Map library unavailable');
    const map = state.map = new window.maplibregl.Map({ container: 'earth-map', center: HOME, zoom: 4.4, maxZoom: 9, renderWorldCopies: false,
      style: { version: 8, sources: { earth: { type: 'raster', tiles: [`${GIBS}/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg`], tileSize: 256, maxzoom: 8, attribution: 'NASA Blue Marble (static surface imagery)' } }, layers: [{ id: 'earth-surface', type: 'raster', source: 'earth' }] } });
    map.addControl(new window.maplibregl.NavigationControl(), 'top-right');
    new window.maplibregl.Marker({ element: Object.assign(document.createElement('div'), { className: 'earth-home' }) }).setLngLat(HOME).setPopup(new window.maplibregl.Popup().setText('Orange Beach, Alabama')).addTo(map);
    await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Map load timed out')), 20000); map.once('load', () => { clearTimeout(timer); resolve(); }); });
    for (const id of ['cone','past','track','points','selected','current']) map.addSource(`earth-${id}`, { type: 'geojson', data: empty() });
    map.addLayer({ id: 'earth-cone-fill', type: 'fill', source: 'earth-cone', paint: { 'fill-color': '#ffc247', 'fill-opacity': .18 } });
    map.addLayer({ id: 'earth-cone-outline', type: 'line', source: 'earth-cone', paint: { 'line-color': '#ffc247', 'line-width': 1.5 } });
    map.addLayer({ id: 'earth-past-line', type: 'line', source: 'earth-past', paint: { 'line-color': '#46d6ea', 'line-width': 3 } });
    map.addLayer({ id: 'earth-track-line', type: 'line', source: 'earth-track', paint: { 'line-color': '#ffc247', 'line-width': 3, 'line-dasharray': [2,2] } });
    map.addLayer({ id: 'earth-points-dot', type: 'circle', source: 'earth-points', paint: { 'circle-color': '#ffc247', 'circle-radius': 4, 'circle-stroke-color': '#081526', 'circle-stroke-width': 1 } });
    map.addLayer({ id: 'earth-current-dot', type: 'circle', source: 'earth-current', paint: { 'circle-color': '#fff', 'circle-radius': 7, 'circle-stroke-color': '#081526', 'circle-stroke-width': 2 } });
    map.addLayer({ id: 'earth-selected-dot', type: 'circle', source: 'earth-selected', paint: { 'circle-color': '#ffc247', 'circle-radius': 10, 'circle-stroke-color': '#fff', 'circle-stroke-width': 3 } });
    map.on('click', 'earth-points-dot', event => {
      const f = event.features?.[0]; if (!f) return;
      const time = forecastTime(f.properties);
      new window.maplibregl.Popup().setLngLat(f.geometry.coordinates).setText(`${f.properties.stormname} · ${time ? clock(time) : f.properties.datelbl} · ${Math.round(+f.properties.maxwind * 1.15078)} mph · ${+f.properties.tau === 0 ? 'Advisory position' : 'Forecast'}`).addTo(map);
    });
    map.on('error', event => {
      if (event.sourceId?.startsWith('earth-image-')) {
        state.health.tiles = 'Some weather tiles failed to load; try another layer or Refresh layers.'; setStatus();
        if (event.sourceId === state.desiredImage) { stop(); state.loadingImage = false; $('earth-frame').textContent = 'Selected weather scan could not load. Choose another time or layer.'; }
      }
    });
    map.on('sourcedata', event => { if (event.sourceId === state.desiredImage && event.isSourceLoaded && state.loadingImage) revealImagery(); });
    $('earth-flat').onclick = () => view(false); $('earth-globe').onclick = () => view(true);
    $('earth-home').onclick = () => map.flyTo({ center: HOME, zoom: state.globe ? 1.8 : 4.4, pitch: 0, bearing: 0 });
    $('earth-fit').onclick = () => {
      const features = state.nhc.points?.features || [], coords = selectStorm(features, state.key).features.map(f => f.geometry.coordinates);
      if (!coords.length) return;
      const bounds = new window.maplibregl.LngLatBounds(HOME, HOME); coords.forEach(c => bounds.extend(c)); map.fitBounds(bounds, { padding: 60, maxZoom: 5 });
    };
    $('earth-observed').onclick = () => { state.mode = 'observed'; chooseFrames(); };
    $('earth-forecast').onclick = () => { state.mode = 'forecast'; chooseFrames(); };
    $('earth-layer').onchange = event => { state.layer = event.target.value; chooseFrames(); };
    $('earth-storm').onchange = event => { state.key = event.target.value; applyStorm(); chooseFrames(); };
    $('earth-timeline').oninput = event => { stop(); state.index = +event.target.value; renderFrame(); };
    $('earth-latest').onclick = () => { stop(); state.index = state.mode === 'forecast' ? 0 : Math.max(0, state.frames.length - 1); renderFrame(); };
    $('earth-play').onclick = () => {
      if (state.timer) return stop();
      if (state.frames.length < 2) return;
      if (state.index === state.frames.length - 1) state.index = 0;
      renderFrame(); $('earth-play').textContent = 'Pause'; $('earth-play').setAttribute('aria-label', 'Pause Earth animation'); $('earth-play').setAttribute('aria-pressed', 'true');
      state.timer = setInterval(() => { if (!state.loadingImage) { state.index = (state.index + 1) % state.frames.length; renderFrame(); } }, 1400);
    };
    $('earth-refresh').onclick = () => { delete state.health.tiles; refresh(); };
    function resizeFull() { map.resize(); $('earth-fullscreen').textContent = document.fullscreenElement || $('earth-panel').classList.contains('earth-expanded') ? 'Exit fullscreen' : 'Fullscreen'; }
    $('earth-fullscreen').onclick = async () => {
      const panel = $('earth-panel');
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (panel.classList.contains('earth-expanded')) panel.classList.remove('earth-expanded');
      else { try { if (!panel.requestFullscreen) throw new Error('Unsupported'); await panel.requestFullscreen(); } catch (_) { panel.classList.add('earth-expanded'); } }
      resizeFull();
    };
    document.addEventListener('fullscreenchange', resizeFull);
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && $('earth-panel').classList.contains('earth-expanded')) { $('earth-panel').classList.remove('earth-expanded'); resizeFull(); } });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (Date.now() - state.lastRefresh > 300000) refresh(); });
    window.addEventListener('pagehide', stop);
    setInterval(() => { if (!document.hidden) refresh(); }, 300000);
    for (const button of $('earth-panel').querySelectorAll('button')) button.disabled = false;
    await refresh();
  } catch (error) {
    console.warn('Nowcast Earth initialization failed:', error);
    $('earth-source-status').textContent = 'The interactive Earth view could not load. Your local forecast still works; use the NOAA live map below.';
    for (const control of $('earth-panel').querySelectorAll('button,select,input')) control.disabled = true;
  }
}
if (typeof document !== 'undefined') start();
