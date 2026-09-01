import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { isFresh, isTooStale, getCachedPrice, fetchPrices } from "./assetPriceStore";

// STALENESS POLICY — pure boundary checks against the shared thresholds
// (packages/shared/assetPrices.js: 60s fresh, 10min too-stale). The Wallet
// modal's USD line reads through these two functions to decide "use as-is",
// "show cached, refresh silently", or "give up, show '—'" — see
// useAssetPrice.js and the USD CONVERSION task's CACHE / REFRESH STRATEGY.
describe("isFresh / isTooStale", () => {
  it("treats null/undefined as neither fresh nor within the stale window", () => {
    expect(isFresh(null)).toBe(false);
    expect(isTooStale(null)).toBe(true);
  });

  it("a value updated just now is fresh and not too stale", () => {
    const entry = { usd: 3000, updatedAt: Date.now() };
    expect(isFresh(entry)).toBe(true);
    expect(isTooStale(entry)).toBe(false);
  });

  it("a value updated 5 minutes ago is stale but still usable (not too stale)", () => {
    const entry = { usd: 3000, updatedAt: Date.now() - 5 * 60_000 };
    expect(isFresh(entry)).toBe(false);
    expect(isTooStale(entry)).toBe(false);
  });

  it("a value updated 11 minutes ago is too stale to present as current", () => {
    const entry = { usd: 3000, updatedAt: Date.now() - 11 * 60_000 };
    expect(isFresh(entry)).toBe(false);
    expect(isTooStale(entry)).toBe(true);
  });
});

// FETCH DEDUP — two callers asking for the same symbol set at once must
// share one network request, never fire two (see CACHE LOCATION: "do not
// create duplicate requests if multiple components request the same asset
// simultaneously").
describe("fetchPrices", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ prices: { ETH: { usd: 3000, updatedAt: Date.now() } } }),
      })
    ));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("collapses two concurrent requests for the same symbol into one fetch call", async () => {
    await Promise.all([fetchPrices(["ETH"]), fetchPrices(["ETH"])]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(getCachedPrice("ETH")?.usd).toBe(3000);
  });
});
