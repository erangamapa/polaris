// Same-origin proxy for the SX Bet API. SX's API returns no
// Access-Control-Allow-Origin header, so the browser blocks direct calls and
// the sports UI renders empty. The client calls /api/sx?endpoint=<path>&...;
// this function forwards to SX server-side (no CORS). A single query-param
// endpoint (not a [...path] catch-all) so routing is unambiguous. No keys live
// here — the bettor's signature travels in the POST body for order fills.
const SX_BASE = process.env.SX_API_BASE || 'https://api.toronto.sx.bet';

export default async function handler(req, res) {
  const { endpoint = '', ...params } = req.query;
  const url = new URL(`${SX_BASE}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, Array.isArray(v) ? v.join(',') : v);
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
    if (req.method === 'GET') res.setHeader('cache-control', 'public, max-age=5');
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: 'SX proxy failed', detail: e.message });
  }
}
