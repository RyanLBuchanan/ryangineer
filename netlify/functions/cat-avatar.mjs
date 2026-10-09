import { CatError, CAT_OPENING } from './_lib/cat-brain.mjs';
import { liveAvatarService } from './_lib/cat-liveavatar.mjs';
export const config={rateLimit:{windowLimit:6,windowSize:60,aggregateBy:['ip'],action:'rate_limit'}};
const headers={'content-type':'application/json','cache-control':'private, no-store','x-content-type-options':'nosniff'};
const json=(status,data)=>new Response(JSON.stringify(data),{status,headers});
export function allowedOrigin(request, env = process.env) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const allowed = new Set(['https://www.ryangineer.com', 'https://ryangineer.com']);
  try {
    const source = new URL(origin);
    if (source.origin === origin && source.protocol === 'https:' && /^deploy-preview-\d+--reverent-mahavira-a88a48\.netlify\.app$/.test(source.hostname)) return true;
  } catch { return false; }
  for (const raw of [env.URL, env.DEPLOY_URL, env.DEPLOY_PRIME_URL]) {
    try { if (raw && new URL(raw).protocol === 'https:') allowed.add(new URL(raw).origin); } catch {}
  }
  if (env.CONTEXT === 'dev') { allowed.add('http://localhost:8888'); allowed.add('http://127.0.0.1:8888'); }
  return allowed.has(origin);
}

export function createHandler({mintSession=liveAvatarService(),env=process.env}={}) {
  let starts=[];
  return async request=>{
    if(request.method!=='POST')return json(405,{message:'Use POST.'});
    if(!allowedOrigin(request,env))return json(403,{message:'Open Dave through Cat Translator.'});
    if(Number(request.headers.get('content-length'))>1024)return json(413,{message:'Request too large.'});
    try{
      const reader=request.body?.getReader();if(!reader)return json(400,{message:'Choose briefing or start.'});
      let size=0,text='';const decoder=new TextDecoder();
      try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();return json(413,{message:'Request too large.'});}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}
      let input;try{input=JSON.parse(text);}catch{return json(400,{message:'Choose briefing or start.'});}
      if(!input || !['briefing','start'].includes(input.action))return json(400,{message:'Choose briefing or start.'});
      const liveAvailable=Boolean(env.CAT_LIVEAVATAR_API_KEY?.trim() && env.CAT_LIVEAVATAR_ID?.trim() && env.CAT_LIVEAVATAR_VOICE_ID?.trim() && !/^(0|false|off)$/i.test(env.CAT_AVATAR_ENABLED||''));
      const cat={briefing:CAT_OPENING,liveAvailable};
      if(input.action==='briefing')return json(200,{cat});
      if(!liveAvailable)return json(503,{message:'Live cat video needs its dedicated avatar configuration. Animated Dave and typed replies are ready.'});
      const now=Date.now();starts=starts.filter(t=>now-t<3600000);
      if(starts.length>=25 || starts.filter(t=>now-t<60000).length>=5)return json(429,{message:'Dave needs a catnap. Try again shortly.'});
      starts.push(now);
      const session=await mintSession({variables:{briefing:CAT_OPENING}},env);
      return json(200,{...session,cat});
    }catch(error){return json(error instanceof CatError?error.status:502,{message:error instanceof CatError?error.message:'Live cat video is unavailable. Animated Dave is still ready.'});}
  };
}
export default createHandler();
