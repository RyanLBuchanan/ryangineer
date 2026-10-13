const $=id=>document.getElementById(id);
const welcome="Hello, I'm Yotee, your AI campus companion! Welcome to Coastal Alabama Community College. Whether you're getting ready for your first day, looking for campus resources, or just need a little encouragement, I'm here to help you find your next step. What can we explore together?";
let busy=false,recognition=null,speaking=false,utterance=null;
const supportsSpeech='speechSynthesis' in window;
function status(message){$('status').textContent=message}
function add(role,message){const p=document.createElement('div');p.className='bubble '+role;p.textContent=message;$('messages').append(p);$('messages').scrollTop=$('messages').scrollHeight}
function animate(on){speaking=on;$('scene').classList.toggle('talking',on)}
function stopSpeech(){if(supportsSpeech)window.speechSynthesis.cancel();utterance=null;animate(false)}
function say(message){stopSpeech();if(!supportsSpeech){status('Speech playback is unavailable in this browser. The text is still visible.');return}const line=new SpeechSynthesisUtterance(message);line.rate=1.01;line.pitch=1.07;line.lang='en-US';utterance=line;line.onstart=()=>{if(utterance===line)animate(true)};line.onend=line.onerror=()=>{if(utterance===line){utterance=null;animate(false)}};window.speechSynthesis.speak(line)}
async function ask(question){if(busy)return;const q=question.trim().slice(0,800);if(!q)return;add('you',q);$('question').value='';busy=true;$('send').disabled=true;status('Yotee is thinking…');try{const response=await fetch('/.netlify/functions/yotee-chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({question:q})});const data=await response.json();if(!response.ok)throw Error(data.message||'AI response unavailable');const answer=String(data.answer||'').slice(0,1800);add('yotee',answer);say(answer);status('Yotee replied. Ask another question!')}catch(e){add('yotee','I can give you a welcome for now, but live AI answers have not been configured or are temporarily unavailable. Please try later.');status(e.message||'Unable to connect.')}finally{busy=false;$('send').disabled=false}}
$('form').addEventListener('submit',event=>{event.preventDefault();void ask($('question').value)});
$('stop').addEventListener('click',()=>{recognition?.stop();stopSpeech();$('mic').setAttribute('aria-pressed','false');status('Speech stopped.')});
$('greet').addEventListener('click',()=>say(welcome));
add('yotee',welcome);
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!Recognition){$('mic').disabled=true;$('mic').title='Speech recognition is not supported by this browser';status('Typing works here. Microphone input requires a compatible browser.')}
else{$('mic').addEventListener('click',()=>{if(recognition){recognition.stop();return}stopSpeech();const r=new Recognition();recognition=r;r.lang='en-US';r.interimResults=false;r.maxAlternatives=1;r.onresult=e=>{const q=e.results?.[0]?.[0]?.transcript||'';if(q)void ask(q)};r.onerror=e=>status('Microphone error: '+e.error+'. You can still type your question.');r.onend=()=>{if(recognition===r)recognition=null;$('mic').setAttribute('aria-pressed','false')};try{r.start();$('mic').setAttribute('aria-pressed','true');status('Listening… speak your question.')}catch{recognition=null;status('Could not start the microphone. Check browser permissions.')}})}
window.addEventListener('pagehide',()=>{recognition?.stop();stopSpeech()});
