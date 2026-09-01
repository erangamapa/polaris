// Shared market-price cache — a module-level singleton, not local component
// state, so any surface (Wallet modal today; future deposit/withdraw/
// portfolio/bet-confirmation views) reads the SAME cached price and never
// triggers a duplicate request for the same asset at the same moment (see
// USD CONVERSION task's CACHE LOCATION: "reusable by future... do not create
// duplicate requests if multiple components request the same asset
// simultaneously").
//
// Deliberately NOT the wallet balance's source of truth (see IMPORTANT
// ARCHITECTURE: "keep these systems separate... a CoinGecko failure must
// never mark the wallet disconnected, change the crypto balance, produce a
// wallet error, block the Wallet modal, or prevent transactions") — a fetch
// failure here only ever leaves THIS store's own cache stale or empty; it
// never touches wallet/balance/connection state.
import { PRICE_FRESH_MS, PRICE_TOO_STALE_MS } from '@shared/assetPrices';

const cache = new Map(); // symbol -> { usd, updatedAt }
const inFlight = new Map(); // dedup key -> Promise
const listeners = new Set();

function notify() {
  for (const listener of listeners) listener();
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedPrice(symbol) {
  return cache.get(symbol) ?? null;
}

function ageMs(entry) {
  return entry ? Date.now() - entry.updatedAt : Infinity;
}

export function isFresh(entry) {
  return ageMs(entry) < PRICE_FRESH_MS;
}

export function isTooStale(entry) {
  return ageMs(entry) >= PRICE_TOO_STALE_MS;
}

// Fetches through the Tribet price service (/api/prices) — never CoinGecko
// directly from a component (see SERVER-SIDE PRICE SERVICE). Concurrent
// calls for the same set of symbols share one in-flight request rather than
// firing N; a later call for a DIFFERENT symbol set still dedupes per its
// own key, so two unrelated callers never block each other.
export async function fetchPrices(symbols) {
  const key = [...new Set(symbols)].sort().join(',');
  if (!key) return;
  if (inFlight.has(key)) return inFlight.get(key);

  const promise = fetch(`/api/prices?assets=${key}`)
    .then((res) => {
      if (!res.ok) throw new Error(`price service responded ${res.status}`);
      return res.json();
    })
    .then((body) => {
      for (const [symbol, entry] of Object.entries(body.prices || {})) {
        if (typeof entry?.usd === 'number' && typeof entry?.updatedAt === 'number') {
          cache.set(symbol, entry);
        }
      }
      notify();
    })
    .catch((err) => {
      // Silent by design — see FAILURE BEHAVIOR: "market price failure
      // should degrade silently... log the failure appropriately for
      // debugging," never surfaced to the player.
      console.error('Asset price fetch failed:', err);
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}
