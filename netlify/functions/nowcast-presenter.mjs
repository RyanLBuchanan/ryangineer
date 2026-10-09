import { weatherSnapshot, WeatherError } from './_lib/nowcast-weather.mjs';
import { liveAvatarService } from './_lib/nowcast-liveavatar.mjs';

export const config = { rateLimit: { windowLimit: 6, windowSize: 60, aggregateBy: ['ip'], action: 'rate_limit' } };
const headers = { 'content-type': 'application/json', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer' };
const json = (status, data) => new Response(JSON.stringify(data), { status, headers });
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
async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024) { await reader.cancel(); throw new WeatherError('Request is too large.', 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
export function createHandler({ getWeather = weatherSnapshot, mintSession = liveAvatarService(), env = process.env } = {}) {
  // Extra per-instance cap; Netlify enforces the cross-instance IP limit above.
  let starts = [];
  return async function handler(request) {
    if (request.method !== 'POST') return json(405, { message: 'Use POST.' });
    if (!allowedOrigin(request, env)) return json(403, { message: 'Open the weather presenter through Nowcast.' });
    if (Number(request.headers.get('content-length')) > 1024) return json(413, { message: 'Request is too large.' });
    try {
      let input;
      try { input = JSON.parse(await boundedBody(request)); }
      catch (error) { if (error instanceof WeatherError) throw error; return json(400, { message: 'Choose a valid Nowcast location.' }); }
      if (!input || !['briefing', 'start'].includes(input.action)) return json(400, { message: 'Choose briefing or start.' });
      if (input.action === 'start') {
        if (/^(0|false|off)$/i.test(env.NOWCAST_AVATAR_ENABLED || '')) return json(503, { message: 'The weather avatar is temporarily paused. You can still read the briefing.' });
        const now = Date.now();
        starts = starts.filter(time => now - time < 3600000);
        if (starts.length >= 25 || starts.filter(time => now - time < 60000).length >= 5) return json(429, { message: 'The weather presenter is busy. Please try again shortly.' });
        starts.push(now);
      }
      const snapshot = await getWeather(input);
      const { variables, ...weather } = snapshot;
      if (input.action === 'briefing') return json(200, { weather });
      const session = await mintSession(snapshot, env);
      return json(200, { ...session, weather });
    } catch (error) {
      return json(error instanceof WeatherError ? error.status : 502, { message: error instanceof WeatherError ? error.message : 'The weather presenter is temporarily unavailable. Your regular forecast and maps are still available.' });
    }
  };
}
export default createHandler();
