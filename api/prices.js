// GET /api/prices?assets=ETH,BTC,...
// Thin server-side proxy in front of CoinGecko's Simple Price API — the one
// place that knows CoinGecko's URL shape, coin ids, and response format, so
// no UI component ever has to (see PRICE SOURCE / COINGECKO INTEGRATION:
// "the Wallet UI should NOT know CoinGecko URL structure... this makes
// replacing CoinGecko later straightforward").
//
// Deliberately NOT part of the wallet balance's source of truth — this is
// read-only market data, same non-custodial shape as balance.js/geo.js.
// A CoinGecko outage degrades to serving the last cached price (however
// stale) rather than failing the request — see IMPORTANT ARCHITECTURE:
// "a CoinGecko failure must never... block the Wallet modal."
import { get, setEx } from './_kv.js';
import { json } from './_shared.js';
import { COINGECKO_IDS, PRICE_FRESH_MS, PRICE_TOO_STALE_MS } from '../packages/shared/assetPrices.js';

// KV TTL matches the client's own "too stale to show as current" cutoff —
// once an entry falls out of KV, there is nothing worth serving as a
// fallback anyway (see packages/shared/assetPrices.js).
const KV_TTL_SECONDS = Math.round(PRICE_TOO_STALE_MS / 1000);

const keyFor = (coingeckoId) => `price:${coingeckoId}`;

async function readCached(coingeckoId) {
  const raw = await get(keyFor(coingeckoId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function fetchFromCoinGecko(coingeckoIds) {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=usd`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko responded ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  const assetsParam = req.query?.assets;
  const symbols = (Array.isArray(assetsParam) ? assetsParam.join(',') : assetsParam || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const knownSymbols = [...new Set(symbols.filter((s) => COINGECKO_IDS[s]))];
  if (knownSymbols.length === 0) return json(res, 400, { error: 'Valid ?assets= (e.g. ETH,BTC) required' });

  const result = {};
  const idsToFetch = [];
  const symbolByCoingeckoId = {};

  // Server-side freshness check protects CoinGecko from being hit once per
  // player per Wallet-modal-open — every request for a still-fresh asset is
  // answered straight out of KV, shared across ALL players.
  await Promise.all(knownSymbols.map(async (symbol) => {
    const coingeckoId = COINGECKO_IDS[symbol];
    symbolByCoingeckoId[coingeckoId] = symbol;
    const cached = await readCached(coingeckoId);
    if (cached && Date.now() - cached.updatedAt < PRICE_FRESH_MS) {
      result[symbol] = cached; // fresh enough — no CoinGecko round trip needed
    } else {
      idsToFetch.push(coingeckoId);
      if (cached) result[symbol] = cached; // stale fallback in case the live fetch below fails
    }
  }));

  // Single batched CoinGecko request for every stale/missing asset — never
  // one request per symbol (see FUTURE SUPPORT: "do not make five
  // independent requests if the provider supports fetching them together").
  if (idsToFetch.length > 0) {
    try {
      const live = await fetchFromCoinGecko(idsToFetch);
      await Promise.all(idsToFetch.map(async (coingeckoId) => {
        const usd = live[coingeckoId]?.usd;
        if (typeof usd !== 'number') return; // leave any stale fallback already in `result` in place
        const symbol = symbolByCoingeckoId[coingeckoId];
        const entry = { usd, updatedAt: Date.now() };
        result[symbol] = entry;
        await setEx(keyFor(coingeckoId), JSON.stringify(entry), KV_TTL_SECONDS);
      }));
    } catch (e) {
      // CoinGecko down/rate-limited — `result` already holds whatever stale
      // cached values existed; a symbol with no cache at all simply stays
      // absent from the response (client shows "≈ — USD"). Never a 5xx for
      // the whole request over one flaky upstream call.
      console.error('CoinGecko price fetch failed:', e.message);
    }
  }

  return json(res, 200, { prices: result });
}
