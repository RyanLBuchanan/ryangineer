export function validPlace(place) {
  return place && Number.isFinite(place.lat) && Number.isFinite(place.lon) && Math.abs(place.lat) <= 85 && Math.abs(place.lon) <= 180;
}
export function sharedPlace(url) {
  const params = new URL(url).searchParams;
  if (!params.has('lat') || !params.has('lon') || !params.get('lat').trim() || !params.get('lon').trim()) return null;
  const place = { lat: Number(params.get('lat')), lon: Number(params.get('lon')), name: (params.get('place') || 'Shared location').slice(0, 100), source: 'shared link' };
  return validPlace(place) ? place : null;
}
export function shareLink(url, place) {
  if (!validPlace(place)) throw Error('Select a location first');
  const link = new URL(url); link.search = ''; link.hash = '';
  link.searchParams.set('lat', place.lat.toFixed(3)); link.searchParams.set('lon', place.lon.toFixed(3));
  link.searchParams.set('place', String(place.name || 'Shared location').slice(0,100));
  return link.href;
}
export function cleanSaved(value) {
  return Array.isArray(value) ? value.filter(p => validPlace(p) && typeof p.label === 'string' && typeof p.id === 'string').slice(0,12).map(p => ({ id:p.id.slice(0,80), label:p.label.slice(0,40), lat:p.lat, lon:p.lon, name:String(p.name || 'Saved location').slice(0,100) })) : [];
}
export function upcomingPeriods(periods, now = Date.now()) {
  return (periods || []).filter(p => Number.isFinite(Date.parse(p.startTime)) && Date.parse(p.endTime) > now && Date.parse(p.startTime) < now + 24*3600000).slice(0,3);
}
export function peakGust(grid, now = Date.now()) {
  const gust = grid?.properties?.windGust;
  const values = (gust?.values || []).filter(v => {
    const [start, duration] = String(v.validTime).split('/');
    const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(duration || '');
    if (!m || !Number.isFinite(v.value)) return false;
    const ms = ((+m[1] || 0)*24+(+m[2] || 0))*3600000+(+m[3] || 0)*60000;
    return Date.parse(start) < now+24*3600000 && Date.parse(start)+ms > now;
  }).map(v => v.value);
  if (!values.length) return null;
  const max = Math.max(...values), unit = gust.uom;
  return unit === 'wmoUnit:km_h-1' ? max/1.609344 : unit === 'wmoUnit:m_s-1' ? max*2.236936 : unit === 'wmoUnit:kn' ? max*1.150779 : null;
}

function start() {
  const $ = id => document.getElementById(id), key = 'nowcast.savedPlaces';
  let current = null, saved = [], generation = 0, lastFetch = 0, locationKey = '', controller;
  try { saved = cleanSaved(JSON.parse(localStorage.getItem(key) || '[]')); } catch (_) {}
  const say = text => { $('family-status').textContent = text; };
  function options() {
    const select = $('family-places'); select.replaceChildren();
    const first = document.createElement('option'); first.value = ''; first.textContent = saved.length ? 'Choose a saved place' : 'No saved places yet'; select.append(first);
    saved.forEach(p => { const option = document.createElement('option'); option.value = p.id; option.textContent = p.label; select.append(option); });
    $('family-remove').disabled = true;
    document.dispatchEvent(new Event('nowcast-saved-places'));
  }
  function persist() {
    try { localStorage.setItem(key, JSON.stringify(saved)); return true; }
    catch (_) { say('This browser could not save places. You can still switch locations and share links.'); return false; }
  }
  function line(parent, text, tag = 'p') { const item = document.createElement(tag); item.textContent = text; parent.append(item); return item; }
  async function official(url, signal) {
    const address = new URL(url);
    if (address.protocol !== 'https:' || address.hostname !== 'api.weather.gov') throw Error('Invalid weather source');
    const response = await fetch(url, { signal, headers:{ Accept:'application/geo+json' } });
    if (!response.ok) throw Error('Forecast unavailable'); return response.json();
  }
  async function summary(snapshot) {
    controller?.abort(); controller = new AbortController();
    const requestController = controller, version = ++generation, signal = controller.signal;
    $('family-forecast').replaceChildren(); $('family-forecast-source').textContent = 'Reading the official local forecast…';
    const timer = setTimeout(() => requestController.abort(), 18000);
    try {
      if (!snapshot.point?.forecastUrl) throw Error('No official forecast');
      const results = await Promise.allSettled([official(snapshot.point.forecastUrl, signal), snapshot.point.gridUrl ? official(snapshot.point.gridUrl,signal) : Promise.resolve(null)]);
      if (version !== generation) return;
      if (results[0].status !== 'fulfilled') throw Error('Official forecast unavailable');
      const data = results[0].value, periods = upcomingPeriods(data.properties?.periods);
      if (!periods.length) throw Error('No upcoming forecast periods');
      const gust = results[1].status === 'fulfilled' ? peakGust(results[1].value) : null;
      if (gust !== null) line($('family-forecast'), `Peak forecast gust in the next 24 hours: ${Math.round(gust)} mph.`, 'strong');
      for (const period of periods) {
        const article = document.createElement('div'); article.className = 'family-period';
        line(article, `${period.name} · ${period.windSpeed || 'Wind unavailable'}${period.windDirection ? ' '+period.windDirection : ''}`, 'h3');
        line(article, period.shortForecast || 'Forecast description unavailable.');
        if (period.detailedForecast) { const details = document.createElement('details'); line(details, 'Forecast details', 'summary'); line(details, period.detailedForecast); article.append(details); }
        $('family-forecast').append(article);
      }
      const updated = Date.parse(data.properties?.updateTime || data.properties?.generatedAt);
      const clock = time => new Intl.DateTimeFormat('en-US', { timeZone:snapshot.point.timeZone || 'America/Chicago', month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short' }).format(new Date(time));
      $('family-forecast-source').textContent = `National Weather Service · ${Number.isFinite(updated) ? 'issued '+clock(updated) : 'retrieved '+clock(Date.now())}`;
    } catch (_) {
      if (version !== generation) return;
      line($('family-forecast'), 'The official local forecast is unavailable. Check the hourly forecast below and the National Weather Service.');
      $('family-forecast-source').textContent = 'Official forecast unavailable; no conditions inferred.';
    } finally { clearTimeout(timer); }
  }
  document.addEventListener('nowcast-state', event => {
    const snapshot = event.detail; current = snapshot.loc;
    $('family-title').textContent = `What matters in ${current.name || 'this location'}`;
    $('family-save-toggle').disabled = $('family-share').disabled = !validPlace(current);
    const alerts = (snapshot.alerts || []).filter(a => !a.expires || Date.parse(a.expires) > Date.now());
    $('family-alerts').replaceChildren();
    if (snapshot.alertState === 'ok') {
      const relevant = alerts.filter(a => /warning|watch/i.test(a.event || ''));
      line($('family-alerts'), relevant.length ? [...new Set(relevant.map(a => a.event))].join(' · ') : 'No active watches or warnings returned for this location.');
      if (relevant.length) { const a = document.createElement('a'); a.href = '#alerts'; a.textContent = 'Read official alert details ↓'; a.onclick = () => document.dispatchEvent(new CustomEvent('nowcast-open-alerts')); $('family-alerts').append(a); }
      $('family-alerts').dataset.alert = String(relevant.length > 0);
    } else { line($('family-alerts'), snapshot.alertState === 'error' ? 'Alert service unavailable. Warning status could not be checked.' : 'Checking local watches and warnings…'); $('family-alerts').dataset.alert = 'false'; }
    const next = `${current.lat},${current.lon}`;
    if (next !== locationKey || (snapshot.point && (Date.now()-lastFetch > 300000 || lastFetch === 0))) {
      const changed = next !== locationKey; locationKey = next;
      if (changed) { lastFetch = 0; controller?.abort(); generation++; $('family-forecast').replaceChildren(); $('family-forecast-source').textContent = 'Reading the official local forecast…'; }
      if (snapshot.point || snapshot.pointState === 'error') { lastFetch = Date.now(); summary(snapshot); }
    }
  });
  $('family-save-toggle').onclick = () => { $('family-save-form').hidden = !$('family-save-form').hidden; if (!$('family-save-form').hidden) { $('family-label').value = current?.name || ''; $('family-label').focus(); } };
  $('family-save-cancel').onclick = () => { $('family-save-form').hidden = true; $('family-save-toggle').focus(); };
  $('family-save-form').onsubmit = event => {
    event.preventDefault(); if (!validPlace(current)) return;
    const label = $('family-label').value.trim(); if (!label) return;
    const id = `${current.lat.toFixed(3)},${current.lon.toFixed(3)}`;
    if (!saved.some(p => p.id === id) && saved.length >= 12) { say('You can save up to 12 places. Remove one to add another.'); return; }
    const updated = { id,label,lat:current.lat,lon:current.lon,name:current.name || 'Saved location' };
    const previous = saved; saved = [...saved.filter(p => p.id !== id), updated];
    if (!persist()) { saved = previous; return; }
    options(); $('family-save-form').hidden = true; say(`${label} saved on this device.`);
  };
  $('family-places').onchange = event => { const place = saved.find(p => p.id === event.target.value); $('family-remove').disabled = !place; if (place) { document.dispatchEvent(new CustomEvent('nowcast-family-location', { detail:{ lat:place.lat,lon:place.lon,name:place.name,source:'saved place' } })); say(`Opening ${place.label}…`); } };
  $('family-remove').onclick = () => { const id = $('family-places').value, place = saved.find(p => p.id === id); if (!place) return; const previous = saved; saved = saved.filter(p => p.id !== id); if (!persist()) { saved = previous; return; } options(); say(`${place.label} removed from saved places.`); };
  $('family-share').onclick = async () => {
    if (!validPlace(current)) return; const url = shareLink(location.href, current);
    const payload = { title:`Nowcast — ${current.name || 'Local weather'}`,text:`Weather and storm information for ${current.name || 'this location'}`,url };
    try {
      if (navigator.share) { await navigator.share(payload); say('Share menu opened.'); }
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(url); say('Location link copied. Paste it into a text or email.'); }
      else { $('family-share-link').hidden = false; $('family-share-link').value = url; $('family-share-link').select(); say('Copy the location link below.'); }
    } catch (error) { if (error.name !== 'AbortError') { $('family-share-link').hidden = false; $('family-share-link').value = url; $('family-share-link').select(); say('Copy the location link below.'); } }
  };
  window.addEventListener('storage', event => { if (event.key === key) { try { saved = cleanSaved(JSON.parse(event.newValue || '[]')); options(); } catch (_) {} } });
  options(); document.dispatchEvent(new CustomEvent('nowcast-family-ready'));
}
if (typeof document !== 'undefined') start();
