import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  applySettingsPatch,
  createEnvelope,
  hasStoredSettings,
  mergeEnvelopes,
  normalizeEnvelope,
  normalizeLimitAmount,
  normalizeSettings,
} from './playerSettings.js';

// PER-PLAYER SETTINGS PERSISTENCE — the pure half of the feature. This module
// is the trust boundary for the whole system: it is what the SERVER runs on an
// untrusted PUT body (see api/settings.js) as well as what the client runs on
// whatever localStorage happens to hold, so "never throws, always returns a
// complete valid object" is the property these tests exist to pin down.
describe('normalizeSettings', () => {
  it('returns the full defaults for junk input', () => {
    for (const junk of [undefined, null, 0, 'nope', [], true]) {
      expect(normalizeSettings(junk)).toEqual(DEFAULT_SETTINGS);
    }
  });

  it('fills in missing groups rather than returning a partial', () => {
    const result = normalizeSettings({ preferences: { currency: 'EUR' } });
    expect(result.preferences.currency).toBe('EUR');
    expect(result.responsibleGaming).toEqual(DEFAULT_SETTINGS.responsibleGaming);
    expect(result.notifications).toEqual(DEFAULT_SETTINGS.notifications);
    expect(result.casino).toEqual(DEFAULT_SETTINGS.casino);
  });

  it('drops unknown keys instead of storing them', () => {
    const result = normalizeSettings({ preferences: { oddsFormat: 'american', evil: 'x' }, extraGroup: { a: 1 } });
    expect(result.preferences).toEqual({ oddsFormat: 'american', currency: 'USD' });
    expect(result).not.toHaveProperty('extraGroup');
  });

  it('rejects off-enum values back to the default', () => {
    const result = normalizeSettings({
      preferences: { oddsFormat: 'martian' },
      responsibleGaming: { depositLimit: { amount: 50, period: 'fortnight' }, realityCheckMinutes: 7 },
    });
    expect(result.preferences.oddsFormat).toBe('decimal');
    expect(result.responsibleGaming.depositLimit.period).toBe('day');
    expect(result.responsibleGaming.realityCheckMinutes).toBeNull();
  });

  it('accepts numeric-string values from number/select inputs', () => {
    const result = normalizeSettings({
      responsibleGaming: { depositLimit: { amount: ' 42.5 ', period: 'week' }, realityCheckMinutes: '60' },
    });
    expect(result.responsibleGaming.depositLimit).toEqual({ amount: 42.5, period: 'week' });
    expect(result.responsibleGaming.realityCheckMinutes).toBe(60);
  });

  it('de-duplicates and caps id lists, dropping non-string entries', () => {
    const result = normalizeSettings({
      casino: { favorites: ['a', 'a', 'b', 42, null, '', 'c'], recentlyPlayed: Array.from({ length: 40 }, (_, i) => `g${i}`) },
    });
    expect(result.casino.favorites).toEqual(['a', 'b', 'c']);
    expect(result.casino.recentlyPlayed).toHaveLength(24);
  });

  it('keeps booleans strictly boolean rather than coercing truthy values', () => {
    const result = normalizeSettings({ notifications: { betSettled: 'yes', promotions: 1, largeWins: false } });
    expect(result.notifications).toEqual({ betSettled: true, promotions: false, largeWins: false });
  });
});

describe('normalizeLimitAmount', () => {
  it('treats non-positive and unparseable amounts as "no limit"', () => {
    for (const value of [0, -5, NaN, Infinity, '', 'abc', null, undefined, {}]) {
      expect(normalizeLimitAmount(value)).toBeNull();
    }
  });

  it('rounds to two decimals and clamps the ceiling', () => {
    expect(normalizeLimitAmount(10.005)).toBe(10.01);
    expect(normalizeLimitAmount(1e12)).toBe(1_000_000_000);
  });
});

describe('mergeEnvelopes', () => {
  const local = createEnvelope({ preferences: { currency: 'GBP' } }, 200);
  const remote = createEnvelope({ preferences: { currency: 'EUR' } }, 100);

  it('takes the whole newer blob, not a per-field union', () => {
    expect(mergeEnvelopes(local, remote).data.preferences.currency).toBe('GBP');
    expect(mergeEnvelopes(remote, local).data.preferences.currency).toBe('GBP');
  });

  // The reason whole-blob was chosen over per-field: a cleared limit must stay
  // cleared, and a stale device holding the old value must not resurrect it.
  it('lets a newer save clear a limit an older save had set', () => {
    const withLimit = createEnvelope({ responsibleGaming: { depositLimit: { amount: 100, period: 'day' } } }, 100);
    const cleared = createEnvelope({ responsibleGaming: { depositLimit: { amount: null, period: 'day' } } }, 200);
    expect(mergeEnvelopes(cleared, withLimit).data.responsibleGaming.depositLimit.amount).toBeNull();
  });

  it('breaks ties toward remote so devices converge on the server copy', () => {
    const a = createEnvelope({ preferences: { currency: 'GBP' } }, 100);
    const b = createEnvelope({ preferences: { currency: 'EUR' } }, 100);
    expect(mergeEnvelopes(a, b).data.preferences.currency).toBe('EUR');
  });

  it('survives a missing or malformed side', () => {
    expect(mergeEnvelopes(null, remote).data.preferences.currency).toBe('EUR');
    expect(mergeEnvelopes(local, undefined).data.preferences.currency).toBe('GBP');
    expect(mergeEnvelopes(null, null).data).toEqual(DEFAULT_SETTINGS);
  });
});

describe('envelopes', () => {
  it('stamps the current schema version and normalises its payload', () => {
    const env = createEnvelope({ preferences: { oddsFormat: 'nope' } }, 5);
    expect(env).toEqual({ v: SETTINGS_VERSION, updatedAt: 5, data: DEFAULT_SETTINGS });
  });

  it('defaults a missing timestamp to 0 so any real save outranks it', () => {
    expect(normalizeEnvelope({ data: {} }).updatedAt).toBe(0);
    expect(createEnvelope({}, 'not-a-number').updatedAt).toBe(0);
  });
});

describe('applySettingsPatch', () => {
  it('patches one group and leaves the rest untouched', () => {
    const result = applySettingsPatch(DEFAULT_SETTINGS, 'notifications', { promotions: true });
    expect(result.notifications).toEqual({ betSettled: true, promotions: true, largeWins: true });
    expect(result.preferences).toEqual(DEFAULT_SETTINGS.preferences);
  });

  it('re-normalises the patch, so a bad UI value cannot reach storage', () => {
    const result = applySettingsPatch(DEFAULT_SETTINGS, 'preferences', { oddsFormat: 'martian' });
    expect(result.preferences.oddsFormat).toBe('decimal');
  });

  it('ignores an unknown group instead of inventing one', () => {
    expect(applySettingsPatch(DEFAULT_SETTINGS, 'nonsense', { a: 1 })).toEqual(DEFAULT_SETTINGS);
  });

  it('does not mutate the input', () => {
    const before = structuredClone(DEFAULT_SETTINGS);
    applySettingsPatch(DEFAULT_SETTINGS, 'notifications', { promotions: true });
    expect(DEFAULT_SETTINGS).toEqual(before);
  });
});

// Gates whether a wallet signature is worth asking for at all — an untouched
// blob holds nothing a second device would miss.
describe('hasStoredSettings', () => {
  it('is false for defaults and for junk', () => {
    expect(hasStoredSettings(DEFAULT_SETTINGS)).toBe(false);
    expect(hasStoredSettings({})).toBe(false);
    expect(hasStoredSettings(null)).toBe(false);
  });

  it('is true once any group differs', () => {
    expect(hasStoredSettings(applySettingsPatch(DEFAULT_SETTINGS, 'casino', { favorites: ['dice'] }))).toBe(true);
    expect(hasStoredSettings(applySettingsPatch(DEFAULT_SETTINGS, 'preferences', { currency: 'EUR' }))).toBe(true);
  });
});
