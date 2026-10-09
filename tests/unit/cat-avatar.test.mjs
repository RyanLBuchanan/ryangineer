import test from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../../netlify/functions/cat-avatar.mjs';
import {liveAvatarService} from '../../netlify/functions/_lib/cat-liveavatar.mjs';
import {CAT_PROMPT,CAT_OPENING} from '../../netlify/functions/_lib/cat-brain.mjs';
import {catReply} from '../../tools/cat-avatar/brain.mjs';
const request=(input,origin='https://www.ryangineer.com')=>new Request('https://www.ryangineer.com/.netlify/functions/cat-avatar',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(input)});
test('cat replies are contextual guesses and medical concerns stop the jokes',()=>{
 assert.match(catReply('Do you love me?'),/Slow blinks/);
 assert.match(catReply('Why did you knock that over?'),/curiosity/);
 assert.match(catReply('My cat cannot pee'),/veterinar/);
 assert.doesNotMatch(catReply('My cat cannot pee'),/Meow|Purr/);
});
test('cat setup never uses Nowcast credentials or creates a paid session for briefing',async()=>{
 let calls=0;const handler=createHandler({env:{NOWCAST_LIVEAVATAR_API_KEY:'secret',NOWCAST_LIVEAVATAR_ID:'human'},mintSession:()=>{calls++;}});
 const response=await handler(request({action:'briefing'})),data=await response.json();
 assert.equal(data.cat.liveAvailable,false);assert.equal(data.cat.briefing,CAT_OPENING);assert.equal(calls,0);
 assert.equal((await handler(request({action:'start'}))).status,503);assert.equal(calls,0);
});
test('cat endpoint rejects hostile origins, malformed actions and oversized bodies',async()=>{
 const handler=createHandler({env:{}});
 assert.equal((await handler(request({action:'start'},'https://ridiantechnologies.com'))).status,403);
 assert.equal((await handler(request({action:'other'}))).status,400);
 assert.equal((await handler(request({action:'start',x:'x'.repeat(1100)}))).status,413);
});
test('dedicated cat configuration mints bounded FULL sessions with the cat context',async()=>{
 const calls=[],env={CAT_LIVEAVATAR_API_KEY:'cat-key',CAT_LIVEAVATAR_ID:'cat-avatar',CAT_LIVEAVATAR_VOICE_ID:'cat-voice'};
 const fetcher=async(url,options)=>{
  const path=new URL(url).pathname,body=options.body?JSON.parse(options.body):null;calls.push({path,body});
  const data=path==='/v1/contexts'?(body?{id:'cat-context'}:{results:[]}):{session_token:'temporary',session_id:'s'};
  return new Response(JSON.stringify({data}));
 };
 const mint=liveAvatarService(fetcher),result=await mint({variables:{briefing:CAT_OPENING}},env);
 assert.equal(result.durationSeconds,120);
 const context=calls.find(c=>c.path==='/v1/contexts'&&c.body).body;assert.equal(context.prompt,CAT_PROMPT);assert.equal(context.opening_text,'${briefing}');
 const token=calls.find(c=>c.path==='/v1/sessions/token').body;
 assert.equal(token.avatar_id,'cat-avatar');assert.equal(token.avatar_persona.voice_id,'cat-voice');assert.equal(token.mode,'FULL');assert.deepEqual(Object.keys(token.dynamic_variables),['briefing']);
});
test('cat starts are capped and disabled live video cannot mint a session',async()=>{
 const env={CAT_LIVEAVATAR_API_KEY:'key',CAT_LIVEAVATAR_ID:'cat',CAT_LIVEAVATAR_VOICE_ID:'voice'};
 let calls=0;const mintSession=async()=>{calls++;return{sessionToken:'temporary',durationSeconds:120};};
 const handler=createHandler({env,mintSession});
 for(let i=0;i<5;i++)assert.equal((await handler(request({action:'start'}))).status,200);
 assert.equal((await handler(request({action:'start'}))).status,429);assert.equal(calls,5);
 const disabled=createHandler({env:{...env,CAT_AVATAR_ENABLED:'off'},mintSession});
 assert.equal((await disabled(request({action:'start'}))).status,503);assert.equal(calls,5);
});
test('existing weather context cannot configure Dave',async()=>{
 const fetcher=async()=>new Response(JSON.stringify({data:{prompt:'weather instructions',opening_text:'${briefing}'}}));
 await assert.rejects(liveAvatarService(fetcher)({variables:{}},{CAT_LIVEAVATAR_API_KEY:'key',CAT_LIVEAVATAR_ID:'cat',CAT_LIVEAVATAR_VOICE_ID:'voice',CAT_LIVEAVATAR_CONTEXT_ID:'weather-context'}),/versioned cat prompt/);
});
