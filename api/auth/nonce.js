// GET /api/auth/nonce
// Step 1 of SIWE: hand out a single-use nonce for the client to embed in the
// message it asks the wallet to sign. The nonce is what makes a captured
// signature useless a second time, so it must come from the server — a
// client-generated one would prove nothing.
//
// Also returns the `domain`/`uri` the client must build the message with. The
// client could read these off window.location, but then a message built for the
// wrong host would only fail at verify time; sending them makes the two sides
// agree by construction.
import { json } from '../_shared.js';
import { NONCE_TTL_SECONDS, issueNonce, requestHost } from '../_session.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  try {
    const nonce = await issueNonce();
    const host = requestHost(req);
    const scheme = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';

    // Never cached: a reused nonce is a replay window, and a CDN or browser
    // handing the same one to two sign-ins would break single-use.
    res.setHeader('cache-control', 'no-store');
    return json(res, 200, { nonce, domain: host, uri: `${scheme}://${host}`, ttlSeconds: NONCE_TTL_SECONDS });
  } catch (e) {
    return json(res, 502, { error: 'Could not issue a sign-in nonce', detail: e.message });
  }
}
