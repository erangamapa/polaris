import { describe, it, expect, afterEach, vi } from 'vitest';
import middleware, { isGateEnabled } from './middleware.js';

// The gate is deliberately asymmetric: gating is opt-in, so ANY value that is
// not exactly 'true' (unset, empty, 'false', a typo, a truthy-looking '1') must
// leave the site public. Getting this backwards locks real players out of a
// launched site behind a password only we know, so it is pinned here rather
// than left to the implementation.
const PASSWORD = 'shared-secret';

function request(password) {
  const headers = password === undefined
    ? {}
    : { authorization: `Basic ${btoa(`gate:${password}`)}` };
  return new Request('https://playtribet.vercel.app/', { headers });
}

function gate({ enabled, password = PASSWORD }) {
  if (enabled !== undefined) vi.stubEnv('SITE_PASSWORD_ENABLED', enabled);
  if (password !== undefined) vi.stubEnv('SITE_PASSWORD', password);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('isGateEnabled', () => {
  it("is on only for exactly 'true'", () => {
    expect(isGateEnabled({ SITE_PASSWORD_ENABLED: 'true' })).toBe(true);
  });

  it.each(['TRUE', 'True', '  true  '])('accepts %s (case/whitespace tolerant)', (flag) => {
    expect(isGateEnabled({ SITE_PASSWORD_ENABLED: flag })).toBe(true);
  });

  it.each([undefined, '', 'false', '1', 'yes', 'ture'])('stays off for %p', (flag) => {
    expect(isGateEnabled({ SITE_PASSWORD_ENABLED: flag })).toBe(false);
  });
});

describe('site gate', () => {
  it('serves the site publicly when the flag is off, even with a password set', () => {
    gate({ enabled: 'false' });
    expect(middleware(request())).toBeUndefined();
  });

  it('serves the site publicly when the flag is absent', () => {
    gate({ enabled: '' });
    expect(middleware(request())).toBeUndefined();
  });

  it('serves the site publicly when the flag is on but no password is configured', () => {
    gate({ enabled: 'true', password: '' });
    expect(middleware(request())).toBeUndefined();
  });

  it('challenges an unauthenticated visitor when the gate is on', () => {
    gate({ enabled: 'true' });
    const response = middleware(request());
    expect(response.status).toBe(401);
    expect(response.headers.get('WWW-Authenticate')).toBe('Basic realm="TriBet"');
  });

  it('lets the right password through when the gate is on', () => {
    gate({ enabled: 'true' });
    expect(middleware(request(PASSWORD))).toBeUndefined();
  });

  it('challenges the wrong password when the gate is on', () => {
    gate({ enabled: 'true' });
    expect(middleware(request('nope')).status).toBe(401);
  });

  it('challenges a malformed authorization header rather than throwing', () => {
    gate({ enabled: 'true' });
    const malformed = new Request('https://playtribet.vercel.app/', {
      headers: { authorization: 'Basic !!!not-base64!!!' },
    });
    expect(middleware(malformed).status).toBe(401);
  });
});
