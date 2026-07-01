import { useRef } from "react";
import { Menu, ReceiptText } from "lucide-react";
import { BalancePill } from "./BalancePill";
import { BRAND_NAME } from "@/lib/brand";

export function TopBar({ onBurger, balance, user, onLogin, onRegister, onAccount, onDeposit, onActivity }) {
  // Long-press the logo (~700ms) opens the dev panel on touch devices.
  const pressTimer = useRef(null);
  const startPress = () => { pressTimer.current = setTimeout(() => window.dispatchEvent(new Event("polaris:dev")), 700); };
  const cancelPress = () => clearTimeout(pressTimer.current);

  return (
    <header className="relative z-40 flex shrink-0 items-center gap-3 border-b bg-background px-3 pb-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))]">
      <button
        onClick={onBurger}
        aria-label="Toggle menu"
        className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-5" />
      </button>

      <div
        className="flex select-none items-center gap-2"
        onPointerDown={startPress}
        onPointerUp={cancelPress}
        onPointerLeave={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="grid size-8 place-items-center rounded-lg bg-[var(--brand-logo)] font-black text-[var(--brand-logo-text)]">{BRAND_NAME[0]}</div>
        <span className="text-sm font-bold tracking-tight">{BRAND_NAME}</span>
      </div>

      {user ? (
        <>
          {/* Balance + deposit centered on desktop (Stake-style) */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 sm:block">
            <BalancePill balance={balance} onDeposit={onDeposit} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Balance + deposit inline on mobile (desktop shows it centered instead) */}
            <div className="sm:hidden">
              <BalancePill balance={balance} onDeposit={onDeposit} />
            </div>
            <button
              onClick={onActivity}
              aria-label="My activity"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ReceiptText className="size-5" />
            </button>
            <button
              onClick={onAccount}
              aria-label="Account"
              className="relative grid size-9 place-items-center rounded-full bg-[var(--brand-logo)] text-sm font-bold text-[var(--brand-logo-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {user.label?.[0]?.toUpperCase() ?? "U"}
              {!user.verified && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-[var(--warning)] ring-2 ring-background" />}
            </button>
          </div>
        </>
      ) : (
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onLogin}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Log in
          </button>
          <button
            onClick={onRegister}
            className="rounded-lg bg-[var(--global-cta)] px-4 py-1.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Register
          </button>
        </div>
      )}
    </header>
  );
}
