/**
 * Provably-fair crash point — Bustabit base at ~97% RTP, with a compressed
 * high-multiplier tail so jackpots stay rare.
 *
 * At/below TAIL_KINK (2×): classic curve → cashout EV ≈ 97%.
 * Above the kink: excess multiplier is scaled down (TAIL_SCALE), so
 * greedier targets (3×, 10×, …) are much rarer and pay a steeper house edge.
 *
 * Progressive odds still apply: longer you stay, less likely you survive.
 */

const CLIENT_SEED_KEY = 'raiders-escape-client-seed';

/** House edge on the base curve (1.00×–TAIL_KINK). */
export const HOUSE_EDGE = 0.03;
export const TARGET_RTP = 1 - HOUSE_EDGE;
/** Multipliers above this are compressed (rarer highs). */
const TAIL_KINK = 2;
/** Keep this fraction of (crash − kink); lower → rarer jackpots. */
const TAIL_SCALE = 0.25;
const MAX_CRASH = 50;

function randomSeed(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSHA256(message, key) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {string} serverSeed
 * @param {string} clientSeed
 * @param {number} nonce
 * @returns {Promise<number>}
 */
export async function generateCrashPoint(serverSeed, clientSeed, nonce) {
  const combined = `${serverSeed}-${clientSeed}-${nonce}`;
  const hash = await hmacSHA256(combined, serverSeed);
  const hashInt = parseInt(hash.substring(0, 8), 16);
  const e = 2 ** 32;
  const h = hashInt / e;

  if (h < HOUSE_EDGE) return 1.0;

  let crash = (1 - HOUSE_EDGE) / (1 - h);
  // Compress the long tail — never expands survival vs the raw curve
  if (crash > TAIL_KINK) {
    crash = TAIL_KINK + (crash - TAIL_KINK) * TAIL_SCALE;
  }
  crash = Math.floor(crash * 100) / 100;
  return Math.max(1.0, Math.min(MAX_CRASH, crash));
}

export class Fairness {
  constructor() {
    this.serverSeed = '';
    this.serverSeedHash = '';
    this.clientSeed = this._loadClientSeed();
    this.nonce = 0;
    this.lastCrash = null;
    this.lastHash = '';
  }

  _loadClientSeed() {
    try {
      const stored = localStorage.getItem(CLIENT_SEED_KEY);
      if (stored) return stored;
    } catch {
      /* ignore */
    }
    return randomSeed();
  }

  async initSession() {
    this.serverSeed = randomSeed();
    this.serverSeedHash = await sha256Hex(this.serverSeed);
    this.nonce = 0;
    this.lastCrash = null;
    try {
      localStorage.setItem(CLIENT_SEED_KEY, this.clientSeed);
    } catch {
      /* ignore */
    }
  }

  /** @returns {Promise<{ crashPoint: number, hash: string }>} */
  async nextCrash() {
    const combined = `${this.serverSeed}-${this.clientSeed}-${this.nonce}`;
    const hash = await hmacSHA256(combined, this.serverSeed);
    const crashPoint = await generateCrashPoint(this.serverSeed, this.clientSeed, this.nonce);
    this.lastCrash = crashPoint;
    this.lastHash = hash;
    this.nonce += 1;
    return { crashPoint, hash };
  }

  shortHash() {
    return this.serverSeedHash ? `${this.serverSeedHash.slice(0, 10)}…` : '—';
  }
}
