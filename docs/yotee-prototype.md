# Yotee animated assistant — independent prototype

Route: /tools/yote/ (direct file: /tools/yote/index.html). Separate from NowCast and Cat Translator. No edits to either existing app.

## What is ready
- Responsive standalone page and independently drawn SVG coyote, with mouth movement during speech, eye blink and idle movement.
- Welcome text, spoken playback via browser speech synthesis, microphone dictation where the browser supports SpeechRecognition, typed questions.
- Separate `/.netlify/functions/yotee-chat` AI endpoint using server-side OpenAI Responses API and an explicitly scoped character persona.
- AI unavailable? Show an explicit configuration error, never fabricate a successful AI conversation.

## Deployment configuration
In the Ryangineer Netlify site's **Environment variables**, configure `YOTEE_OPENAI_API_KEY` (server-only), optionally `YOTEE_OPENAI_MODEL` (default `gpt-4.1-mini`). No browser API key. Ensure the same variable is configured for deploy previews when preview testing.
No official college data or linked student records are connected. Do not enter FERPA-protected details, credentials or sensitive information.

## Acceptance
1. Navigate to /tools/yote/ on a Deploy Preview; original NowCast and Cat Translator still behave unchanged.
2. Click Hear welcome. The browser should audibly speak; check mute/autoplay permissions if not.
3. Click Speak to Yotee, grant microphone permission, say a question, and wait for a transcript and spoken reply. Speech recognition may be unsupported in some browsers; typing remains available.
4. Set the Netlify API key for the preview and test live answer, bad key, missing key and offline cases.
5. Verify small-screen layout, keyboard access and reduced-motion behavior.

This is an independent demo, not an approved CACC deployment. Current character artwork is an original placeholder derived from the user's creative direction, not official mascot art. Replace only after marketing/college authorization. Browser speech recognition may use third-party browser speech services; do not use with sensitive data. The character's mouth moves when speech starts; this is not phoneme lip sync.

## Phase 4: OpenAI voice and interface consistency

- The existing original cartoon is also used as the page's JPEG favicon and Apple touch icon; tiny browser tab renderings may crop the jersey.
- Voice is produced by a standalone `/.netlify/functions/yotee-speech` endpoint using OpenAI `gpt-4o-mini-tts`, `onyx` voice, MP3 playback, and audio-event driven mouth animation.
- The server-only `YOTEE_OPENAI_API_KEY` is **shared by this voice endpoint and the Yotee chat endpoint**. No second key is needed. A ChatGPT subscription alone does not include API credits; an API key with active billing is required.
- Buttons use consistent outlined SVG iconography (microphone, stop-square, play, send) and retain accessible text labels.
- This is OpenAI TTS, **not** low-latency OpenAI Realtime. Microphone transcription still depends on browser SpeechRecognition and remains push-to-talk.
- AI-generated spoken audio should be disclosed to users in the app. Avoid putting private student or employee information into the prototype.
- Run `node --test tests/unit/yotee-speech.test.mjs tests/unit/yotee-chat.test.mjs`. Verify actual audio on production/preview browsers after server configuration. No browser speech synthesis fallback is presented as if it were OpenAI voice.
