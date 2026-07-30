// PLAYER SETTINGS — the one schema every persisted per-player preference in
// this app is described by, plus the pure transforms the client provider and
// the API route both run.
//
// Lives in packages/shared (not src/lib) specifically so the SERVER can import
// the exact same normalisation the client uses: a settings blob arriving at
// PUT /api/settings is normalised by this module before it is written, so a
// hand-crafted request can never poison a player's stored settings with values
// the UI would then choke on. src/lib/* is aliased to `@/` and is not
// resolvable from api/* — packages/shared is (see api/settings.js's relative
// import and vite.config.js's `@shared` alias).
//
// IDENTITY — there is no email/password anywhere in this app; the connected
// wallet address IS the player identity (see api/auth/verify.js for how a
// request proves it owns that address). Settings are stored one blob per
// lowercased address.
//
// HONESTY — persisting a setting is NOT the same as enforcing it. This module
// stores what the player chose; what the app actually acts on is documented
// per-group below and stated in the UI copy. Nothing is presented to the
// player as an active protection unless the app genuinely implements it.
export const SETTINGS_VERSION = 1;

export const ODDS_FORMATS = ['decimal', 'fractional', 'american'];
export const LIMIT_PERIODS = ['day', 'week', 'month'];

// Enumerated rather than free-numeric so an out-of-range value is impossible
// by construction — the UI renders these as selects, and the server rejects
// anything not on the list.
export const REALITY_CHECK_INTERVALS = [15, 30, 60, 120];

// A limit amount is a display-currency figure, not a chain amount — this app
// has no single on-chain unit to express "deposit limit" in (casino stakes are
// ETH on Base Sepolia, sports stakes are USDT on Polygon Amoy), so limits are
// expressed in the player's display currency like every other money figure in
// the UI (see src/lib/currency.jsx).
const MAX_LIMIT_AMOUNT = 1_000_000_000;

// Bounded so a synced blob can never grow without limit — favorites and
// recently-played are the only list-shaped settings, and both are already
// capped by the UI that produces them.
const MAX_FAVORITES = 500;
const MAX_RECENTLY_PLAYED = 24;

export const DEFAULT_SETTINGS = {
  // ENFORCED — both drive real rendering everywhere in the app (see
  // src/lib/odds.jsx, src/lib/currency.jsx).
  preferences: {
    oddsFormat: 'decimal',
    currency: 'USD',
  },
  // MIXED, and the UI says which is which. `realityCheckMinutes` is genuinely
  // implemented — src/lib/useRealityCheck.js runs a real timer that really
  // does interrupt play. `depositLimit`/`lossLimit` are STORED ONLY: enforcing
  // them needs deposit interception and cross-chain bet accounting this app
  // does not have, so the UI states that in plain words rather than implying a
  // live cap. This is the same honesty rule that got the previous fake limit
  // controls deleted (see src/components/trust/ResponsibleGamblingDialog.jsx).
  responsibleGaming: {
    depositLimit: { amount: null, period: 'day' },
    lossLimit: { amount: null, period: 'week' },
    realityCheckMinutes: null,
  },
  // STORED ONLY — no notification delivery system exists in this app. Kept
  // because the player's choice is worth remembering for when one does exist,
  // and the UI labels these as saved preferences, not active alerts.
  notifications: {
    betSettled: true,
    promotions: false,
    largeWins: true,
  },
  // ENFORCED — the real cross-device win: favorites and recently-played stop
  // being per-browser buckets (App.jsx used to simulate per-account favorites
  // with a `tribet_favs_<address>` localStorage key) and actually follow the
  // wallet.
  casino: {
    favorites: [],
    recentlyPlayed: [],
  },
};

const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

// `null` means "no limit set" and is a first-class value, distinct from 0 — a
// player setting a limit of 0 would be asking to be blocked outright, which
// this app cannot honour, so 0 and every other non-positive number normalise
// back to null rather than being stored as a limit that does nothing.
export function normalizeLimitAmount(value) {
  const num = typeof value === 'string' ? Number(value.trim()) : value;
  if (typeof num !== 'number' || !Number.isFinite(num) || num <= 0) return null;
  return Math.min(Math.round(num * 100) / 100, MAX_LIMIT_AMOUNT);
}

function normalizeLimit(raw, fallback) {
  const source = isPlainObject(raw) ? raw : {};
  return {
    amount: normalizeLimitAmount(source.amount),
    period: oneOf(source.period, LIMIT_PERIODS, fallback.period),
  };
}

function normalizeInterval(value, allowed) {
  const num = typeof value === 'string' ? Number(value) : value;
  return allowed.includes(num) ? num : null;
}

// Game ids are opaque strings produced by the casino catalog; anything that
// isn't a non-empty string is dropped rather than stored and later rendered as
// an empty tile.
function normalizeIdList(value, cap) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.length === 0 || seen.has(entry)) continue;
    seen.add(entry);
    out.push(entry);
    if (out.length >= cap) break;
  }
  return out;
}

// The single gate every settings blob passes through, wherever it came from
// (localStorage written by an older build, an API response, a PUT body).
// Always returns a complete, valid settings object — never throws, never
// returns a partial — so no caller has to defend against missing groups.
export function normalizeSettings(raw) {
  const source = isPlainObject(raw) ? raw : {};
  const prefs = isPlainObject(source.preferences) ? source.preferences : {};
  const rg = isPlainObject(source.responsibleGaming) ? source.responsibleGaming : {};
  const notif = isPlainObject(source.notifications) ? source.notifications : {};
  const casino = isPlainObject(source.casino) ? source.casino : {};
  const d = DEFAULT_SETTINGS;

  return {
    preferences: {
      oddsFormat: oneOf(prefs.oddsFormat, ODDS_FORMATS, d.preferences.oddsFormat),
      // Only guaranteed to be a non-empty string here. The currency enum lives
      // in src/lib/currency.jsx (UI data, with symbols and mock rates), and
      // this module deliberately does not import it so the serverless bundle
      // stays free of UI code — the provider validates the id against
      // CURRENCIES on the way in (see src/lib/usePlayerSettings.jsx).
      currency: typeof prefs.currency === 'string' && prefs.currency.length > 0
        ? prefs.currency
        : d.preferences.currency,
    },
    responsibleGaming: {
      depositLimit: normalizeLimit(rg.depositLimit, d.responsibleGaming.depositLimit),
      lossLimit: normalizeLimit(rg.lossLimit, d.responsibleGaming.lossLimit),
      realityCheckMinutes: normalizeInterval(rg.realityCheckMinutes, REALITY_CHECK_INTERVALS),
    },
    notifications: {
      betSettled: normalizeBoolean(notif.betSettled, d.notifications.betSettled),
      promotions: normalizeBoolean(notif.promotions, d.notifications.promotions),
      largeWins: normalizeBoolean(notif.largeWins, d.notifications.largeWins),
    },
    casino: {
      favorites: normalizeIdList(casino.favorites, MAX_FAVORITES),
      recentlyPlayed: normalizeIdList(casino.recentlyPlayed, MAX_RECENTLY_PLAYED),
    },
  };
}

// Settings travel in an envelope so the merge below has a timestamp to compare
// and a future schema change has a version to migrate from. The envelope — not
// the bare settings object — is what gets stored on both sides.
export function createEnvelope(settings, updatedAt) {
  return { v: SETTINGS_VERSION, updatedAt: Number.isFinite(updatedAt) ? updatedAt : 0, data: normalizeSettings(settings) };
}

export function normalizeEnvelope(raw) {
  const source = isPlainObject(raw) ? raw : {};
  return createEnvelope(source.data, source.updatedAt);
}

// LAST-WRITE-WINS on the whole blob, deliberately not per-field. Per-field
// merging sounds better but silently resurrects values the player just
// cleared: clear a deposit limit on your phone, and a stale desktop tab still
// holding the old limit would "win" that field on its next sync and put the
// limit back. Whole-blob means the most recent explicit save is what stands,
// which is the behaviour a player can actually predict.
//
// Ties go to `remote`: if both sides claim the same millisecond, the server's
// copy is the one every other device will also converge on, so preferring it
// keeps devices consistent instead of each keeping its own local answer.
export function mergeEnvelopes(local, remote) {
  const a = normalizeEnvelope(local);
  const b = normalizeEnvelope(remote);
  return a.updatedAt > b.updatedAt ? a : b;
}

// Group-level patch, returning a whole new settings object. Everything the UI
// changes goes through here so the result is always re-normalised — a select
// bound to a stale option, or a number input holding "abc", can never reach
// storage.
export function applySettingsPatch(settings, group, patch) {
  const current = normalizeSettings(settings);
  if (!Object.prototype.hasOwnProperty.call(current, group)) return current;
  return normalizeSettings({ ...current, [group]: { ...current[group], ...patch } });
}

// True when the player has actually chosen something worth syncing. Used to
// decide whether a wallet signature is worth asking for at all: a blob that
// still equals the defaults holds nothing a new device would miss, so it never
// triggers a signature prompt (see src/lib/usePlayerSettings.jsx).
export function hasStoredSettings(settings) {
  return JSON.stringify(normalizeSettings(settings)) !== JSON.stringify(DEFAULT_SETTINGS);
}
