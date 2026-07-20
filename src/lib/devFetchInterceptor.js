// Developer Panel -> System: "Slow network" / "Force API error" simulation.
// Patches window.fetch, but ONLY for this app's own /api/* endpoints (used
// by BetHistoryDialog's on-chain history lookups) — every other fetch
// (wagmi/viem RPC calls, WalletConnect, Reown) passes straight through
// untouched, so the real wallet connection can never be broken by this.
//
// Installed exactly once, and only in dev (see installDevFetchInterceptor's
// own guard) — in a production build this module's install function is
// never called (see App.jsx), and even if it somehow were, the internal
// `import.meta.env.DEV` check makes it a no-op, so window.fetch is never
// touched in production either way.
import { getDevMockState } from "./devMock";

let installed = false;

export function installDevFetchInterceptor() {
  if (!import.meta.env.DEV || installed || typeof window === "undefined") return;
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
