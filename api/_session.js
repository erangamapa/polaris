// Session + SIWE nonce handling for the settings API.
//
// THE PROBLEM THIS SOLVES: there is no login screen in this app and no
// password to check — the wallet is the identity. But /api/settings still has
// to know a request genuinely belongs to the address it claims, or any player's
// settings could be read and overwritten by anyone who knows their wallet
// address (which, on a public chain, is everyone). SIWE supplies the one-time
// proof; this file turns that proof into a session so the player is never asked
// to sign again for weeks.
//
// STATELESS SESSIONS, ON PURPOSE: the cookie carries `address.expiry.hmac` and
// is verified by recomputing the HMAC — no storage read on the hot path, which
// suits serverless (a settings GET costs one Redis call, not two). The tradeoff
// is that individual sessions cannot be revoked server-side before they expire;
// signing out clears the cookie on the client. That is an acceptable trade for
// display preferences and limit settings, and the 30-day expiry bounds it. It
// would NOT be acceptable if these cookies ever authorised moving funds — they
// do not, and the SIWE statement the player signs says so explicitly.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getDel, setEx } from './_kv.js';

export const SESSION_COOKIE = 'tribet_sid';
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

// How long a player has to approve the wallet prompt before the nonce dies.
export const NONCE_TTL_SECONDS = 5 * 60;

// How old a signed message may be when it arrives. Deliberately tighter than
// the message's own expiry so a signature captured from a browser session
// cannot be replayed later even if its nonce were somehow still live.
export const SIWE_MAX_AGE_MS = 5 * 60 * 1000;

// A missing SESSION_SECRET must never mean "accept unsigned cookies" — that
// would be a trivially forgeable session. Instead each process invents its own
// ephemeral secret: local development works with no configuration at all, and
// the only consequence is that sessions do not survive a restart (or span
// serverless instances). Configuring SESSION_SECRET is what makes them durable.
const CONFIGURED_SECRET = process.env.SESSION_SECRET || '';
export const hasConfiguredSecret = Boolean(CONFIGURED_SECRET);
const SECRET = CONFIGURED_SECRET || randomBytes(32).toString('hex');

const sign = (payload) => createHmac('sha256', SECRET).update(payload).digest('base64url');

// Constant-time comparison so a forged cookie cannot be refined byte-by-byte
// from response-timing differences.
function signatureMatches(expected, actual) {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function parseCookies(req) {
  const header = req.headers?.cookie;
  if (!header) return {};
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export function createSessionToken(address, nowMs) {
  const expiresAt = nowMs + SESSION_TTL_SECONDS * 1000;
  const payload = `${address.toLowerCase()}.${expiresAt}`;
  return `${payload}.${sign(payload)}`;
}

// Returns the session's address, or null for anything that is not a currently
// valid token. Never throws and never explains why — the caller only ever needs
// "who is this, if anyone".
export function readSessionToken(token, nowMs) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [address, expiresRaw, signature] = parts;
  if (!/^0x[a-f0-9]{40}$/.test(address)) return null;

  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs) return null;
  if (!signatureMatches(sign(`${address}.${expiresRaw}`), signature)) return null;

  return address;
}

export function getSessionAddress(req, nowMs = Date.now()) {
  return readSessionToken(parseCookies(req)[SESSION_COOKIE], nowMs);
}

// `secure` is omitted on localhost because a Secure cookie is dropped over
// plain http — which would silently break the whole flow in local development
// while looking like an auth bug.
function cookieAttributes(req, maxAge) {
  const host = requestHost(req);
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
  return [
    `Path=/`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    isLocal ? null : 'Secure',
  ].filter(Boolean).join('; ');
}

export function setSessionCookie(res, req, token) {
  res.setHeader('set-cookie', `${SESSION_COOKIE}=${token}; ${cookieAttributes(req, SESSION_TTL_SECONDS)}`);
}

export function clearSessionCookie(res, req) {
  res.setHeader('set-cookie', `${SESSION_COOKIE}=; ${cookieAttributes(req, 0)}`);
}

// The host the browser actually addressed, which is what a SIWE message's
// `domain` must match. Behind Vercel's proxy the original host is in
// x-forwarded-host; `host` alone would be the internal one and every signature
// would fail domain validation.
export function requestHost(req) {
  const forwarded = req.headers?.['x-forwarded-host'];
  const host = forwarded || req.headers?.host || 'localhost';
  return Array.isArray(host) ? host[0] : host;
}

const nonceKey = (nonce) => `siwe:nonce:${nonce}`;

export async function issueNonce() {
  // 24 hex characters — comfortably past EIP-4361's 8-alphanumeric minimum,
  // and unguessable.
  const nonce = randomBytes(12).toString('hex');
  await setEx(nonceKey(nonce), '1', NONCE_TTL_SECONDS);
  return nonce;
}

// Single-use by construction: GETDEL means a nonce is valid exactly once, so
// re-submitting a captured signature finds nothing and is rejected.
export async function consumeNonce(nonce) {
  if (typeof nonce !== 'string' || nonce.length === 0) return false;
  const found = await getDel(nonceKey(nonce));
  return found !== null;
}
