import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {presenterUrl} from './nowcast-presenter.mjs';
test('presenter link contains the selected place and rounded coordinates',()=>{const url=new URL(presenterUrl({lat:30.2944,lon:-87.5736,name:'Orange Beach, AL'}));assert.equal(url.origin,'https://www.ryangineer.com');assert.equal(url.pathname,'/tools/nowcast/presenter.html');assert.equal(url.searchParams.get('place'),'Orange Beach, AL');assert.equal(url.searchParams.get('lon'),'-87.5736');});
test('presenter opens above weather with an accessible bypass and keeps existing tools',()=>{const html=readFileSync(new URL('./nowcast.html',import.meta.url),'utf8');assert.ok(html.indexOf('id="presenter-panel"')<html.indexOf('class="panel weather-hero"'));assert.match(html,/id="presenter-skip" href="#current-heading"/);assert.match(html,/id="current-heading" tabindex="-1"/);for(const id of ['earth-panel','alerts','radar-panel','family-summary'])assert.match(html,new RegExp(`id="${id}"`));assert.doesNotMatch(html,/embed\.liveavatar\.com\/v1\/f46a2ff7/);});

test('surface, assets, function and configuration have no Ridian runtime dependency',()=>{const module=readFileSync(new URL('./nowcast-presenter.mjs',import.meta.url),'utf8');assert.doesNotMatch(module,/ridiantechnologies|presenterPreview/);assert.equal(new URL(presenterUrl({lat:1,lon:2},'https://deploy-preview-19--reverent-mahavira-a88a48.netlify.app')).origin,'https://deploy-preview-19--reverent-mahavira-a88a48.netlify.app');for(const path of ['nowcast/presenter.html','nowcast/presenter.mjs','nowcast/presenter.css','../netlify/functions/nowcast-presenter.mjs','../netlify/functions/_lib/nowcast-liveavatar.mjs','../netlify/functions/_lib/nowcast-weather.mjs'])assert.doesNotMatch(readFileSync(new URL(path,import.meta.url),'utf8'),/ridiantechnologies\.com|RIDIAN_|ridian-provider|momentum-coach/);});

test('avatar controls offer cancellation while connecting and microphone/end controls when active',()=>{
 const source=readFileSync(new URL('./nowcast/presenter.mjs',import.meta.url),'utf8');
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,disabled:false,textContent:'',setAttribute(name,value){this[name]=value;}});return nodes.get(id);};
 const context={$ ,busy:false,paused:false,muted:false,controlBusy:false,document:{querySelector:()=>({classList:{toggle(){}}})}};
 vm.createContext(context);vm.runInContext(source.slice(source.indexOf('const icons='),source.indexOf('function transcript(')),context);
 context.ui(false);assert.equal($('start').hidden,false);assert.equal($('read').hidden,false);assert.equal($('end').hidden,true);
 context.busy=true;context.ui(false);assert.equal($('start').disabled,true);assert.equal($('end').hidden,false);assert.match($('end')['aria-label'],/Cancel/);
 context.busy=false;context.ui(true);assert.equal($('mute').hidden,false);assert.equal($('end').hidden,false);assert.equal($('start').hidden,true);assert.equal($('pause').hidden,false);
 context.paused=true;context.muted=true;context.ui(true);assert.equal($('pause')['aria-label'],'Resume live presenter');assert.equal($('mute')['aria-label'],'Unmute microphone');assert.equal($('mute').disabled,true);
});



test('pause silences playback and microphone, resumes prior mic state, and preserves state on failure',async()=>{
 const source=readFileSync(new URL('./nowcast/presenter.mjs',import.meta.url),'utf8'),handlers={},calls=[];
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{addEventListener(type,fn){handlers[id]=fn;},pause(){calls.push('pause');},async play(){calls.push('play');}});return nodes.get(id);};
 const current={voiceChat:{async mute(){calls.push('mute');},async unmute(){calls.push('unmute');}}};
 const ctx={$ ,session:current,epoch:1,controlBusy:false,paused:false,muted:false,restoreMic:false,ui(){},status(){}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf("$('mute').addEventListener"),source.indexOf("$('sound').addEventListener")),ctx);
 await handlers.pause();assert.deepEqual(calls,['mute','pause']);assert.equal(ctx.paused,true);assert.equal(ctx.muted,true);
 await handlers.pause();assert.deepEqual(calls,['mute','pause','play','unmute']);assert.equal(ctx.paused,false);assert.equal(ctx.muted,false);
 ctx.muted=true;calls.length=0;await handlers.pause();await handlers.pause();assert.deepEqual(calls,['mute','pause','play']);assert.equal(ctx.muted,true);
 current.voiceChat.mute=async()=>{throw Error('failed');};await handlers.pause();assert.equal(ctx.paused,false);assert.equal(ctx.controlBusy,false);
});


function startHarness({blocked=false,stalled=false}={}){
 const source=readFileSync(new URL('./nowcast/presenter.mjs',import.meta.url),'utf8'),events={},nodes=new Map(),timers=new Map(),messages=[],calls=[];
 const $=id=>{if(!nodes.has(id))nodes.set(id,{hidden:id==='avatar-video',play:async()=>{calls.push('play');if(blocked)throw Error('autoplay blocked');}});return nodes.get(id);};
 let release;
 class FakeSession{constructor(token,options){calls.push({token,options});this.voiceChat={stop(){}};}on(name,fn){events[name]=fn;}attach(){calls.push('attach');}async start(){events['session.stream_ready']();assert.equal($('avatar-video').hidden,false);assert.equal($('portrait').hidden,true);if(stalled)await new Promise(resolve=>{release=resolve;});}async stop(){calls.push('stop');}}
 const ctx={$ ,SDK:'test',loadedSDK:{LiveAvatarSession:FakeSession},session:null,busy:false,epoch:0,controller:null,connectionTimer:null,startingSession:null,expiry:null,queuedQuestion:'',AbortController,
 request:async action=>{assert.equal(action,'start');return {sessionToken:'token',durationSeconds:120,weather:{briefing:'The same local briefing'}};},displayWeather(){},transcript(){},ui(){},notify(){},status(message){messages.push(message);},setTimeout(fn,ms){timers.set(ms,fn);return ms;},clearTimeout(id){timers.delete(id);},async end(message){ctx.epoch++;ctx.busy=false;ctx.session=null;messages.push(message);}};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('async function start()'),source.indexOf("$('start').addEventListener")).replace('import(SDK)','Promise.resolve(loadedSDK)'),ctx);
 return {ctx,$,timers,messages,calls,release:()=>release()};
}
test('start reveals early media and preserves the existing unmuted provider session',async()=>{
 const h=startHarness();await h.ctx.start();assert.deepEqual(JSON.parse(JSON.stringify(h.calls[0])),{token:'token',options:{voiceChat:{defaultMuted:false}}});assert.ok(h.calls.includes('play'));assert.equal(h.timers.has(30000),false);assert.ok(h.ctx.session);assert.match(h.messages.at(-1),/local weather briefing/);
});
test('blocked autoplay exposes Enable sound without hiding the connected briefing',async()=>{
 const h=startHarness({blocked:true});await h.ctx.start();assert.equal(h.$('sound').hidden,false);assert.match(h.messages.at(-1),/Enable sound/);assert.ok(h.ctx.session);
});
test('stalled connection exposes retry and disposes of a late session',async()=>{
 const h=startHarness({stalled:true}),pending=h.ctx.start();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.timers.has(30000),true);await h.timers.get(30000)();assert.match(h.messages.at(-1),/timed out/);h.release();await pending;assert.equal(h.ctx.session,null);assert.ok(h.calls.includes('stop'));
});
