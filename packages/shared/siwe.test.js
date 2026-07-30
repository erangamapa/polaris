import { describe, it, expect } from 'vitest';
import { SIWE_STATEMENT, buildSiweMessage, isValidNonce, parseSiweMessage, verifySiweFields } from './siwe.js';

// SIWE is the only thing standing between "settings belong to this wallet" and
// "anyone can read or overwrite any wallet's settings", so these tests lean
// hard on the rejection paths: a parser that is lenient about a message this
// app did not build is a parser that accepts a forged one.
const ADDRESS = '0x1111111111111111111111111111111111111111';
const NONCE = 'abc12345xyz';
const ISSUED = Date.parse('2026-07-30T10:00:00.000Z');
const EXPIRES = ISSUED + 600_000;

const base = { domain: 'tribet-app.vercel.app', address: ADDRESS, uri: 'https://tribet-app.vercel.app', chainId: 84532, nonce: NONCE, issuedAt: ISSUED, expiresAt: EXPIRES };

describe('buildSiweMessage', () => {
  it('produces the EIP-4361 layout', () => {
    expect(buildSiweMessage(base)).toBe([
      'tribet-app.vercel.app wants you to sign in with your Ethereum account:',
      ADDRESS,
      '',
      SIWE_STATEMENT,
      '',
      'URI: https://tribet-app.vercel.app',
      'Version: 1',
      'Chain ID: 84532',
      `Nonce: ${NONCE}`,
      'Issued At: 2026-07-30T10:00:00.000Z',
      'Expiration Time: 2026-07-30T10:10:00.000Z',
    ].join('\n'));
  });

  // The statement is what the player actually reads in the wallet popup, so it
  // is pinned: it must keep saying the signature authorises no transaction.
  it('states that no funds movement is authorised', () => {
    expect(SIWE_STATEMENT).toMatch(/does not authorise any transaction or transfer of funds/);
  });

  it('refuses to build from invalid input', () => {
    expect(() => buildSiweMessage({ ...base, address: '0xnope' })).toThrow(/address/);
    expect(() => buildSiweMessage({ ...base, domain: '' })).toThrow(/domain/);
    expect(() => buildSiweMessage({ ...base, nonce: 'short' })).toThrow(/nonce/);
    expect(() => buildSiweMessage({ ...base, chainId: 1.5 })).toThrow(/chainId/);
  });
});

describe('parseSiweMessage', () => {
  it('round-trips a built message', () => {
    const parsed = parseSiweMessage(buildSiweMessage(base));
    expect(parsed).toMatchObject({ ok: true, domain: base.domain, address: ADDRESS, nonce: NONCE, chainId: 84532, issuedAt: ISSUED, expiresAt: EXPIRES });
  });

  it('rejects empty, truncated and padded messages', () => {
    expect(parseSiweMessage('').ok).toBe(false);
    expect(parseSiweMessage(null).ok).toBe(false);
    expect(parseSiweMessage('hello').reason).toBe('unexpected-line-count');
    expect(parseSiweMessage(`${buildSiweMessage(base)}\nResources:`).reason).toBe('unexpected-line-count');
  });

  it('rejects a shuffled field order', () => {
    const lines = buildSiweMessage(base).split('\n');
    [lines[5], lines[6]] = [lines[6], lines[5]];
    expect(parseSiweMessage(lines.join('\n')).reason).toBe('bad-field:URI');
  });

  it('rejects a malformed header, address, version and nonce', () => {
    const swap = (index, value) => {
      const lines = buildSiweMessage(base).split('\n');
      lines[index] = value;
      return parseSiweMessage(lines.join('\n')).reason;
    };
    expect(swap(0, 'please sign this')).toBe('bad-header');
    expect(swap(1, '0xdeadbeef')).toBe('bad-address');
    expect(swap(6, 'Version: 2')).toBe('bad-version');
    expect(swap(8, 'Nonce: tiny')).toBe('bad-nonce');
  });

  it('rejects an expiry that precedes issuance', () => {
    const message = buildSiweMessage({ ...base, expiresAt: ISSUED + 1 }).replace('10:00:00.001Z', '09:00:00.000Z');
    expect(parseSiweMessage(message).reason).toBe('expiry-before-issue');
  });
});

describe('verifySiweFields', () => {
  const parsed = parseSiweMessage(buildSiweMessage(base));
  const context = { domain: base.domain, nonce: NONCE, now: ISSUED + 1000, maxAgeMs: 600_000 };

  it('accepts a fresh message for the right host and nonce', () => {
    expect(verifySiweFields(parsed, context)).toEqual({ ok: true });
  });

  // A signature for another site's domain must never authenticate here, even
  // though it is a perfectly valid signature by that wallet.
  it('rejects a message signed for a different domain', () => {
    expect(verifySiweFields(parsed, { ...context, domain: 'evil.example' }).reason).toBe('domain-mismatch');
  });

  it('rejects a nonce the server did not issue for this attempt', () => {
    expect(verifySiweFields(parsed, { ...context, nonce: 'someothernonce' }).reason).toBe('nonce-mismatch');
  });

  it('rejects expired and stale messages', () => {
    expect(verifySiweFields(parsed, { ...context, now: EXPIRES }).reason).toBe('expired');
    expect(verifySiweFields(parsed, { ...context, now: ISSUED + 700_000, maxAgeMs: 600_000 }).reason).toBe('expired');
    // Unexpired but older than we are willing to accept — the replay guard.
    expect(verifySiweFields(parsed, { ...context, now: ISSUED + 500_000, maxAgeMs: 60_000 }).reason).toBe('stale');
  });

  it('rejects a message claiming to be issued in the future', () => {
    expect(verifySiweFields(parsed, { ...context, now: ISSUED - 120_000 }).reason).toBe('issued-in-future');
  });

  it('propagates a parse failure rather than treating it as valid', () => {
    expect(verifySiweFields({ ok: false, reason: 'bad-header' }, context)).toEqual({ ok: false, reason: 'bad-header' });
    expect(verifySiweFields(null, context).reason).toBe('unparsed');
  });
});

describe('isValidNonce', () => {
  it('requires at least 8 alphanumeric characters', () => {
    expect(isValidNonce('abcd1234')).toBe(true);
    expect(isValidNonce('abcd123')).toBe(false);
    expect(isValidNonce('abcd1234-')).toBe(false);
    expect(isValidNonce(undefined)).toBe(false);
  });
});
