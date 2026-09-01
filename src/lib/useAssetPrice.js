// React hook over the shared price store (assetPriceStore.js) — implements
// the USD CONVERSION task's stale-while-revalidate policy:
//   - cached + fresh (<60s)      -> use as-is, no request.
//   - cached + stale (60s-10min) -> show the cached value immediately,
//                                    refresh silently in the background.
//   - cached + too stale (10min+)-> stop presenting it as current (`usd`
//                                    comes back null; caller renders "—").
//   - nothing cached yet         -> `usd` is null until the first fetch
//                                    resolves.
// `enabled` gates ALL network activity — pass the Wallet modal's own `open`
// state so polling starts when it opens and stops the instant it closes
// (see CACHE / REFRESH STRATEGY: "when modal closes, stop modal-specific
// polling").
import { useEffect, useSyncExternalStore } from "react";
import { fetchPrices, getCachedPrice, isFresh, isTooStale, subscribe } from "./assetPriceStore";

const REFRESH_INTERVAL_MS = 60_000; // "refresh at most once every 60 seconds" while open

export function useAssetPrice(symbol, { enabled }) {
  const entry = useSyncExternalStore(subscribe, () => getCachedPrice(symbol));

  useEffect(() => {
    if (!enabled || !symbol) return undefined;

    const maybeFetch = () => {
      if (isFresh(getCachedPrice(symbol))) return; // still fresh — no request
      fetchPrices([symbol]);
    };

    maybeFetch(); // on open: immediate check, silent background refresh if stale
    const id = setInterval(maybeFetch, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [symbol, enabled]);

  return {
    usd: entry && !isTooStale(entry) ? entry.usd : null,
    updatedAt: entry?.updatedAt ?? null,
  };
}
