import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../../netlify/functions/yotee-speech.mjs';
const env={YOTEE_OPENAI_API_KEY:'test-key'};
const request=(payload,origin='https://www.ryangineer.com')=>new Request('https://www.ryangineer.com/.netlify/functions/yotee-speech',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)});
test('rejects untrusted web origin',async()=>assert.equal((await handler(request({text:'Hello'},'https://evil.example'),env)).status,403));
test('requires server credential',async()=>assert.equal((await handler(request({text:'Hello'}),{})).status,503));
test('rejects oversized speech text',async()=>assert.equal((await handler(request({text:'x'.repeat(1101)}),env)).status,400));
test('generates mp3 with OpenAI echo voice',async()=>{
 let options;
 const mock=async(url,init)=>{assert.equal(url,'https://api.openai.com/v1/audio/speech');options=init;return new Response(new Uint8Array([73,68,51,1,2,3]),{status:200});};
 const result=await handler(request({text:'Hello!'}),env,mock);
 assert.equal(result.status,200);
 assert.equal(result.headers.get('content-type'),'audio/mpeg');
 const body=JSON.parse(options.body);
 assert.equal(body.voice,'echo');
 assert.equal(body.model,'gpt-4o-mini-tts');
 assert.equal(options.headers.authorization,'Bearer test-key');
});
test('upstream failures return a service error',async()=>{
 const result=await handler(request({text:'Hello'}),env,async()=>new Response('{}',{status:429}));
 assert.equal(result.status,502);
});
