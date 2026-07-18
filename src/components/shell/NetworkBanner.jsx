import { useEffect, useState } from "react";
import { TriangleAlert, X, Loader2 } from "lucide-react";

// Wrong-network is detected once, globally (from the wallet's actual chainId
// via wagmi — reactive, so this updates within a render cycle of a MetaMask
// network switch either way). Game/market cards never do their own network
// detection; they just inherit whatever gate (ensureAuth) already uses this
// same wallet state. Dismissible, but re-appears if the wallet lands on a
// wrong network again after being fixed (a fresh problem, not the old one).
export function NetworkBanner({ show, switching, onSwitch }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => { if (show) setDismissed(false); }, [show]);

  if (!show || dismissed) return null;

  return (
    <div role="alert" className="flex shrink-0 items-center gap-3 border-b border-amber-500/25 bg-amber-500/10 px-4 py-2 text-sm">
      <TriangleAlert className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-amber-100">Wrong network for this section.</span>
      <button
        onClick={onSwitch}
        disabled={switching}
        data-test-id="network-banner-switch"
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {switching && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
        {switching ? "Switching…" : "Switch network"}
      </button>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="shrink-0 text-amber-100/70 transition-colors hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
