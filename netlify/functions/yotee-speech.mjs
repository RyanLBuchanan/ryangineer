// Dedicated server-side speech generation for Yotee. Never expose provider keys to browsers.
const origins=new Set(['https://www.ryangineer.com','https://ryangineer.com']);
export const config={rateLimit:{windowLimit:8,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
const json=(status,message)=>new Response(JSON.stringify({message}),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}});
export async function handler(request,env=process.env,fetcher=fetch){
 if(request.method!=='POST')return json(405,'POST required.');
 const origin=request.headers.get('origin'),allowed=new Set(origins);
 for(const value of [env.URL,env.DEPLOY_URL,env.DEPLOY_PRIME_URL]){
  try{if(value&&new URL(value).protocol==='https:')allowed.add(new URL(value).origin)}catch{}
 }
 if(env.CONTEXT==='dev'){allowed.add('http://localhost:8888');allowed.add('http://127.0.0.1:8888')}
 if(!origin||!allowed.has(origin))return json(403,'Open Yotee through Ryangineer.');
 if(Number(request.headers.get('content-length'))>2400)return json(413,'Request too large.');
 let raw;
 try{raw=await request.text();if(new TextEncoder().encode(raw).length>2400)return json(413,'Request too large.')}catch{return json(400,'Invalid request.')}
 let data;try{data=JSON.parse(raw)}catch{return json(400,'Invalid JSON.')}
 const speech=data?.text;
 if(typeof speech!=='string'||!speech.trim()||speech.length>1100)return json(400,'Speech must contain 1–1100 characters.');
 const key=env.YOTEE_OPENAI_API_KEY?.trim();
 if(!key)return json(503,'Yotee’s OpenAI voice is not configured.');
 try{
  const upstream=await fetcher('https://api.openai.com/v1/audio/speech',{
   method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json'},
   body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'echo',input:speech.trim(),instructions:'Speak as a friendly, warm, youthful adult male campus guide. Conversational American English, naturally expressive and reassuring, with a relaxed smile in the voice. Use a moderate pace, gentle enthusiasm, clear articulation, and natural changes in intonation. Never sound like an announcer, salesperson, or robotic narrator.',response_format:'mp3'}),
   signal:AbortSignal.timeout(20000),redirect:'error'
  });
  if(!upstream.ok){
   const classification=upstream.status===401?'invalid_api_key':upstream.status===403?'permission_denied':upstream.status===429?'rate_or_quota_limit':upstream.status===400?'invalid_request':upstream.status>=500?'provider_error':'unknown_provider_error';
   console.error('[yotee-speech] OpenAI rejected request',{httpStatus:upstream.status,classification});
   const message=upstream.status===401?'OpenAI rejected Yotee’s API key (401). Check the configured secret.':upstream.status===403?'OpenAI denied this key access (403). Check project permissions.':upstream.status===429?'OpenAI returned 429: quota, spending limit, or rate limit.':upstream.status===400?'OpenAI rejected the voice request (400).':`OpenAI voice returned HTTP ${upstream.status}.`;
   return json(502,message);
  }
  const data=await upstream.arrayBuffer();
  if(!data.byteLength||data.byteLength>4500000)return json(502,'Invalid voice response.');
  return new Response(data,{status:200,headers:{'content-type':'audio/mpeg','cache-control':'private, no-store','x-content-type-options':'nosniff'}});
 }catch(error){console.error('[yotee-speech] transport error',{type:error?.name==='TimeoutError'?'timeout':'network_or_runtime'});return json(502,'OpenAI voice request timed out or encountered a connection error.');}
}
export default request=>handler(request);
