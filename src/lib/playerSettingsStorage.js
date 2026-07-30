// localStorage side of player settings — the local half of a local-first store.
// Split out of usePlayerSettings.jsx so the key scoping and the seed-on-connect
// rule are testable without React or a wallet.
//
// WHY LOCAL AT ALL, when there is a server: so the app paints the player's real
// preferences on the first frame. Waiting for a network round trip to know the
// display currency means rendering every balance in the wrong currency first
// and then visibly correcting it. The server is the durable copy; this is the
// one that makes the UI instant.
import { createEnvelope, mergeEnvelopes, normalizeEnvelope } from '@shared/playerSettings';

const PREFIX = 'tribet.settings.v1';

// Two scopes, and the distinction matters. `device` holds choices made before
// any wallet was connected — a player can set their odds format on first visit,
// and it should not be lost. Per-address buckets hold each wallet's own
// settings, so connecting wallet B never shows wallet A's preferences.
export const DEVICE_KEY = `${PREFIX}.device`;

export const storageKey = (address) => (address ? `${PREFIX}.${address.toLowerCase()}` : DEVICE_KEY);

export const EMPTY_ENVELOPE = createEnvelope({}, 0);

export function readEnvelope(address) {
  try {
    const raw = localStorage.getItem(storageKey(address));
    return raw ? normalizeEnvelope(JSON.parse(raw)) : EMPTY_ENVELOPE;
  } catch {
    // Unavailable/quota-exceeded/corrupt localStorage must never break boot —
    // the app just starts from defaults.
    return EMPTY_ENVELOPE;
  }
}

export function writeEnvelope(address, envelope) {
  try {
    localStorage.setItem(storageKey(address), JSON.stringify(normalizeEnvelope(envelope)));
  } catch {
    /* storage unavailable — the server copy is still authoritative */
  }
}

// SEED-ON-CONNECT: when a wallet is connected for the first time on this
// device, its bucket is empty, and whatever the player chose while
// disconnected is the only thing they have — so it seeds the new bucket. Once
// that bucket has anything in it, the device blob is ignored entirely.
//
// Deliberately seed-if-empty rather than a per-field union with the device
// blob. A union would carry wallet A's leftovers into wallet B on the same
// browser, and it would contradict the whole-blob last-write-wins rule the rest
// of the system runs on (see mergeEnvelopes in packages/shared/playerSettings.js
// for why per-field merging resurrects values players deliberately cleared).
export function readAccountEnvelope(address) {
  if (!address) return readEnvelope(null);
  const account = readEnvelope(address);
  if (account.updatedAt > 0) return account;

  const device = readEnvelope(null);
  return device.updatedAt > 0 ? device : EMPTY_ENVELOPE;
}

// Resolves what to trust after a server read: whichever side saved last (see
// mergeEnvelopes), then persists that answer locally so the next boot starts
// from it.
export function reconcile(address, local, remote) {
  const merged = mergeEnvelopes(local, remote);
  writeEnvelope(address, merged);
  return merged;
}
