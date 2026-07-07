/* ============================================================
   yongshanOS · WALL WORKER — the worldwide selfie wall backend
   ============================================================
   design notes, written down so they never drift:
   · KV-only architecture: photo bytes live as binary KV values,
     the timestamp rides in KV *metadata*, and key names embed an
     INVERTED timestamp so a plain lexicographic list() returns
     newest-first with zero index bookkeeping.
   · privacy: no raw IPs are ever stored — rate-limit keys are
     salted SHA-256 hashes with a 1h TTL. no cookies, no accounts.
   · abuse posture: strict CORS allow-list, JPEG-only with magic-
     byte checks (FF D8 FF … FF D9), 130KB cap, 5 uploads/hour/IP,
     a hard wall cap, an owner kill-switch, and owner delete.
   · performance: wall listings are edge-cached 30s; photo bytes
     are immutable (cache-control: max-age=31536000). */

const ALLOW_ORIGINS = [
  'https://yyswhsccc.github.io',
  'http://localhost:8642',
  'http://127.0.0.1:8642'
];
const MAX_BYTES = 130 * 1024;   // one framed selfie, comfortably
const PAGE_SIZE = 24;
const RATE_MAX = 5;             // uploads / hour / visitor
const WALL_CAP = 600;           // the wall is big. not infinite.

function corsHeaders(req) {
  const origin = req.headers.get('Origin') || '';
  const ok = ALLOW_ORIGINS.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : ALLOW_ORIGINS[0],
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(req, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(req) }
  });
}
async function ipHash(req, env) {
  const ip = req.headers.get('CF-Connecting-IP') || 'unknown';
  const data = new TextEncoder().encode(ip + '|' + (env.SALT || 'meadow'));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function isJpeg(bytes) {
  return bytes.length > 4 &&
    bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF &&
    bytes[bytes.length - 2] === 0xFF && bytes[bytes.length - 1] === 0xD9;
}
function newId() {
  // inverted-timestamp key: lexicographic ascending = newest first
  const inv = String(1e13 - Date.now()).padStart(13, '0');
  const rand = crypto.getRandomValues(new Uint8Array(4));
  return inv + '-' + [...rand].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function isAdmin(req, env) {
  const auth = req.headers.get('Authorization') || '';
  return env.ADMIN_SECRET && auth === 'Bearer ' + env.ADMIN_SECRET;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    /* ---- GET /health — count, freeze state, a heartbeat ---- */
    if (req.method === 'GET' && path === '/health') {
      const count = parseInt(await env.WALL.get('cfg:count') || '0', 10);
      const frozen = (await env.WALL.get('cfg:frozen')) === '1';
      return json(req, 200, { ok: true, count, cap: WALL_CAP, frozen });
    }

    /* ---- GET /wall — newest-first listing, edge-cached 30s ---- */
    if (req.method === 'GET' && path === '/wall') {
      const cacheKey = new Request(url.toString(), req);
      const cached = await caches.default.match(cacheKey);
      if (cached) {
        const res = new Response(cached.body, cached);
        Object.entries(corsHeaders(req)).forEach(([k, v]) => res.headers.set(k, v));
        return res;
      }
      const cursor = url.searchParams.get('cursor') || undefined;
      const list = await env.WALL.list({ prefix: 'p:', limit: PAGE_SIZE, cursor });
      const photos = list.keys.map((k) => ({
        id: k.name.slice(2),
        t: (k.metadata && k.metadata.t) || null
      }));
      const body = { photos, cursor: list.list_complete ? null : list.cursor };
      const res = json(req, 200, body);
      res.headers.set('Cache-Control', 'public, s-maxage=30');
      ctx.waitUntil(caches.default.put(cacheKey, res.clone()));
      return res;
    }

    /* ---- GET /photo/<id> — immutable JPEG bytes ---- */
    if (req.method === 'GET' && path.startsWith('/photo/')) {
      const id = path.slice(7);
      if (!/^[0-9a-f-]{10,40}$/.test(id)) return json(req, 400, { error: 'bad id' });
      const bytes = await env.WALL.get('p:' + id, { type: 'arrayBuffer' });
      if (!bytes) return json(req, 404, { error: 'not on the wall' });
      return new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
          ...corsHeaders(req)
        }
      });
    }

    /* ---- POST /wall — hang a selfie (guarded seven ways) ---- */
    if (req.method === 'POST' && path === '/wall') {
      if ((await env.WALL.get('cfg:frozen')) === '1') {
        return json(req, 503, { error: 'the wall is frozen — try again another day ♡' });
      }
      const who = await ipHash(req, env);
      const rlKey = 'rl:' + who;
      const used = parseInt(await env.WALL.get(rlKey) || '0', 10);
      if (used >= RATE_MAX) {
        return json(req, 429, { error: 'the wall loves you but needs a breather (5/hour)' });
      }
      const count = parseInt(await env.WALL.get('cfg:count') || '0', 10);
      if (count >= WALL_CAP) {
        return json(req, 507, { error: 'the wall is FULL. a museum. try again after curation ♡' });
      }
      let payload;
      try { payload = await req.json(); } catch (e) { return json(req, 400, { error: 'json only' }); }
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(payload && payload.img || '');
      if (!m) return json(req, 400, { error: 'jpeg dataURL only' });
      let bytes;
      try { bytes = Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0)); }
      catch (e) { return json(req, 400, { error: 'bad base64' }); }
      if (bytes.length > MAX_BYTES) return json(req, 413, { error: 'too large (130KB max)' });
      if (!isJpeg(bytes)) return json(req, 415, { error: 'that is not a real JPEG' });
      const id = newId();
      const t = new Date().toISOString().slice(0, 16).replace('T', ' ');
      await env.WALL.put('p:' + id, bytes.buffer, { metadata: { t } });
      await env.WALL.put(rlKey, String(used + 1), { expirationTtl: 3600 });
      await env.WALL.put('cfg:count', String(count + 1));
      return json(req, 200, { ok: true, id, n: count + 1 });
    }

    /* ---- owner tools: delete / freeze / thaw ---- */
    if (req.method === 'DELETE' && path.startsWith('/photo/')) {
      if (!isAdmin(req, env)) return json(req, 401, { error: 'the wall knows its owner' });
      const id = path.slice(7);
      await env.WALL.delete('p:' + id);
      const count = parseInt(await env.WALL.get('cfg:count') || '1', 10);
      await env.WALL.put('cfg:count', String(Math.max(0, count - 1)));
      return json(req, 200, { ok: true });
    }
    if (req.method === 'POST' && (path === '/admin/freeze' || path === '/admin/thaw')) {
      if (!isAdmin(req, env)) return json(req, 401, { error: 'the wall knows its owner' });
      await env.WALL.put('cfg:frozen', path.endsWith('freeze') ? '1' : '0');
      return json(req, 200, { ok: true, frozen: path.endsWith('freeze') });
    }

    return json(req, 404, { error: 'this hallway has exactly five doors' });
  }
};
