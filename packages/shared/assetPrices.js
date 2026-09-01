// Central symbol -> CoinGecko coin-id map, shared between the client price
// hook (src/lib/useAssetPrice.js) and the server price service
// (api/prices.js). Add a new asset here ONLY — no provider ids should ever
// appear in a UI component (see USD CONVERSION task's "Do not scatter
// provider IDs through UI components").
export const COINGECKO_IDS = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  USDT: 'tether',
  USDC: 'usd-coin',
};

// One staleness policy, shared by both the server route's own "skip
// CoinGecko, this is still fresh" check and the client store's "show cached
// vs. show cached-but-refresh vs. give up and show '—'" decision — see
// CACHE / REFRESH STRATEGY and STALE DATA in the USD CONVERSION task.
export const PRICE_FRESH_MS = 60_000; // <60s: use as-is, never re-request
export const PRICE_TOO_STALE_MS = 10 * 60_000; // >=10min: too stale to show as current
