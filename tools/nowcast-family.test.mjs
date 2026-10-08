import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { sharedPlace, shareLink, cleanSaved, upcomingPeriods, peakGust } from './nowcast-family.mjs';

test('shared links validate both coordinates and round-trip a selected place', () => {
  const place = {lat:30.2697,lon:-87.5736,name:'Orange Beach, AL',label:'Private nickname'};
  const link = shareLink('https://example.com/tools/nowcast.html?private=secret#earth-panel',place);
  assert.equal(new URL(link).hash,'');
  assert.equal(new URL(link).searchParams.has('private'),false);
  assert.equal(link.includes('Private'),false);
  assert.deepEqual(sharedPlace(link),{lat:30.270,lon:-87.574,name:place.name,source:'shared link'});
  for(const query of ['lat=&lon=1','lat=1','lat=NaN&lon=2','lat=30&lon=181']) assert.equal(sharedPlace('https://example.com/?'+query),null);
});
test('saved places reject corrupt records and cap the device list', () => {
  assert.deepEqual(cleanSaved({}),[]);
  const place={id:'1',lat:30,lon:-87,label:'Home',name:'Orange Beach'};
  assert.equal(cleanSaved([null,{...place,lon:999},place]).length,1);
  assert.equal(cleanSaved(Array(15).fill(place)).length,12);
});
test('official outlook excludes expired periods and periods beyond the next day', () => {
  const now=Date.parse('2026-10-08T12:00Z');
  const period=(start,end)=>({startTime:start,endTime:end});
  const current=period('2026-10-08T06:00Z','2026-10-08T18:00Z');
  assert.deepEqual(upcomingPeriods([period('2026-10-07T06:00Z','2026-10-07T18:00Z'),current,period('2026-10-09T18:00Z','2026-10-10T06:00Z')],now),[current]);
});
test('peak gust uses overlapping forecast hours and known units; missing data stays unknown', () => {
  const now=Date.parse('2026-10-08T12:00Z');
  const grid={properties:{windGust:{uom:'wmoUnit:km_h-1',values:[{validTime:'2026-10-08T06:00Z/PT12H',value:32.18688},{validTime:'2026-10-10T06:00Z/PT12H',value:160}]}}};
  assert.equal(Math.round(peakGust(grid,now)),20);
  assert.equal(peakGust(null,now),null);
  grid.properties.windGust.uom='unknown';assert.equal(peakGust(grid,now),null);
});
test('location switches queue during refresh and clear old weather before loading a new place', () => {
  const html=readFileSync(new URL('./nowcast.html',import.meta.url),'utf8');
  const source=html.match(/function setLocation\([^]*?\n\}/)[0];
  const nodes=new Map(), node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'old',replaceChildren(){this.cleared=true;}});return nodes.get(id);};
  const old={lat:30,lon:-87}, next={lat:40,lon:-111};
  const S={loc:old,busy:true,obs:{temp:25},sources:{old:{state:'ok'}}};
  const sandbox={S,$:node,localStorage:{setItem(){}},clearInterval(){},renderLocation(){},refreshAll(){sandbox.refreshed=true;}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);sandbox.setLocation(next);
  assert.equal(S.loc,old);assert.equal(S.pendingLoc,next);assert.equal(sandbox.refreshed,undefined);
  S.busy=false;sandbox.setLocation(next);
  assert.equal(S.loc,next);assert.equal(S.obs,null);assert.equal(node('hero-temp').textContent,'—');
  assert.equal(node('alerts').cleared,true);assert.equal(node('radar-map').cleared,true);assert.equal(sandbox.refreshed,true);
});
