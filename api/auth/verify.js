// POST /api/auth/verify   { message, signature }
// Step 2 of SIWE: check the signed message, then issue the session cookie that
// stands in for it from here on. This is the only place in the app where a
// wallet proves ownership of an address.
//
// Order of checks matters and is deliberate: shape, then context, then the
// nonce, then the (comparatively expensive) cryptography. A malformed or
// wrong-domain message is rejected without ever recovering a signer.
import { verifyMessage as verifyEoaMessage, recoverMessageAddress } from 'viem';
import { casinoClient, json } from '../_shared.js';
import { parseSiweMessage, verifySiweFields } from '../../packages/shared/siwe.js';
import {
  SIWE_MAX_AGE_MS,
  consumeNonce,
  createSessionToken,
  requestHost,
  setSessionCookie,
} from '../_session.js';

// Every rejection returns the same opaque 401 body. The `reason` from
// verifySiweFields is useful in a server log but not to the caller: telling an
// attacker whether their message failed on domain, nonce or freshness hands
// them a tuning signal for free.
const REJECTED = { error: 'Sign-in could not be verified' };

// EOA signatures verify with pure cryptography and no network call, which
// covers essentially every wallet this app sees. Smart-contract accounts
// (ERC-1271) cannot be verified that way — their signature is validated by
// their own contract — so those fall through to the public-client path, which
// does make an RPC call. Trying the cheap path first means the common case
// costs nothing and the uncommon case still works.
async function signerOwnsMessage({ address, message, signature }) {
  try {
    const recovered = await recoverMessageAddress({ message, signature });
    if (recovered.toLowerCase() === address.toLowerCase()) return true;
  } catch {
    // Malformed signature bytes — fall through; the checks below will fail too.
  }

  try {
    if (await verifyEoaMessage({ address, message, signature })) return true;
  } catch {
    /* not an EOA signature */
  }

  try {
    return await casinoClient.verifyMessage({ address, message, signature });
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
  }

  const message = body?.message;
  const signature = body?.signature;
  if (typeof message !== 'string' || typeof signature !== 'string') {
    return json(res, 400, { error: 'message and signature are required' });
  }

  // No `nonce` passed on purpose — single-use is enforced against the store
  // below, which is a stronger check than string equality (see siwe.js).
  const parsed = parseSiweMessage(message);
  const fields = verifySiweFields(parsed, {
    domain: requestHost(req),
    now: Date.now(),
    maxAgeMs: SIWE_MAX_AGE_MS,
  });
  if (!fields.ok) return json(res, 401, REJECTED);

  // Single-use check happens BEFORE signature recovery so a flood of replayed
  // signatures is cheap to reject, and so a nonce is spent exactly once even
  // when two requests race (GETDEL is atomic — see api/_kv.js).
  if (!(await consumeNonce(parsed.nonce))) return json(res, 401, REJECTED);

  if (!(await signerOwnsMessage({ address: parsed.address, message, signature }))) {
    return json(res, 401, REJECTED);
  }

  const address = parsed.address.toLowerCase();
  setSessionCookie(res, req, createSessionToken(address, Date.now()));
  res.setHeader('cache-control', 'no-store');
  return json(res, 200, { address });
}
