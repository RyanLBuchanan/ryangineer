export const PRESENTER_ORIGIN = 'https://www.ryangineer.com';
export function presenterUrl(loc,origin=PRESENTER_ORIGIN) {
  const url=new URL('/tools/nowcast/presenter.html',origin);
  if(loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
    url.searchParams.set('lat',loc.lat.toFixed(4));url.searchParams.set('lon',loc.lon.toFixed(4));url.searchParams.set('place',String(loc.name || 'Selected location').slice(0,100));
  }
  return url.href;
}
if(typeof document!=='undefined') {
  const frame=document.getElementById('presenter-frame'),toggle=document.getElementById('presenter-toggle');
  let place=null,ready=false,origin=location.origin;
  const send=(type)=>{if(frame.contentWindow)frame.contentWindow.postMessage({type,loc:place},origin);};
  const stop=()=>send('nowcast-presenter-stop');
  const focusForecast=()=>{stop();document.getElementById('current-heading').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});document.getElementById('current-heading').focus({preventScroll:true});};
  document.addEventListener('nowcast-state',event=>{
    const loc=event.detail?.loc;if(!loc)return;place={lat:loc.lat,lon:loc.lon,name:loc.name};
    const alerts=event.detail.alerts || [],badge=document.getElementById('presenter-alert');
    badge.hidden=!alerts.length;badge.textContent=alerts.length ? `${alerts.length} official alert${alerts.length===1 ? '' : 's'} · ${[...new Set(alerts.map(a=>a.event))].slice(0,2).join(' · ')} · View details` : '';
    if(!frame.getAttribute('src'))frame.src=presenterUrl(place,origin);
    else if(ready)send('nowcast-presenter-location');
  });
  frame.addEventListener('load',()=>{ready=true;if(place)send('nowcast-presenter-location');});
  window.addEventListener('message',event=>{if(event.source!==frame.contentWindow || event.origin!==origin)return;if(event.data?.type==='nowcast-presenter-height' && Number.isFinite(event.data.height)){frame.style.height=Math.max(500,Math.min(1800,event.data.height))+'px';}if(event.data?.type==='nowcast-presenter-ready'){ready=true;if(place)send('nowcast-presenter-location');}if(event.data?.type==='nowcast-presenter-forecast')focusForecast();});
  document.getElementById('presenter-alert').addEventListener('click',()=>{stop();document.dispatchEvent(new Event('nowcast-open-alerts'));});
  document.getElementById('presenter-skip').addEventListener('click',event=>{event.preventDefault();focusForecast();});
  toggle.addEventListener('click',()=>{const hide=!frame.hidden;if(hide)stop();frame.hidden=hide;toggle.textContent=hide?'Show presenter':'Hide presenter';toggle.setAttribute('aria-expanded',String(!hide));});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.dispatchEvent(new Event('nowcast-family-ready'));
}
