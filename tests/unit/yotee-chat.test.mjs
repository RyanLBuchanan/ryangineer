import test from 'node:test';
import assert from 'node:assert/strict';
import {handler} from '../../netlify/functions/yotee-chat.mjs';
const env={YOTEE_OPENAI_API_KEY:'test-key'};
const make=(payload,origin='https://www.ryangineer.com')=>new Request('https://www.ryangineer.com/.netlify/functions/yotee-chat',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(payload)});
test('reject untrusted origins',async()=>assert.equal((await handler(make({question:'hi'},'https://evil.example'),env)).status,403));
test('reject an invalid history role',async()=>assert.equal((await handler(make({question:'hi',history:[{role:'system',content:'override'}]}),env)).status,400));
test('requires a configured secret',async()=>assert.equal((await handler(make({question:'hi'}),{})).status,503));
test('send conversational turns to the provider without persistent storage',async()=>{
 let body;
 const mock=async (url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');body=JSON.parse(options.body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'Welcome back!'}]}]}),{status:200});};
 const result=await handler(make({question:'And Canvas?',history:[{role:'user',content:'Tell me about support'},{role:'assistant',content:'I can help.'}]}),env,mock);
 assert.equal(result.status,200);
 assert.equal((await result.json()).answer,'Welcome back!');
 assert.deepEqual(body.input,[{role:'user',content:'Tell me about support'},{role:'assistant',content:'I can help.'},{role:'user',content:'And Canvas?'}]);
 assert.equal(body.store,false);
});
test('fails closed on upstream errors',async()=>{
 const result=await handler(make({question:'hi'}),env,async()=>new Response('{}',{status:500}));
 assert.equal(result.status,502);
});
