const $=id=>document.getElementById(id);
const endpoint='/.netlify/functions/nowcast-presenter';
const SDK='https://esm.sh/@heygen/liveavatar-web-sdk@0.0.19';
const params=new URLSearchParams(location.search);
let selected={lat:30.2944,lon:-87.5736,name:'Orange Beach, Alabama'};
const valid=loc=>loc && typeof loc.lat==='number' && typeof loc.lon==='number' && Number.isFinite(loc.lat) && Number.isFinite(loc.lon) && Math.abs(loc.lat)<=90 && Math.abs(loc.lon)<=180;
if(params.has('lat') && params.has('lon')) {const loc={lat:Number(params.get('lat')),lon:Number(params.get('lon')),name:params.get('place')?.slice(0,100)};if(valid(loc))selected=loc;}
let parentOrigin=null;
try{const ref=new URL(document.referrer);if(ref.origin===location.origin)parentOrigin=ref.origin;}catch{}
let session=null,busy=false,epoch=0,expiry=null,controller=null,queuedQuestion='',muted=false,startingSession=null,paused=false,restoreMic=false,controlBusy=false,connectionTimer=null;
function notify(type){if(parentOrigin && window.parent!==window)window.parent.postMessage({type},parentOrigin);}
function status(message,error=false){$('status').textContent=message;$('status').classList.toggle('error',error);}
const icons={play:'<path d="m9 5 11 7-11 7z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="4"/>',mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',muted:'<path d="m3 3 18 18M9 9v3a3 3 0 0 0 5 2M9 5V4a3 3 0 0 1 6 0v6M5 10v2a7 7 0 0 0 12 5M19 10v2M12 19v3M8 22h8"/>',end:'<path d="M3 15v-4c5-5 13-5 18 0v4l-5-1v-3a12 12 0 0 0-8 0v3z"/>'};
function control(id,label,icon,pressed){const button=$(id);button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+icons[icon]+'</svg>';button.setAttribute('aria-label',label);button.title=label;if(pressed!==undefined)button.setAttribute('aria-pressed',String(pressed));}
function ui(active){$('start').hidden=active;$('pause').hidden=!active;$('mute').hidden=!active;$('end').hidden=!active&&!busy;$('read').hidden=active;control('start','Start weather briefing','play');control('end',busy&&!active?'Cancel connection':'End conversation','end');control('pause',paused?'Resume live presenter':'Pause presenter',paused?'play':'pause',paused);control('mute',muted?'Unmute microphone':'Mute microphone',muted?'muted':'mic',muted);$('pause').disabled=controlBusy;$('mute').disabled=controlBusy||paused;$('connection').textContent=paused?'Paused':active?'Connected · ask away':busy?'Connecting…':'Ready when you are';$('avatar-video').hidden=!active;$('portrait').hidden=active;document.querySelector('.stage').classList.toggle('active',active);document.querySelector('.stage').classList.toggle('busy',busy);$('start').disabled=busy;$('read').disabled=busy;}
function transcript(role,message){const p=document.createElement('p'),label=document.createElement('strong');p.className=role;label.textContent=role==='user'?'You':'Nowcast';p.append(label,document.createTextNode(String(message).slice(0,3000)));$('transcript').append(p);while($('transcript').children.length>40)$('transcript').firstChild.remove();$('transcript').scrollTop=$('transcript').scrollHeight;}
function displayWeather(weather){$('place').textContent=weather.name;$('source-time').textContent=`Snapshot fetched ${new Date(weather.fetchedAt).toLocaleString([], {timeZone:weather.timeZone})} (${weather.timeZone}). Fresh weather is fetched for each new session.`;$('source-warning').textContent=weather.warnings.join(' ');$('source-links').replaceChildren();for(const source of weather.sources){const a=document.createElement('a');a.href=source.url;a.textContent=source.label;a.target='_blank';a.rel='noopener noreferrer';$('source-links').append(a);}}
async function request(action,signal){const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,lat:selected.lat,lon:selected.lon}),signal});const data=await response.json().catch(()=>null);if(!response.ok || !data?.weather)throw new Error(data?.message || 'The weather presenter is unavailable. View the local forecast below.');return data;}
async function end(message='Conversation ended. Start again for fresh weather.'){
  epoch++;controller?.abort();controller=null;clearTimeout(expiry);expiry=null;clearTimeout(connectionTimer);connectionTimer=null;
  const old=session || startingSession;session=null;startingSession=null;busy=false;muted=false;paused=false;restoreMic=false;controlBusy=false;ui(false);$('sound').hidden=true;$('avatar-video').srcObject=null;notify('nowcast-presenter-ended');status(message);
  if(old){try{old.voiceChat?.stop();await old.stop();}catch{status('Connection ended on this device. The provider session will expire automatically.');}}
}
async function start(){
  if(busy || session)return;
  busy=true;ui(false);$('end').hidden=false;const generation=++epoch;controller=new AbortController();status('Fetching fresh official weather and connecting your presenter…');
  connectionTimer=setTimeout(()=>void end('Connection timed out. Tap play to retry your local weather briefing, or choose Read briefing.'),30000);
  let candidate,playbackBlocked=false;
  try {
    const [data,sdk]=await Promise.all([request('start',controller.signal),import(SDK)]);
    if(generation!==epoch)return;
    displayWeather(data.weather);
    candidate=new sdk.LiveAvatarSession(data.sessionToken,{voiceChat:{defaultMuted:false}});startingSession=candidate;
    candidate.on('session.stream_ready',()=>{if(generation!==epoch)return;candidate.attach($('avatar-video'));$('avatar-video').hidden=false;$('portrait').hidden=true;$('avatar-video').play().catch(()=>{if(generation!==epoch)return;playbackBlocked=true;$('sound').hidden=false;status('Your briefing audio is blocked. Tap Enable sound on the avatar to listen.',true);});});
    candidate.on('avatar.transcription',event=>{if(generation===epoch)transcript('assistant',event.text);});
    candidate.on('user.transcription',event=>{if(generation===epoch)transcript('user',event.text);});
    candidate.on('avatar.speak_started',()=>{if(generation===epoch&&!paused)$('connection').textContent='Your weather briefing';});
    candidate.on('avatar.speak_ended',()=>{if(generation===epoch&&!paused)$('connection').textContent='Listening · ask about your day';});
    candidate.on('session.disconnected',()=>{if(generation===epoch)void end('The connection ended. Start again for a fresh briefing.');});
    await candidate.start();
    if(generation!==epoch){await candidate.stop().catch(()=>{});return;}
    clearTimeout(connectionTimer);connectionTimer=null;session=candidate;startingSession=null;busy=false;ui(true);notify('nowcast-presenter-active');
    status(playbackBlocked?'Your briefing audio is blocked. Tap Enable sound on the avatar to listen.':'Your local weather briefing is starting. Listen, then ask a weather question.',playbackBlocked);
    expiry=setTimeout(()=>void end('This briefing has ended. Start again to fetch fresh weather.'),data.durationSeconds*1000);
    if(queuedQuestion){const question=queuedQuestion;queuedQuestion='';$('question').value=question;$('conversation').open=true;status('Listen to the briefing, then tap Ask to discuss your plans.');}
  } catch(error) {
    if(generation!==epoch)return;
    clearTimeout(connectionTimer);connectionTimer=null;
    if(candidate){try{candidate.voiceChat?.stop();await candidate.stop();}catch{}}
    session=null;startingSession=null;busy=false;ui(false);notify('nowcast-presenter-ended');status(error?.name==='NotAllowedError'?'Microphone access was declined. Read the briefing or allow the microphone to start the avatar.':error.message,true);
  }
}
$('start').addEventListener('click',start);
$('end').addEventListener('click',()=>void end());
$('mute').addEventListener('click',async()=>{if(!session||controlBusy||paused)return;const current=session;controlBusy=true;ui(true);try{if(muted)await current.voiceChat.unmute();else await current.voiceChat.mute();if(session!==current)return;muted=!muted;status(muted?'Microphone muted. You can still type a question.':'Microphone on. Ask about your plans.');}catch{if(session===current)status('Could not change the microphone. End the conversation and try again.',true);}finally{if(session===current){controlBusy=false;ui(true);}}});
$('pause').addEventListener('click',async()=>{if(!session||controlBusy)return;const current=session,generation=epoch;controlBusy=true;ui(true);try{if(paused){await $('avatar-video').play();if(generation!==epoch)return;if(restoreMic)await current.voiceChat.unmute();if(generation!==epoch)return;muted=!restoreMic;paused=false;status('Live presenter resumed.');}else{restoreMic=!muted;await current.voiceChat.mute();if(generation!==epoch)return;muted=true;$('avatar-video').pause();paused=true;status('Playback and microphone paused. Resume returns to the live stream; the two-minute session timer continues.');}}catch{if(generation===epoch){if(paused)$('avatar-video').pause();status('Could not change playback. Try again or hang up.',true);}}finally{if(generation===epoch){controlBusy=false;ui(true);}}});
$('sound').addEventListener('click',()=>{$('avatar-video').play().then(()=>{$('sound').hidden=true;status('Sound enabled. Listen to your weather presenter.');}).catch(()=>status('Audio is blocked. Check your browser’s sound permission.',true));});
$('read').addEventListener('click',async()=>{if(busy)return;busy=true;ui(false);const generation=++epoch;controller=new AbortController();status('Fetching a fresh local briefing…');try{const data=await request('briefing',controller.signal);if(generation!==epoch)return;displayWeather(data.weather);$('conversation').open=true;transcript('assistant',data.weather.briefing);status('Briefing ready. Start the avatar to ask a follow-up question.');}catch(error){if(generation===epoch)status(error.message,true);}finally{if(generation===epoch){busy=false;ui(false);}}});
$('ask').addEventListener('submit',event=>{event.preventDefault();const question=$('question').value.trim();if(!question)return;if(paused){status('Resume the presenter before asking a question.');$('pause').focus();return;}if(!session){status('Start weather briefing to ask the presenter a question.');$('start').focus();return;}session.interrupt();session.message(question);transcript('user',question);$('question').value='';});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{const question=button.dataset.question;if(session){$('question').value=question;$('conversation').open=true;$('question').focus();}else{queuedQuestion=question;void start();}}));
$('forecast').addEventListener('click',()=>{void end();if(parentOrigin)notify('nowcast-presenter-forecast');else location.href='https://www.ryangineer.com/tools/nowcast.html?lat='+selected.lat+'&lon='+selected.lon+'#current-heading';});
window.addEventListener('message',event=>{
  if(event.source!==window.parent || event.origin!==parentOrigin)return;
  if(event.data?.type==='nowcast-presenter-stop'){void end();return;}
  if(event.data?.type!=='nowcast-presenter-location' || !valid(event.data.loc))return;
  const changed=selected.lat!==event.data.loc.lat || selected.lon!==event.data.loc.lon;
  selected={lat:event.data.loc.lat,lon:event.data.loc.lon,name:String(event.data.loc.name || 'Selected location').slice(0,100)};
  if(changed){void end('Location changed. Start a new briefing for this place.');$('transcript').replaceChildren();$('source-time').textContent='Start or read a new briefing for this location.';$('source-warning').textContent='';$('source-links').replaceChildren();queuedQuestion='';}
  $('place').textContent=selected.name || 'Selected location';
});
window.addEventListener('pagehide',()=>void end());
document.addEventListener('visibilitychange',()=>{if(document.hidden && (session || busy))void end('Conversation paused while you were away. Start again for fresh weather.');});
$('place').textContent=selected.name || 'Selected location';ui(false);notify('nowcast-presenter-ready');
if(parentOrigin && typeof ResizeObserver!=='undefined')new ResizeObserver(()=>window.parent.postMessage({type:'nowcast-presenter-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+8},parentOrigin)).observe(document.querySelector('main'));


