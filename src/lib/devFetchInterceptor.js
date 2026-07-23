// Developer Panel -> System: "Slow network" / "Force API error" simulation.
// Patches window.fetch, but ONLY for this app's own /api/* endpoints (used
// by BetHistoryDialog's on-chain history lookups) — every other fetch
// (wagmi/viem RPC calls, WalletConnect, Reown) passes straight through
// untouched, so the real wallet connection can never be broken by this.
//
// Installed exactly once, gated on `DEV_PANEL_ENABLED` (devPanelFlag.js) —
// currently `true` in every build including production, so this runs on
// playtribet.vercel.app too. If the flag is ever switched off, this no-ops
// so window.fetch is never touched.
import { getDevMockState } from "./devMock";
import { DEV_PANEL_ENABLED } from "./devPanelFlag";

let installed = false;

export function installDevFetchInterceptor() {
  if (!DEV_PANEL_ENABLED || installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url ?? "";
    if (url.startsWith("/api/")) {
      const mock = getDevMockState();
      if (mock.forceApiError) {
        throw new Error("Simulated API error (Developer Panel)");
      }
      if (mock.slowNetwork) {
        await new Promise((resolve) => setTimeout(resolve, 2500));
      }
    }
    return originalFetch(input, init);
  };
}
