import { useRef } from "react";
import { Menu, ReceiptText } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { BRAND_NAME } from "@/lib/brand";
import { useWallet } from "@/web3/useWallet";

// Wallet-first top bar: Connect Wallet replaces Login/Register (docs/architecture/10).
// When connected, the wallet pill + Funds + activity controls appear.
//
// The burger is desktop-only (≥768px, matching the sidebar rail's own
// breakpoint) — mobile navigation lives entirely in the bottom nav's Menu
// item now (see MobileBottomNav/MobileFullScreenMenu). Hiding it via CSS
// rather than not rendering it at all keeps the logo's left position stable
// with no layout jump right at the breakpoint.
export function TopBar({ onBurger, burgerLabel = "Toggle menu", onManageWallet, onFunds, onActivity }) {
  const { isConnected } = useWallet();

  // Long-press the logo (~700ms) opens the dev panel on touch devices.
  const pressTimer = useRef(null);
  const startPress = () => { pressTimer.current = setTimeout(() => window.dispatchEvent(new Event("polaris:dev")), 700); };
  const cancelPress = () => clearTimeout(pressTimer.current);

  const showConnected = isConnected;

  return (
    <header className="relative z-40 flex shrink-0 items-center gap-3 border-b bg-background px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))]">
      <button
        onClick={onBurger}
        aria-label={burgerLabel}
        className="hidden size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid"
      >
        <Menu className="size-5" />
      </button>

      <div
        className="flex shrink-0 select-none items-center gap-2"
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="grid size-8 place-items-center rounded-lg bg-[var(--brand-logo)] font-black text-[var(--brand-logo-text)]">{BRAND_NAME[0]}</div>
        <span className="text-sm font-bold tracking-tight">{BRAND_NAME}</span>
      </div>

      <div className="ms-auto flex items-center gap-2">
        {showConnected && (
          <>
            <button
              onClick={onFunds}
              aria-label="Funds"
              className="hidden rounded-lg bg-[var(--global-cta)] px-3 py-1.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
            >
              Funds
            </button>
            <button
              onClick={onActivity}
              aria-label="My bets"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ReceiptText className="size-5" />
            </button>
          </>
        )}
        <WalletButton onManage={onManageWallet} />
      </div>
    </header>
  );
}
