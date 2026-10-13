// Yotee conversation v2: browser speech + short-lived, in-memory conversational context.
const $ = id => document.getElementById(id);
const welcome = "Hello! I'm Yotee, your AI campus companion at Coastal Alabama Community College! Whether you're finding your way around college, exploring campus resources, or just looking for some encouragement, I'm here to help. What can we tackle together?";
const Recognizer = window.SpeechRecognition || window.webkitSpeechRecognition;
const history = [];
const voicePlayer = new Audio();
voicePlayer.preload = 'none';
let listening = null;
let utterance = null;
let busy = false;
let requestController = null;
let voiceController = null;
let audioUrl = null;
let voiceEpoch = 0;
let micPermissionError = false;
function status(message) { $('status').textContent = message; }
function add(role, message) {
  const item = document.createElement('div');
  item.className = 'bubble ' + role;
  item.textContent = message;
  $('messages').append(item);
  $('messages').scrollTop = $('messages').scrollHeight;
}
function talking(value) { $('scene').classList.toggle('talking', value); }
function stopSpeech() {
  voiceEpoch++;
  voiceController?.abort();
  voiceController = null;
  voicePlayer.pause();
  voicePlayer.removeAttribute('src');
  voicePlayer.load();
  if (audioUrl) URL.revokeObjectURL(audioUrl);
  audioUrl = null;
  talking(false);
}
async function say(message) {
  stopSpeech();
  const epoch = voiceEpoch;
  voiceController = new AbortController();
  status('Preparing Yotee’s voice…');
  try {
    const response = await fetch('/.netlify/functions/yotee-speech', {
      method: 'POST',
      headers: {'content-type':'application/json'},
      body: JSON.stringify({text:message.slice(0,1100)}),
      signal:voiceController.signal
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw Error(result.message || 'OpenAI voice is unavailable.');
    }
    const blob = await response.blob();
    if (epoch !== voiceEpoch) return;
    audioUrl = URL.createObjectURL(blob);
    voicePlayer.src = audioUrl;
    voicePlayer.onplaying = () => { if (epoch === voiceEpoch) { talking(true); status('Yotee is speaking…'); } };
    voicePlayer.onended = () => { if (epoch === voiceEpoch) { stopSpeech(); status('Ready for your next question.'); } };
    voicePlayer.onerror = () => { if (epoch === voiceEpoch) { stopSpeech(); status('Audio playback failed; the text is still available.'); } };
    await voicePlayer.play();
  } catch (error) {
    if (epoch !== voiceEpoch || error.name === 'AbortError') return;
    stopSpeech();
    status(error.message === 'Yotee’s OpenAI voice is not configured.' ?
      'OpenAI voice needs a server API key in Netlify. Written messages remain available.' :
      'Voice playback unavailable: ' + error.message);
  } finally {
    if (epoch === voiceEpoch) voiceController = null;
  }
}
function micState(active) {
  $('mic').setAttribute('aria-pressed', String(active));
  $('mic-label').textContent = active ? 'Stop listening' : 'Speak to Yotee';
}
function stopListening() {
  const active = listening;
  listening = null;
  micState(false);
  if (active) try { active.stop(); } catch {}
}
async function ask(question) {
  const q = String(question || '').trim().slice(0, 800);
  if (!q || busy) return;
  stopSpeech();
  stopListening();
  add('you', q);
  $('question').value = '';
  busy = true;
  $('send').disabled = true;
  $('mic').disabled = true;
  requestController = new AbortController();
  status('Yotee is thinking…');
  try {
    const response = await fetch('/.netlify/functions/yotee-chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q, history: history.slice(-10) }),
      signal: requestController.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(payload.message || 'Yotee could not connect to the AI service.'); error.status = response.status; throw error; }
    const answer = String(payload.answer || '').trim().slice(0, 1800);
    if (!answer) throw Error('The AI service returned an empty reply.');
    history.push({ role: 'user', content: q }, { role: 'assistant', content: answer });
    if (history.length > 10) history.splice(0, history.length - 10);
    add('yotee', answer);
    void say(answer);
  } catch (error) {
    if (error.name === 'AbortError') status('Request cancelled.');
    else {
      add('yotee', error.status === 503 ? 'My AI conversation service has not been connected yet. My welcome voice and animation are still available using Hear welcome.' : 'I cannot reach my AI conversation service right now. Please try again shortly.');
      status(error.message || 'Connection unavailable.');
    }
  } finally {
    busy = false;
    requestController = null;
    $('send').disabled = false;
    $('mic').disabled = !Recognizer;
  }
}
$('form').addEventListener('submit', event => { event.preventDefault(); void ask($('question').value); });
$('stop').addEventListener('click', () => { stopListening(); stopSpeech(); requestController?.abort(); status('Stopped.'); });
$('greet').addEventListener('click', () => { stopListening(); void say(welcome); });
add('yotee', welcome);
if (!Recognizer) {
  $('mic').disabled = true;
  $('mic').title = 'Voice input is unavailable in this browser. You can type questions.';
  status('Voice input is unavailable in this browser. Type a question to chat.');
} else {
  $('mic').addEventListener('click', () => {
    if (listening) { stopListening(); status('Listening stopped.'); return; }
    if (busy) return;
    stopSpeech();
    const recognition = new Recognizer();
    listening = recognition;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      if (listening !== recognition) return;
      const transcript = event.results?.[0]?.[0]?.transcript || '';
      stopListening();
      if (transcript) void ask(transcript);
      else status('I did not catch that. Try again or type your question.');
    };
    recognition.onerror = event => {
      if (listening !== recognition) return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') micPermissionError = true;
      stopListening();
      status('Microphone: ' + event.error + '. You can still type your question.');
    };
    recognition.onend = () => {
      if (listening === recognition) {
        listening = null; micState(false);
        if (!micPermissionError) status('Listening ended. Try again or type a question.');
      }
    };
    try {
      recognition.start();
      micState(true);
      status('Listening… ask Yotee your question.');
      micPermissionError = false;
    } catch {
      stopListening();
      status('Microphone could not start. Check browser permissions.');
    }
  });
}
window.addEventListener('pagehide', () => { stopListening(); stopSpeech(); requestController?.abort(); });
