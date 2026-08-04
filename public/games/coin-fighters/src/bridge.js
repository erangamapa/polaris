/** TriBet Game Bridge client (Class A iframe) — channel must match `src/lib/gameBridge.js`. */
export const CHANNEL = 'tribet-game';

/** @typedef {{ type: 'init', balance: number, currency?: string }} BridgeInit */
/** @typedef {{ type: 'settled', id: string, outcomeIndex: number, multiplier: number, payout: number, isWin: boolean, balance: number }} BridgeSettled */
/** @typedef {{ type: 'rejected', id: string, reason: string, balance: number }} BridgeRejected */
/** @typedef {{ label: string, weight: number, multiplier: number }} BridgeOutcome */

/** @type {Map<string, (msg: BridgeSettled | BridgeRejected) => void>} */
const pending = new Map();
let listening = false;
/** @type {((msg: BridgeInit) => void) | null} */
let initHandler = null;

/** @param {Record<string, unknown>} msg */
function post(msg) {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ channel: CHANNEL, ...msg }, '*');
}

/** @param {MessageEvent} e */
function onMessage(e) {
  const data = /** @type {Record<string, unknown> | null} */ (e.data);
  if (!data || data.channel !== CHANNEL) return;
  if (data.type === 'init') {
    initHandler?.(/** @type {BridgeInit} */ (data));
    return;
  }
  if (data.type === 'settled' || data.type === 'rejected') {
    const id = String(data.id ?? '');
    const resolve = pending.get(id);
    if (resolve) {
      pending.delete(id);
      resolve(/** @type {BridgeSettled | BridgeRejected} */ (data));
    }
  }
}

/** True when running inside a TriBet host iframe. */
export function isEmbedded() {
  return typeof window !== 'undefined' && window.parent !== window;
}

/**
 * Announce GameReady and listen for `init` / settle replies.
 * Safe to call once on mount; no-ops when not embedded.
 * @param {{ onInit: (balance: number, currency?: string) => void }} handlers
 * @returns {() => void}
 */
export function connectBridge(handlers) {
  if (!isEmbedded()) return () => {};

  initHandler = (msg) => {
    handlers.onInit(Number(msg.balance) || 0, msg.currency);
  };

  if (!listening) {
    window.addEventListener('message', onMessage);
    listening = true;
  }

  post({ type: 'ready' });

  return () => {
    pending.clear();
    initHandler = null;
    if (listening) {
      window.removeEventListener('message', onMessage);
      listening = false;
    }
  };
}

/**
 * Place a bet through the host (mock or on-chain).
 * @param {number} amount
 * @param {BridgeOutcome[]} outcomes
 * @param {Record<string, unknown>} [meta]
 * @returns {Promise<BridgeSettled | BridgeRejected>}
 */
export function placeBet(amount, outcomes, meta) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return new Promise((resolve) => {
    if (!isEmbedded()) {
      resolve({ type: 'rejected', id, reason: 'not-embedded', balance: 0 });
      return;
    }
    pending.set(id, resolve);
    post({ type: 'bet', id, amount, outcomes, meta });
  });
}
