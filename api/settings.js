// GET /api/settings  -> { envelope, persistent }
// PUT /api/settings  -> { envelope, persistent }   body: { data: <settings> }
//
// One blob per player, keyed by the wallet address proven by the session cookie
// (see api/auth/verify.js). The address is NEVER read from the query string or
// the body — that is the whole point of the session. Taking it from the request
// would mean anyone could read or overwrite any wallet's settings by typing an
// address, and wallet addresses are public information.
import { json } from './_shared.js';
import { get, isPersistent, set } from './_kv.js';
import { getSessionAddress } from './_session.js';
import { SETTINGS_VERSION, createEnvelope, normalizeSettings } from '../packages/shared/playerSettings.js';

const key = (address) => `settings:v${SETTINGS_VERSION}:${address}`;

// An absent blob is a valid state (a player who has never saved anything), not
// an error — it returns the empty envelope, whose updatedAt of 0 loses every
// merge against any real local save (see mergeEnvelopes in playerSettings.js).
const EMPTY = createEnvelope({}, 0);

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  const address = getSessionAddress(req);
  // 401 here is routine, not exceptional: it is exactly what the client gets
  // before the player has ever signed, and it is the signal that prompts the
  // one wallet signature (see src/lib/usePlayerSettings.jsx).
  if (!address) return json(res, 401, { error: 'Sign-in required' });

  if (req.method === 'GET') {
    try {
      const raw = await get(key(address));
      const stored = raw ? JSON.parse(raw) : null;
      // Normalised on the way OUT as well as in: a blob written by an older
      // build of this app must not be able to hand the UI a shape it no longer
      // understands.
      return json(res, 200, { envelope: stored ? createEnvelope(stored.data, stored.updatedAt) : EMPTY, persistent: isPersistent });
    } catch {
      return json(res, 502, { error: 'Could not read settings' });
    }
  }

  if (req.method === 'PUT') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
    }

    // The server stamps the time rather than trusting the client's. One clock
    // governs every device, so a player whose laptop clock is days behind can
    // still save — with a client-supplied timestamp, their writes would lose
    // every merge and appear to silently do nothing.
    const envelope = createEnvelope(normalizeSettings(body?.data), Date.now());

    try {
      await set(key(address), JSON.stringify(envelope));
    } catch {
      // Never report a save that did not happen — the client keeps its local
      // copy and shows the player that syncing failed.
      return json(res, 502, { error: 'Could not save settings' });
    }

    return json(res, 200, { envelope, persistent: isPersistent });
  }

  return json(res, 405, { error: 'Method not allowed' });
}
