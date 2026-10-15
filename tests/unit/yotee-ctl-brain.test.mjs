import test from 'node:test';
import assert from 'node:assert/strict';
import {ctlKnowledge,retrieveCtlContext} from '../../netlify/functions/_lib/yotee-ctl-knowledge.mjs';
import {handler} from '../../netlify/functions/yotee-chat.mjs';
test('CAH is attributed solely to Ryan Buchanan',()=>{const cah=ctlKnowledge.find(x=>x.id==='cah');assert.match(cah.owner,/Ryan Buchanan/);assert.equal(cah.sourceType,'source-link-only');assert.match(cah.text,/not authored by Ann, Jac, or Kim/);});
test('Canvas queries retrieve relevant general guidance',()=>{assert.ok(retrieveCtlContext('How do I publish a Canvas module?').some(x=>x.id==='canvas-basics'));});
test('unrelated queries do not receive irrelevant invented facts',()=>assert.deepEqual(retrieveCtlContext('quantum zebras'),[]));
test('chat requests include attributed source information',async()=>{let payload;const req=new Request('https://www.ryangineer.com/.netlify/functions/yotee-chat',{method:'POST',headers:{origin:'https://www.ryangineer.com','content-type':'application/json'},body:JSON.stringify({question:'Who created the CAH?'})});const fake=async(url,options)=>{payload=JSON.parse(options.body);return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:'Ryan Buchanan created the CAH.'}]}]}),{status:200});};const result=await handler(req,{YOTEE_OPENAI_API_KEY:'test-key'},fake);assert.equal(result.status,200);assert.match(payload.instructions,/Ryan Buchanan/);assert.match(payload.instructions,/source-link-only/);assert.equal(payload.store,false);});
