import { CONTEXT_NAME, CAT_PROMPT as WEATHER_PROMPT, CatError as WeatherError } from './cat-brain.mjs';
const BASE = 'https://api.liveavatar.com/v1';
export function liveAvatarService(fetcher = fetch) {
  let setup;
  async function call(key,path,body) {
    const response=await fetcher(BASE+path,{method:body?'POST':'GET',headers:{'X-API-KEY':key,'content-type':'application/json',accept:'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000),redirect:'error'});
    const result=await response.json().catch(()=>null);
    if(!response.ok || !result?.data) throw new WeatherError(response.status===429?'LiveAvatar is busy. End another session or try again shortly.':'LiveAvatar could not prepare the cat companion.',response.status===429?429:502);
    return result.data;
  }
  async function list(key,path) {
    const rows=[];
    for(let page=1;page<=10;page++) {
      const data=await call(key,`${path}${path.includes('?')?'&':'?'}page_size=100&page=${page}`);
      if(!Array.isArray(data.results))throw new WeatherError('LiveAvatar returned an unsupported configuration response.');
      rows.push(...data.results);
      if(!data.next)return rows;
    }
    throw new WeatherError('LiveAvatar has too many configuration pages. Set the explicit cat IDs.');
  }
  async function configure(key,env) {
    const voiceId=env.NOWCAST_LIVEAVATAR_VOICE_ID?.trim();
    if(!voiceId)throw new WeatherError('The cat avatar voice is not configured for this deployment yet.',503);
    let contextId=env.CAT_LIVEAVATAR_CONTEXT_ID?.trim();
    if(contextId) {
      const context=await call(key,'/contexts/'+encodeURIComponent(contextId));
      if(context.prompt!==WEATHER_PROMPT || context.opening_text!=='${briefing}')throw new WeatherError('The cat context must use the versioned cat prompt and briefing placeholder.',503);
    } else {
      const contexts=await list(key,'/contexts');
      let matching;
      for(const summary of contexts.filter(c=>c.name===CONTEXT_NAME)) {
        const candidate=await call(key,'/contexts/'+encodeURIComponent(summary.id));
        if(candidate.prompt===WEATHER_PROMPT && candidate.opening_text==='${briefing}') {matching=candidate;break;}
      }
      if(matching)contextId=matching.id;
      else {
        // Store reusable instructions only, never coordinates, observations or conversations.
        const created=await call(key,'/contexts',{name:CONTEXT_NAME,prompt:WEATHER_PROMPT,opening_text:'${briefing}',links:[]});
        contextId=created.id;
      }
    }
    if(!voiceId || !contextId)throw new WeatherError('LiveAvatar voice or cat context is unavailable.',503);
    return {voiceId,contextId};
  }
  return async function createSession(snapshot,env) {
    const key=env.NOWCAST_LIVEAVATAR_API_KEY?.trim();
    if(!key || !env.NOWCAST_LIVEAVATAR_ID?.trim())throw new WeatherError('The cat avatar is not configured for this deployment yet.',503);
    if(!setup) setup=configure(key,env).catch(error=>{setup=null;throw error;});
    const {voiceId,contextId}=await setup;
    const data=await call(key,'/sessions/token',{
      mode:'FULL',avatar_id:env.NOWCAST_LIVEAVATAR_ID.trim(),
      max_session_duration:120,video_settings:{quality:'high',encoding:'H264'},
      avatar_persona:{voice_id:voiceId,context_id:contextId,language:'en'},
      dynamic_variables:snapshot.variables
    });
    if(typeof data.session_token!=='string' || !data.session_token)throw new WeatherError('LiveAvatar did not return a session token.');
    return {sessionToken:data.session_token,sessionId:data.session_id,durationSeconds:120,voiceLabel:'Dave · AI-generated',mode:'FULL'};
  };
}
