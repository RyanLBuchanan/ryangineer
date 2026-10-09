import {greeting,catReply} from './brain.mjs';
const $=id=>document.getElementById(id), endpoint='/.netlify/functions/cat-avatar';
const SDK='https://esm.sh/@heygen/liveavatar-web-sdk@0.0.19';
let session=null,candidate=null,controller=null,epoch=0,busy=false,active=false,expiry,muted=false,recognition=null,audio=null;
const parentOrigin=(()=>{try{return new URL(document.referrer).origin===location.origin?location.origin:null;}catch{return null;}})();
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function transcript(role,text){const p=document.createElement('p'),label=document.createElement('strong');label.textContent=role==='user'?'You':'Dave';p.className=role;p.append(label,document.createTextNode(String(text).slice(0,3000)));$('transcript').append(p);while($('transcript').children.length>40)$('transcript').firstChild.remove();$('transcript').scrollTop=$('transcript').scrollHeight;}
function animate(talking){$('portrait').classList.toggle('talking',talking);}
function ui(){$('start').hidden=active;$('end').hidden=!active&&!busy;$('mute').hidden=!session;$('live').disabled=busy||active;$('start').disabled=busy;$('mode').textContent=session?'LiveAvatar cat':'Animated Dave';$('avatar-video').hidden=!session;$('portrait').hidden=Boolean(session);$('connection').textContent=busy?'Connecting…':active?'Dave is listening':'Ready for mischief';}
function meow(){
 try{
 audio ||= new (window.AudioContext||window.webkitAudioContext)();void audio.resume();
 const osc=audio.createOscillator(),gain=audio.createGain(),filter=audio.createBiquadFilter(),t=audio.currentTime;
 osc.type='sawtooth';osc.frequency.setValueAtTime(540,t);osc.frequency.exponentialRampToValueAtTime(760,t+.18);osc.frequency.exponentialRampToValueAtTime(430,t+.55);
 filter.type='bandpass';filter.frequency.setValueAtTime(1200,t);filter.frequency.linearRampToValueAtTime(700,t+.55);filter.Q.value=2;
 gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.06,t+.04);gain.gain.exponentialRampToValueAtTime(.001,t+.6);
 osc.connect(filter);filter.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.65);osc.onended=()=>{osc.disconnect();filter.disconnect();gain.disconnect();};
 }catch{}
}
function speak(text){
 const generation=epoch;window.speechSynthesis?.cancel();meow();animate(true);
 if(!window.speechSynthesis || !window.SpeechSynthesisUtterance){setTimeout(()=>{if(generation===epoch)animate(false);},700);status('Dave replied below. This browser does not support spoken replies.');return;}
 const utterance=new SpeechSynthesisUtterance(text);utterance.rate=1.04;utterance.pitch=1.2;
 utterance.onend=utterance.onerror=()=>{if(generation===epoch)animate(false);};
 speechSynthesis.speak(utterance);
}
async function request(action,signal){
 const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action}),signal});
 const data=await response.json();if(!response.ok)throw Error(data.message||'Live video unavailable.');return data;
}
async function end(message='Dave is taking a catnap. Come back any time.'){
 epoch++;controller?.abort();controller=null;clearTimeout(expiry);recognition?.abort();recognition=null;window.speechSynthesis?.cancel();animate(false);
 const old=session||candidate;session=null;candidate=null;active=false;busy=false;muted=false;$('mute').textContent='Mute microphone';$('sound').hidden=true;$('avatar-video').srcObject=null;ui();status(message);
 if(audio){const oldAudio=audio;audio=null;void oldAudio.close().catch(()=>{});}
 if(old){try{old.voiceChat?.stop();await old.stop();}catch{status('Connection ended here. The live session will expire automatically.');}}
}
function localStart(){
 if(busy||active)return;
 if(parentOrigin)window.parent.postMessage({type:'cat-avatar-active'},parentOrigin);
 epoch++;active=true;ui();$('conversation').open=true;transcript('assistant',greeting);speak(greeting);
 status('Animated Dave is ready. Type a question below, or use Dictate a question.');expiry=setTimeout(()=>void end(),120000);
}
async function liveStart(){
 if(active||busy)return;
 if(parentOrigin)window.parent.postMessage({type:'cat-avatar-active'},parentOrigin);
 busy=true;ui();const generation=++epoch;controller=new AbortController();status('Connecting the live cat…');
 try{
 const [data,sdk]=await Promise.all([request('start',controller.signal),import(SDK)]);
 if(generation!==epoch)return;
 const next=new sdk.LiveAvatarSession(data.sessionToken,{voiceChat:{defaultMuted:false}});candidate=next;
 next.on('session.stream_ready',()=>{if(generation===epoch){next.attach($('avatar-video'));$('avatar-video').play().catch(()=>{$('sound').hidden=false;});}});
 next.on('avatar.transcription',event=>{if(generation===epoch)transcript('assistant',event.text);});
 next.on('user.transcription',event=>{if(generation===epoch)transcript('user',event.text);});
 next.on('session.disconnected',()=>{if(generation===epoch)void end('Live video ended. Animated Dave is still ready.');});
 await next.start();if(generation!==epoch){await next.stop().catch(()=>{});return;}
 session=next;candidate=null;active=true;busy=false;ui();$('conversation').open=true;status('Live cat connected. Your microphone is on; mute it to type.');expiry=setTimeout(()=>void end(),data.durationSeconds*1000);
 }catch(error){if(generation!==epoch)return;const old=candidate;candidate=null;busy=false;ui();if(old)await old.stop().catch(()=>{});status(error.message+' You can still tap Talk to Dave.',true);}
}
function ask(question){
 if(busy)return;const text=String(question).trim().slice(0,600);if(!text)return;
 $('conversation').open=true;
 if(session){session.interrupt();session.message(text);transcript('user',text);}
 else{if(!active){if(parentOrigin)window.parent.postMessage({type:'cat-avatar-active'},parentOrigin);epoch++;active=true;ui();expiry=setTimeout(()=>void end(),120000);}transcript('user',text);const reply=catReply(text);transcript('assistant',reply);speak(reply);status('Animated Dave replied. Ask another question.');}
 $('question').value='';
}
$('start').onclick=localStart;$('live').onclick=liveStart;$('end').onclick=()=>void end();
$('read').onclick=()=>{$('conversation').open=true;$('question').focus();};
$('ask').onsubmit=event=>{event.preventDefault();ask($('question').value);};
document.querySelectorAll('[data-question]').forEach(button=>button.onclick=()=>ask(button.dataset.question));
$('mute').onclick=async()=>{if(!session)return;try{if(muted)await session.voiceChat.unmute();else await session.voiceChat.mute();muted=!muted;$('mute').textContent=muted?'Unmute microphone':'Mute microphone';}catch{status('Could not change microphone. End and restart the session.',true);}};
$('sound').onclick=()=>{$('avatar-video').play().then(()=>{$('sound').hidden=true;}).catch(()=>status('Sound is blocked by this browser.',true));};
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(SR){const button=document.createElement('button');button.type='button';button.textContent='Dictate a question';document.querySelector('.controls').append(button);button.onclick=()=>{
 if(session||busy){status('Use the live microphone or type below.');return;}
 window.speechSynthesis?.cancel();animate(false);recognition?.abort();const generation=epoch;const next=new SR();recognition=next;next.lang='en-US';next.continuous=false;
 next.onresult=event=>{if(generation===epoch)ask(event.results[0][0].transcript);};
 next.onerror=()=>{if(generation===epoch)status('Dictation unavailable. Type your question below.');};
 next.onend=()=>{if(recognition===next)recognition=null;};
 try{next.start();status('Listening for one question…');}catch{status('Dictation unavailable. Type below.');}
};}
void request('briefing').then(data=>{$('live').hidden=!data.cat.liveAvailable;$('setup').textContent=data.cat.liveAvailable?'Live cat video is available, or enjoy Animated Dave.':'Animated Dave is ready. Live video is waiting for a dedicated cat avatar configuration.';}).catch(()=>{$('setup').textContent='Animated Dave is ready. Live video availability could not be checked.';});
window.addEventListener('pagehide',()=>void end());
window.addEventListener('message',event=>{if(event.origin===parentOrigin && event.source===window.parent && event.data?.type==='cat-avatar-stop')void end();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||busy))void end('Dave paused while you were away.');});
if(parentOrigin && window.parent!==window && typeof ResizeObserver!=='undefined')new ResizeObserver(()=>window.parent.postMessage({type:'cat-avatar-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+8},parentOrigin)).observe(document.querySelector('main'));
ui();
