// GET    /api/auth/session  -> { address } or { address: null }
// DELETE /api/auth/session  -> clears the cookie
//
// Lets the client find out whether it already has a valid session WITHOUT
// prompting the wallet. This is what keeps the app free of a login gate: on
// load it asks this route, and if a session is already live, settings sync
// silently. Only a player who has never signed (or whose 30 days elapsed) is
// ever shown a signature prompt, and even then not until they change something.
//
// DELETE is the honest limit of a stateless session: it clears the browser's
// cookie, which is all a client-side sign-out can do. It does not invalidate
// the token server-side — see api/_session.js for why that trade was made and
// what it does not cover.
import { json } from '../_shared.js';
import { isPersistent } from '../_kv.js';
import { clearSessionCookie, getSessionAddress } from '../_session.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method === 'DELETE') {
    clearSessionCookie(res, req);
    return json(res, 200, { address: null });
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  // `sessionsAvailable` tells the client whether signing in can actually
  // SUCCEED on this deployment, so it never raises a wallet prompt that is
  // doomed before it starts.
  //
  // With no Upstash configured, storage falls back to a per-process Map (see
  // api/_kv.js) — and SIWE nonces are the one thing that fallback cannot hold,
  // because /api/auth/nonce and /api/auth/verify are SEPARATE serverless
  // functions with separate memory. The nonce is written by one and looked up
  // by the other, so it is never found and every sign-in 401s. That is not a
  // durability problem that degrades gracefully; sign-in is simply impossible
  // until a shared store exists, and the honest thing is to say so up front
  // rather than let a player sign a message for nothing.
  return json(res, 200, { address: getSessionAddress(req), sessionsAvailable: isPersistent });
}
