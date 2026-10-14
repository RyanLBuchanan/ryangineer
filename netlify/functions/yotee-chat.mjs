// Isolated, server-side AI endpoint for the independent Yotee concept prototype.
const origins=new Set(['https://www.ryangineer.com','https://ryangineer.com']);
export const config={rateLimit:{windowLimit:8,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
const send=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
const instructions=`You are Yotee, an energetic, friendly, welcoming cartoon coyote mascot in a prototype for Coastal Alabama Community College. You embody school spirit, pride, enthusiasm, support, and community. Sound approachable, lightly playful, concise and helpful, not childish. Help with general college orientation questions, technology and Canvas basics, study strategies, and where to seek official support. Never invent specific campus contacts, locations, deadlines, policies, financial aid rules, phone numbers or web links. When a detail needs confirmation, recommend checking the official college website or the appropriate office. Never claim you are an official college employee or that this concept prototype is an authorized college service. Do not request student records, credentials, or personal data. Never pretend to access individual student information, accounts, or Canvas records. If asked about emergencies, direct the user to local emergency services. Keep replies to 1-4 short sentences, usually under 90 words.`;
export async function handler(request,env=process.env,fetcher=fetch){
 if(request.method!=='POST')return send(405,{message:'POST required.'});
 const origin=request.headers.get('origin');
 const allowed=new Set(origins);
 for(const url of [env.URL,env.DEPLOY_URL,env.DEPLOY_PRIME_URL]){try{if(url&&new URL(url).protocol==='https:')allowed.add(new URL(url).origin)}catch{}}
 if(env.CONTEXT==='dev'){allowed.add('http://localhost:8888');allowed.add('http://127.0.0.1:8888')}
 if(!origin||!allowed.has(origin))return send(403,{message:'Open this prototype through Ryangineer.'});
 const length=Number(request.headers.get('content-length'));if(length>12000)return send(413,{message:'Request too long.'});
 let raw='';try{raw=await request.text();if(raw.length>12000)return send(413,{message:'Request too long.'})}catch{return send(400,{message:'Invalid request.'})}
 let body;try{body=JSON.parse(raw)}catch{return send(400,{message:'Invalid JSON.'})}
 if(typeof body?.question!=='string'||!body.question.trim()||body.question.length>800)return send(400,{message:'Enter a question of up to 800 characters.'});
 const history=Array.isArray(body.history)?body.history:[];
 if(history.length>10||history.some(item=>!item||!['user','assistant'].includes(item.role)||typeof item.content!=='string'||item.content.length>1200))return send(400,{message:'Invalid conversation history.'});
 const turns=[...history.map(item=>({role:item.role,content:item.content})),{role:'user',content:body.question.trim()}];
 if(!env.YOTEE_OPENAI_API_KEY?.trim())return send(503,{message:'Live AI is not configured yet. Set YOTEE_OPENAI_API_KEY in Netlify.'});
 try{
 const result=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{'authorization':'Bearer '+env.YOTEE_OPENAI_API_KEY.trim(),'content-type':'application/json'},body:JSON.stringify({model:env.YOTEE_OPENAI_MODEL||'gpt-4.1-mini',instructions,input:turns,max_output_tokens:240,store:false}),redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!result.ok){
  const classification=result.status===401?'invalid_api_key':result.status===403?'permission_denied':result.status===429?'rate_or_quota_limit':result.status===400?'invalid_request':result.status>=500?'provider_error':'unknown_provider_error';
  console.error('[yotee-chat] OpenAI rejected request',{httpStatus:result.status,classification});
  return send(502,{message:result.status===401?'OpenAI rejected Yotee’s API key (401). Check the configured secret.':result.status===403?'OpenAI denied this key access (403). Check project permissions.':result.status===429?'OpenAI returned 429: quota, spending limit, or rate limit.':result.status===400?'OpenAI rejected the chat request (400).':`OpenAI chat returned HTTP ${result.status}.`,upstreamStatus:result.status});
 }
 const data=await result.json();const answer=(data.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n').trim();
 if(!answer)return send(502,{message:'The AI service returned no reply.'});
 return send(200,{answer:answer.slice(0,1800)});
 }catch(error){console.error('[yotee-chat] transport error',{type:error?.name==='TimeoutError'?'timeout':'network_or_runtime'});return send(502,{message:'OpenAI chat request timed out or encountered a connection error.'})}
}
export default request=>handler(request);
