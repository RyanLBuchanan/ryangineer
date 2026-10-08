import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const html = readFileSync(new URL('./nowcast.html', import.meta.url), 'utf8');
const fn = name => html.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`, 'm'))[0];

test('local weather precedes warnings and tracker, and the jump targets the tracker', () => {
  assert.ok(html.indexOf('panel weather-hero') < html.indexOf('id="alerts"'));
  assert.ok(html.indexOf('id="radar-panel"') < html.indexOf('<section id="earth-panel"'));
  assert.match(html, /class="tracker-jump" href="#earth-panel"/);
});

test('public radar loads observed frames without requesting grayscale pixel sampling', async () => {
  const nodes = new Map();
  const node = id => { if (!nodes.has(id)) nodes.set(id, { setAttribute() {}, replaceChildren() {} }); return nodes.get(id); };
  const state = { radarTimer:null };
  const sandbox = { URL, Date, S:state, $:node, clearInterval() {}, renderRadar() {}, forecastRainFallback() {}, track:async (_key,_meta,job) => job(), fetchJSON:async () => ({ host:'https://tilecache.rainviewer.com', radar:{ past:[{time:200,path:'/v2/radar/latest'},{time:100,path:'/v2/radar/earlier'}],nowcast:[{time:300,path:'/v2/radar/future'}] } }) };
  vm.createContext(sandbox); vm.runInContext(fn('loadRadar'), sandbox); await sandbox.loadRadar();
  assert.deepEqual(Array.from(state.radar.frames, f=>f.time), [100,200]);
  assert.equal(state.radarFrame, 1);
  assert.equal(state.radar.frames.some(f=>f.future), false);
  assert.equal(html.includes('function sampleFrame'), false);
});

test('radar failure removes weather overlay and disables misleading playback', async () => {
  const nodes = new Map(); const node = id => { if (!nodes.has(id)) nodes.set(id, { setAttribute(){}, replaceChildren(){this.cleared=true;} }); return nodes.get(id); };
  const state = { radar:{frames:[{}]}, radarTimer:12 };
  const sandbox = { URL, Date, S:state, $:node, clearInterval(){}, renderRadar(){}, forecastRainFallback(){}, track:async (_key,_meta,job)=>job(), fetchJSON:async()=>{throw Error('offline');} };
  vm.createContext(sandbox);vm.runInContext(fn('loadRadar'),sandbox);
  await assert.rejects(sandbox.loadRadar(), /offline/);
  assert.equal(state.radar,null); assert.equal(node('radar-play').disabled,true); assert.equal(node('radar-map').cleared,true);
});

test('overzoom keeps requests within native zoom 7 and centers matching basemap/radar tiles', () => {
  const nodes = new Map(); const node = id => { if (!nodes.has(id)) nodes.set(id, {clientWidth:360,clientHeight:240,setAttribute(){},replaceChildren(fragment){this.children=fragment.children;} }); return nodes.get(id); };
  const document = { createDocumentFragment:()=>({children:[],append(img){this.children.push(img);}}), createElement:()=>({style:{}}) };
  const state={loc:{lat:30.2697,lon:-87.5736},radarFrame:0,radar:{host:'https://tilecache.rainviewer.com',frames:[{path:'/v2/radar/frame',time:200}]}};
  const sandbox={CFG:{radarZoom:7,radarMapZoom:9},S:state,$:node,document,Date,Math,clamp:(v,a,b)=>Math.min(b,Math.max(a,v)),clockText:()=> 'time',agoText:()=> 'age'};
  vm.createContext(sandbox);vm.runInContext(fn('tileFor')+'\n'+fn('renderRadarMap'),sandbox);sandbox.renderRadarMap();
  const weather=node('radar-map').children, base=node('radar-base').children;
  assert.ok(weather.length>0 && weather.length<=4);
  assert.ok(weather.every(img=>img.src.includes('/256/7/')));
  assert.ok(weather.every(img=>img.style.cssText.includes('width:1024px!important')));
  assert.ok(base.every(img=>img.src.includes('openstreetmap.org/9/')));
});
