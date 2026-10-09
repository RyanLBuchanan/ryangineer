# Independent Nowcast weather presenter

Nowcast opens with the presenter at **https://www.ryangineer.com/tools/nowcast.html**. The forecast, radar, Earth tracker and family tools remain on that page. The presenter frame is `/tools/nowcast/presenter.html` on the same origin; the backend is `/.netlify/functions/nowcast-presenter` on the same deployment. Its portrait, styles, browser module, weather fetcher, prompt and provider session code all belong to this repository. There is no Ridian deployment, API, retrieval corpus, provider guard, environment-variable fallback or Momentum Coach runtime dependency. The original test was used as a design/asset reference only.

## Dedicated configuration

Set server-only variables in the **Ryangineer Netlify project**, including the Deploy Previews context for testing:

- `NOWCAST_LIVEAVATAR_API_KEY`: a LiveAvatar API key for Nowcast. Do not copy any Ridian environment configuration automatically.
- `NOWCAST_LIVEAVATAR_ID`: the chosen LiveAvatar avatar ID.
- `NOWCAST_LIVEAVATAR_VOICE_ID`: the chosen LiveAvatar voice ID (not an ElevenLabs ID). Select the voice already connected to the original test if Ryan wants the same sound.
- Optional `NOWCAST_LIVEAVATAR_CONTEXT_ID`: an exact matching Nowcast context; leave unset to create/reuse **Ryangineer Nowcast weather presenter v1** automatically on the first explicit start.
- Optional `NOWCAST_AVATAR_ENABLED=false`: pauses avatar starts while preserving read-only briefings.

No key is embedded in the browser, committed, or copied from Ridian. The provider context stores reusable weather instructions and `${variable}` placeholders only. It never changes a Momentum Coach context. A separate LiveAvatar workspace/key can provide account-level separation as well; same website hosting does not imply provider-account separation.

## Behavior and boundaries

Pinned `@heygen/liveavatar-web-sdk@0.0.19` uses FULL mode: HeyGen manages listening, reasoning and the selected voice. An explicit start fetches fresh NWS point forecasts, hourly periods, alerts, station observations and NHC advisory positions, then provides bounded dynamic variables to a two-minute session. It gives a local briefing and asks about plans. Loading the page or choosing **Read briefing** starts no LiveAvatar session and needs no provider credentials.

Weather snapshots remain fixed during a session. Restart for fresh weather. Missing or stale feeds stay unknown; warning-fetch failure is never an all-clear. NWS coverage is required. Route-wide traffic/weather, beach flags, marine forecasts and evacuation orders are not supplied and cannot be verified by the avatar. Each provider variable is at most 1000 characters.

End, hide, forecast bypass, place changes and backgrounding stop the session. Microphone mute, browser audio unlock, a bounded in-memory transcript and typed questions are available. Nowcast adds no conversation database or cross-session memory. LiveAvatar processes the selected coordinates, weather and active conversation under its own policies.

The endpoint rejects missing/foreign origins, invalid coordinates, unsupported actions and bodies over 1024 bytes (including streamed bodies without Content-Length). Netlify applies an IP limit of six requests/minute. An additional warm-instance cap permits five starts/minute and 25/hour; that secondary cap is not a global cross-instance budget. Session tokens stay in frame memory. Weather server fetches use fixed/allowlisted HTTPS hosts with redirects rejected.

## Validation and release

Run `node --test tools/nowcast-*.test.mjs tests/unit/nowcast-presenter.test.mjs` (30 tests), then `cd site && npm run build && node postbuild.mjs`. Bundle the endpoint with esbuild. Netlify must build and serve the same-origin presenter assets and endpoint.

Acceptance includes fresh briefing, actual avatar sound/listening, typed reply, microphone allow/deny, mute/end, location switching during startup, background shutdown, warning expansion, forecast bypass, existing maps and phone layout. Mocked provider tests do not establish live sound/listening. Ryangineer provider credentials have not been configured by this change, so live conversation acceptance remains pending.

PR #19 is the only implementation/release dependency. The former Ridian PR #127 is closed and was never merged. Neither production site was changed by the draft work. Release requires Ryan's approval, followed by production verification at the existing Nowcast URL.

Provider references: https://docs.liveavatar.com/api-reference/sessions/create-session-token and https://docs.liveavatar.com/docs/full-mode/events.
