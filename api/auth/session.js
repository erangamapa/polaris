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
import { clearSessionCookie, getSessionAddress } from '../_session.js';

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method === 'DELETE') {
    clearSessionCookie(res, req);
    return json(res, 200, { address: null });
  }

  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  return json(res, 200, { address: getSessionAddress(req) });
}
