import { describe, it, expect } from 'vitest';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken, getSessionAddress, parseCookies, readSessionToken, requestHost } from './_session.js';

// The session cookie is the credential that stands in for a wallet signature
// for 30 days, so these tests are about forgery and expiry rather than the
// happy path. They run against whatever secret the process holds (an ephemeral
// one when SESSION_SECRET is unset — see _session.js), which is fine: every
// assertion here is about sign/verify being consistent with ITSELF and
// rejecting anything it did not produce.
const ADDRESS = '0xabcdef0123456789abcdef0123456789abcdef01';
const NOW = Date.parse('2026-07-30T12:00:00.000Z');

describe('session tokens', () => {
  it('round-trips the address it was issued for', () => {
    const token = createSessionToken(ADDRESS, NOW);
    expect(readSessionToken(token, NOW)).toBe(ADDRESS);
  });

  it('lowercases the address so storage keys never fork on casing', () => {
    const token = createSessionToken('0xABCDEF0123456789ABCDEF0123456789ABCDEF01', NOW);
    expect(readSessionToken(token, NOW)).toBe(ADDRESS);
  });

  it('expires exactly at its stated lifetime', () => {
    const token = createSessionToken(ADDRESS, NOW);
    const expiry = NOW + SESSION_TTL_SECONDS * 1000;
    expect(readSessionToken(token, expiry - 1)).toBe(ADDRESS);
    expect(readSessionToken(token, expiry)).toBeNull();
  });

  // The forgery cases: each of these is a token an attacker could construct
  // without knowing the secret, and each must be refused.
  it('rejects a token whose address was swapped', () => {
    const token = createSessionToken(ADDRESS, NOW);
    const [, expires, signature] = token.split('.');
    const forged = `0x1111111111111111111111111111111111111111.${expires}.${signature}`;
    expect(readSessionToken(forged, NOW)).toBeNull();
  });

  it('rejects a token whose expiry was extended', () => {
    const token = createSessionToken(ADDRESS, NOW);
    const [address, expires, signature] = token.split('.');
    expect(readSessionToken(`${address}.${Number(expires) + 60_000}.${signature}`, NOW)).toBeNull();
  });

  it('rejects an unsigned or garbage token', () => {
    expect(readSessionToken(`${ADDRESS}.${NOW + 1000}`, NOW)).toBeNull();
    expect(readSessionToken(`${ADDRESS}.${NOW + 1000}.`, NOW)).toBeNull();
    expect(readSessionToken('nonsense', NOW)).toBeNull();
    expect(readSessionToken('', NOW)).toBeNull();
    expect(readSessionToken(undefined, NOW)).toBeNull();
    expect(readSessionToken(null, NOW)).toBeNull();
  });

  it('rejects a malformed address even when correctly signed', () => {
    // A signature over a non-address payload is genuinely valid HMAC, so the
    // address-shape check is what stops it being accepted as a session.
    expect(readSessionToken(createSessionToken('0xshort', NOW), NOW)).toBeNull();
  });
});

describe('parseCookies', () => {
  it('reads a named cookie out of a multi-cookie header', () => {
    const cookies = parseCookies({ headers: { cookie: `a=1; ${SESSION_COOKIE}=token-value; b=2` } });
    expect(cookies[SESSION_COOKIE]).toBe('token-value');
  });

  it('url-decodes values and tolerates a missing or malformed header', () => {
    expect(parseCookies({ headers: { cookie: 'x=a%20b' } }).x).toBe('a b');
    expect(parseCookies({ headers: {} })).toEqual({});
    expect(parseCookies({})).toEqual({});
    expect(parseCookies({ headers: { cookie: '=novalue; junk' } })).toEqual({});
  });
});

describe('getSessionAddress', () => {
  it('returns the address for a live cookie and null otherwise', () => {
    const token = createSessionToken(ADDRESS, NOW);
    expect(getSessionAddress({ headers: { cookie: `${SESSION_COOKIE}=${token}` } }, NOW)).toBe(ADDRESS);
    expect(getSessionAddress({ headers: { cookie: 'other=1' } }, NOW)).toBeNull();
    expect(getSessionAddress({ headers: {} }, NOW)).toBeNull();
  });
});

// SIWE messages are bound to a domain, and behind Vercel's proxy the original
// host only survives in x-forwarded-host — reading `host` alone would make
// every signature fail domain validation in production.
describe('requestHost', () => {
  it('prefers x-forwarded-host over host', () => {
    expect(requestHost({ headers: { 'x-forwarded-host': 'tribet-app.vercel.app', host: 'internal:3000' } })).toBe('tribet-app.vercel.app');
    expect(requestHost({ headers: { host: 'localhost:5173' } })).toBe('localhost:5173');
    expect(requestHost({ headers: {} })).toBe('localhost');
  });

  it('takes the first value when a proxy sends the header twice', () => {
    expect(requestHost({ headers: { 'x-forwarded-host': ['a.example', 'b.example'] } })).toBe('a.example');
  });
});
