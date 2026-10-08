// Canvas-free satellite fallback for browsers without WebGL (including some
// managed browsers). Implements the small mapping interface the viewer uses.
export function flatMap(container, center, zoom) {
  const L = window.L;
  if (!L) throw new Error('Fallback map library unavailable');
  container.replaceChildren(); container.classList.remove('maplibregl-map');
  const map = L.map(container, { center: [center[1], center[0]], zoom, maxZoom: 9 });
  const sources = new Map(), layers = new Map(), handlers = new Map();
  let ready = false;
  function emit(type, data) { for (const handler of handlers.get(type) || []) handler(data); }
  function redraw(record) {
    const { spec, source } = record;
    if (spec.type === 'raster') return;
    if (record.layer) map.removeLayer(record.layer);
    const p = spec.paint || {};
    record.layer = L.geoJSON(source.data, {
      style: () => ({ color: p['line-color'] || p['fill-color'] || '#ffc247', weight: p['line-width'] || 1, fill: spec.type === 'fill', fillColor: p['fill-color'], fillOpacity: p['fill-opacity'] || 0, opacity: 1, dashArray: p['line-dasharray'] ? '6 6' : null }),
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: p['circle-radius'] || 4, fillColor: p['circle-color'], color: p['circle-stroke-color'], weight: p['circle-stroke-width'] || 0, fillOpacity: 1 }),
      onEachFeature: (feature, layer) => layer.on('click', () => emit(`click:${spec.id}`, { features: [feature] })),
    }).addTo(map);
  }
  const adapter = {
    flat: true, leaflet: map,
    addSource(id, spec) { sources.set(id, { ...spec, loaded: false, setData(data) { this.data = data; for (const record of layers.values()) if (record.spec.source === id) redraw(record); } }); },
    getSource(id) { return sources.get(id); },
    removeSource(id) { sources.delete(id); },
    addLayer(spec) {
      const source = sources.get(spec.source), record = { spec, source, layer: null };
      if (spec.type === 'raster') {
        record.layer = L.tileLayer(source.tiles[0], { tileSize: source.tileSize, maxNativeZoom: source.maxzoom, maxZoom: 9, opacity: spec.paint?.['raster-opacity'] ?? 1, attribution: source.attribution, zIndex: spec.id === 'earth-surface' ? 0 : 1 });
        record.layer.on('loading', () => { source.loaded = false; });
        record.layer.on('load', () => { source.loaded = true; emit('sourcedata', { sourceId: spec.source, isSourceLoaded: true }); });
        record.layer.on('tileerror', () => emit('error', { sourceId: spec.source }));
        record.layer.addTo(map);
      } else redraw(record);
      layers.set(spec.id, record);
    },
    getLayer(id) { return layers.get(id); },
    removeLayer(id) { const record = layers.get(id); if (record) map.removeLayer(record.layer); layers.delete(id); },
    setPaintProperty(id, property, value) { const record = layers.get(id); if (record && property === 'raster-opacity') record.layer.setOpacity(value); },
    isSourceLoaded(id) { return !!sources.get(id)?.loaded; },
    on(type, layerOrHandler, handler) { const key = handler ? `${type}:${layerOrHandler}` : type; if (!handlers.has(key)) handlers.set(key, []); handlers.get(key).push(handler || layerOrHandler); },
    once(type, handler) { if (type === 'load' && ready) setTimeout(handler, 0); else adapter.on(type, handler); },
    flyTo(options) { map.setView([options.center[1], options.center[0]], options.zoom ?? map.getZoom(), { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches }); },
    fitBounds(bounds, options) { map.fitBounds([[bounds.getSouth(), bounds.getWest()], [bounds.getNorth(), bounds.getEast()]], { padding: [options.padding, options.padding], maxZoom: options.maxZoom }); },
    resize() { map.invalidateSize(); },
    setProjection() {},
  };
  adapter.addSource('earth', { type: 'raster', tiles: ['https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief_Bathymetry/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg'], tileSize: 256, maxzoom: 8, attribution: 'NASA Blue Marble (static surface imagery)' });
  adapter.addLayer({ id: 'earth-surface', type: 'raster', source: 'earth' });
  ready = true;
  return adapter;
}
