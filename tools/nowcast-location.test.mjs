import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {formatPlaceName,searchPlaces} from './nowcast-location.mjs';

test('weather locations spell out states without changing coordinate labels',()=>{
  for(const [name,expected] of [['Orange Beach, AL','Orange Beach, Alabama'],['Ogden, UT','Ogden, Utah'],['Alpena, MI','Alpena, Michigan'],['Ogden, Utah, US','Ogden, Utah'],['30.270, -87.574','30.270, -87.574']])assert.equal(formatPlaceName(name),expected);
});
test('city and state search filters ambiguous cities and uses full names',async()=>{
  let queried;
  const results=await searchPlaces('Ogden, UT',async url=>{queried=new URL(url);return {results:[{name:'Ogden',admin1:'Utah',country_code:'US',latitude:41.223,longitude:-111.974},{name:'Ogden',admin1:'Iowa',country_code:'US',latitude:42,longitude:-94}]};});
  assert.equal(queried.searchParams.get('name'),'Ogden');
  assert.equal(results.length,1);
  assert.equal(results[0].name,'Ogden, Utah');
  assert.equal(results[0].lon,-111.974);
});
test('unqualified city search returns choices instead of silently using the first match',async()=>{
  const results=await searchPlaces('Alpena',async()=>({results:[{name:'Alpena',admin1:'Michigan',country_code:'US',latitude:45,longitude:-83},{name:'Alpena',admin1:'Arkansas',country_code:'US',latitude:36,longitude:-93}]}));
  assert.deepEqual(results.map(p=>p.name),['Alpena, Michigan','Alpena, Arkansas']);
});
test('coordinate search avoids geocoder and rejects invalid coordinates',async()=>{
  const fetch=()=>{throw Error('should not fetch');};
  assert.equal((await searchPlaces('41.223, -111.974',fetch))[0].lat,41.223);
  await assert.rejects(searchPlaces('91, -111',fetch));
});
function gpsHarness(){
  const html=readFileSync(new URL('./nowcast.html',import.meta.url),'utf8');
  const source=html.match(/function useGPS\([^]*?\n\}/)[0];
  const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
  const bar={open:false};
  const context={locationIntent:0,$:node,document:{querySelector:()=>bar},navigator:{geolocation:{getCurrentPosition(success,error){context.success=success;context.failure=error;}}},setLocation(place){context.selected=place;context.locationIntent++;}};
  vm.createContext(context);vm.runInContext(source,context);
  return {context,node,bar};
}
test('late GPS success cannot replace a manually chosen city',()=>{
  const {context}=gpsHarness();context.useGPS();
  context.setLocation({name:'Ogden, Utah',lat:41.223,lon:-111.974});
  context.success({coords:{latitude:30,longitude:-87,accuracy:10}});
  assert.equal(context.selected.name,'Ogden, Utah');
});
test('permission denial offers city search without inventing a location',()=>{
  const {context,node,bar}=gpsHarness();context.useGPS();context.failure({code:1});
  assert.equal(context.selected,undefined);
  assert.match(node('loc-meta').textContent,/declined.*Search/);
  assert.equal(bar.open,true);
});
