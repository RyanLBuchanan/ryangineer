# Dave's talking cat surface
Routes: /cat-translator and /tools/cat-translator.html. The conversation iframe is /tools/cat-avatar/presenter.html. Existing meow analysis, saved personalization, photos and translator tools remain below it.
Animated Dave works immediately with contextual scripted replies, synthesized meows and browser speech synthesis. Typed replies remain usable without audio or microphone access. Dictation is opt-in and uses the browser's speech service. This is a playful companion, not literal meow translation.
The optional LiveAvatar FULL session uses the same SDK and bounded token/session lifecycle as Nowcast, but an independent endpoint and versioned cat prompt. Neither weather credentials nor Ridian configuration select a cat avatar.
## Live video configuration
Set in the Ryangineer Netlify environment, then redeploy:
- CAT_LIVEAVATAR_API_KEY: your LiveAvatar API key (may be the same account key, explicitly configured here).
- CAT_LIVEAVATAR_ID: a provider-supported cat avatar ID. A picture alone is not a LiveAvatar ID.
- NOWCAST_LIVEAVATAR_VOICE_ID: Dave shares Ryan's current Nowcast voice. This takes precedence. CAT_LIVEAVATAR_VOICE_ID is an optional fallback only when the Nowcast voice is absent.
- CAT_LIVEAVATAR_CONTEXT_ID: optional. When absent, the endpoint finds or creates Ryangineer Dave Cat Companion v1. Explicit contexts must exactly match the prompt in netlify/functions/_lib/cat-brain.mjs and use the opening_text placeholder ${briefing}.
- CAT_AVATAR_ENABLED=off: disables live video while animated Dave remains available.
No configuration values are placed in browser files. Native microphone/voice/video needs a real device check. LiveAvatar support for the desired cat must be confirmed in the provider account; this release does not create a provider avatar or assume animal support.
Sessions end after 120 seconds, on navigation, when the page is hidden, or when the original translator starts. Starting the cat surface stops the original translator to avoid competing microphones.
