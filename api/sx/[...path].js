// Same-origin proxy for the SX Bet API. SX's API does not return an
// Access-Control-Allow-Origin header, so browsers block direct cross-origin
// reads/writes from the app. Routing every SX call through this function
// (same origin as the app) sidesteps CORS entirely. Read-only + the signed
// order-fill POST are forwarded verbatim; no keys live here (the bettor's
// signature travels in the body).
const SX_BASE = process.env.SX_API_BASE || 'https://api.toronto.sx.bet';

export default async function handler(req, res) {
  const parts = req.query.path;
  const path = Array.isArray(parts) ? parts.join('/') : parts || '';
  const url = new URL(`${SX_BASE}/${path}`);
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue;
    if (Array.isArray(v)) v.forEach((val) => url.searchParams.append(k, val));
    else url.searchParams.set(k, v);
  }

  const init = { method: req.method, headers: { 'content-type': 'application/json' } };
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(url, init);
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
    // Short cache for the read endpoints keeps the order book snappy without
    // hammering SX; the fill POST is never cached (non-GET).
    if (req.method === 'GET') res.setHeader('cache-control', 'public, max-age=5');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'SX proxy failed', detail: e.message });
  }
}
