const $=id=>document.getElementById(id),endpoint='/.netlify/functions/cat-avatar';
const SDK='https://esm.sh/@heygen/liveavatar-web-sdk@0.0.19';
let session=null,candidate=null,controller=null,epoch=0,busy=false,active=false,expiry,muted=true,speaking=false;
const parentOrigin=(()=>{try{return new URL(document.referrer).origin===location.origin?location.origin:null;}catch{return null;}})();
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function transcript(role,text){const p=document.createElement('p'),label=document.createElement('strong');label.textContent=role==='user'?'You':'Buns';p.className=role;p.append(label,document.createTextNode(String(text).slice(0,3000)));$('transcript').append(p);while($('transcript').children.length>40)$('transcript').firstChild.remove();$('transcript').scrollTop=$('transcript').scrollHeight;}
function ui(){
 const running=Boolean(active||busy);
 $('start').hidden=false;$('start').disabled=false;$('start').setAttribute('aria-pressed',String(running));
 $('start').setAttribute('aria-label',running?'Boop to stop Buns':'Boop to start Buns');$('boop-label').textContent=running?'Boop to stop':'Boop to start';
 $('boop-hint').textContent=busy?'Connecting. Boop again to cancel.':session?(muted?'Microphone off. Type or tap Microphone on.':'Microphone on. Speak naturally; boop to stop.'):'Tap the paw. Tap again to stop.';
 $('mute').hidden=true;$('dictate').disabled=busy;$('dictate').textContent=session?(muted?'Microphone on':'Microphone off'):'Microphone';
 $('dictate').setAttribute('aria-pressed',String(Boolean(session&&!muted)));$('mode').textContent='Ryan’s voice';
 $('connection').textContent=busy?'Connecting…':speaking?'Buns is speaking…':session?(muted?'Connected · microphone off':'Listening to you…'):'Ready for mischief';
 $('portrait').hidden=false;$('portrait').classList.toggle('talking',speaking);
}
async function request(signal){
 const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'start'}),signal});
 const data=await response.json();if(!response.ok)throw Error(data.message||'LiveAvatar voice unavailable.');return data;
}
async function end(message='Buns is taking a catnap. Boop to start again.'){
 epoch++;controller?.abort();controller=null;clearTimeout(expiry);
 const old=session||candidate;session=null;candidate=null;active=false;busy=false;muted=true;speaking=false;$('sound').hidden=true;$('avatar-video').srcObject=null;ui();status(message);
 if(old){try{old.voiceChat?.stop();await old.stop();}catch{status('Connection ended here. The provider session will expire automatically.');}}
}
async function start({textOnly=false,question=''}={}){
 if(active||busy)return;
 if(parentOrigin)window.parent.postMessage({type:'cat-avatar-active'},parentOrigin);
 busy=true;const generation=++epoch;controller=new AbortController();expiry=setTimeout(()=>void end('Connection timed out. Boop to retry, or type a question.'),30000);ui();status('Connecting…');
 let next;
 try{
 const [data,sdk]=await Promise.all([request(controller.signal),import(SDK)]);
 if(generation!==epoch)return;
 next=new sdk.LiveAvatarSession(data.sessionToken,{voiceChat:{defaultMuted:textOnly}});candidate=next;
 next.on('session.stream_ready',()=>{if(generation===epoch){next.attach($('avatar-video'));$('avatar-video').play().catch(()=>{$('sound').hidden=false;status('Tap Enable sound to hear Buns.');});}});
 next.on('avatar.transcription',event=>{if(generation===epoch)transcript('assistant',event.text);});
 next.on('user.transcription',event=>{if(generation===epoch)transcript('user',event.text);});
 next.on('avatar.speak_started',()=>{if(generation===epoch){speaking=true;ui();}});
 next.on('avatar.speak_ended',()=>{if(generation===epoch){speaking=false;ui();}});
 next.on('user.speak_started',()=>{if(generation===epoch)$('connection').textContent='Hearing you…';});
 next.on('user.speak_ended',()=>{if(generation===epoch)$('connection').textContent='Buns is thinking…';});
 next.on('session.disconnected',()=>{if(generation===epoch)void end('Connection ended. Boop to reconnect.');});
 await next.start();if(generation!==epoch){await next.stop().catch(()=>{});return;}
 session=next;candidate=null;active=true;busy=false;
 muted=next.voiceChat.state!=='ACTIVE'||next.voiceChat.isMuted;ui();
 status(muted?'Connected · microphone off. Type or tap Microphone on.':'Listening. Speak, then pause.');
 clearTimeout(expiry);expiry=setTimeout(()=>void end(),data.durationSeconds*1000);
 if(question){$('question').value=question;status('Connected. Tap Ask Buns to send your question after the greeting.');}
 }catch(error){
 if(generation!==epoch)return;
 if(next)await next.stop().catch(()=>{});candidate=null;session=null;busy=false;active=false;speaking=false;ui();
 status((error?.name==='NotAllowedError'?'Microphone access was declined. You can connect by typing a question.':error.message)+' No substitute voice is used.',true);
 }
}
async function ask(question){
 const text=String(question).trim().slice(0,600);if(!text||busy)return;$('conversation').open=true;
 if(!session){await start({textOnly:true,question:text});return;}
 try{session.interrupt();session.message(text);transcript('user',text);$('question').value='';status('Question sent. Buns is thinking…');}catch{status('Your question could not be sent. Boop to reconnect and try again.',true);}
}
$('start').onclick=()=>{if(active||busy)void end();else void start();};
$('read').onclick=()=>{$('conversation').open=true;$('question').focus();};
$('ask').onsubmit=event=>{event.preventDefault();void ask($('question').value);};
document.querySelectorAll('[data-question]').forEach(button=>button.onclick=()=>{ $('conversation').open=true;$('question').value=button.dataset.question;$('question').focus();if(!session)void start({textOnly:true,question:button.dataset.question});});
$('dictate').onclick=async()=>{
 if(busy)return;if(!session){void start();return;}
 try{if(session.voiceChat.state!=='ACTIVE')await session.voiceChat.start({defaultMuted:false});else if(session.voiceChat.isMuted)await session.voiceChat.unmute();else await session.voiceChat.mute();
 muted=session.voiceChat.state!=='ACTIVE'||session.voiceChat.isMuted;ui();status(muted?'Microphone off. You can type a question.':'Microphone on. Speak, then pause for Buns to reply.');
 }catch{muted=true;ui();status('Microphone unavailable. Allow microphone access in your browser, or type a question.',true);}
};
$('sound').onclick=()=>{$('avatar-video').play().then(()=>{$('sound').hidden=true;}).catch(()=>status('Sound is blocked. Check this site’s sound permission.',true));};
window.addEventListener('pagehide',()=>void end());
window.addEventListener('message',event=>{if(event.origin===parentOrigin&&event.source===window.parent&&event.data?.type==='cat-avatar-stop')void end();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||busy))void end('Buns paused while you were away.');});
if(parentOrigin&&window.parent!==window&&typeof ResizeObserver!=='undefined')new ResizeObserver(()=>window.parent.postMessage({type:'cat-avatar-height',height:Math.ceil(document.querySelector('main').getBoundingClientRect().height)+8},parentOrigin)).observe(document.querySelector('main'));
ui();
