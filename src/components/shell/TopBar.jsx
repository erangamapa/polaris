import { useRef, useState } from "react";
import { Menu, ReceiptText } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { BalanceControl } from "@/components/wallet/BalanceControl";
import { ProfileMenu } from "@/components/wallet/ProfileMenu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BRAND_NAME } from "@/lib/brand";
import { useWallet } from "@/web3/useWallet";
import { TOP_BAR_MODE, getTopBarMode } from "@/lib/topBarState";

// Authenticated desktop top bar — Stake-familiar composition (balance +
// currency cluster, Fund, Activity, Profile grouped right), Tribet tokens
// throughout. Mental model this header enforces end to end (every control
// below maps to exactly one of these, never two):
//   Balance = what I have       -> BalanceControl (read-only glance + per-chain breakdown)
//   Fund    = add money         -> Fund button (opens FundsDialog)
//   Wallet  = manage money      -> "Manage wallet" inside BalanceControl/ProfileMenu (same FundsDialog — it already covers address/disconnect/faucets)
//   Activity = what happened    -> Activity button (opens BetHistoryDialog)
//   Profile = account/settings  -> ProfileMenu (Manage wallet, Responsible gambling, Support, Sign out)
//
// Right cluster is one flex group anchored by `ms-auto` on its container —
// never independently centered, never absolutely positioned — so it holds
// its shape as the sidebar expands/collapses and never drifts against the
// viewport (see PRIMARY GOAL).
//
// activePopover is the ONE piece of state this component owns: which of
// the two lightweight header popovers (Balance, Profile) is open. Both are
// controlled from here specifically so they can never both be open at once
// (see OVERLAY OWNERSHIP) — real account/wallet data all still comes
// straight from useWallet(), never duplicated here.
//
// The burger is desktop-only (≥768px, matching the sidebar rail's own
// breakpoint) — mobile navigation lives entirely in the bottom nav's Menu
// item now (see MobileBottomNav/MobileFullScreenMenu). Hiding it via CSS
// rather than not rendering it at all keeps the logo's left position stable
// with no layout jump right at the breakpoint. Below that breakpoint this
// same header renders its existing compact mobile form (logo + wallet
// pill only — Fund/Activity/Profile are reachable via the mobile menu's
// utility section instead) rather than a second, separate component.
export function TopBar({ onBurger, burgerLabel = "Toggle menu", onManageWallet, onFund, onActivity, onResponsibleGambling, onSupport, wrongNetwork, onSwitchNetwork, openPositionsCount = 0 }) {
  const wallet = useWallet();
  const { isConnected, address, casinoBalance, casinoSymbol, casinoBalanceLoading, sportsBalance, sportsSymbol, disconnect } = wallet;

  // Long-press the logo (~700ms) opens the dev panel on touch devices.
  const pressTimer = useRef(null);
  const startPress = () => { pressTimer.current = setTimeout(() => window.dispatchEvent(new Event("polaris:dev")), 700); };
  const cancelPress = () => clearTimeout(pressTimer.current);

  const [activePopover, setActivePopover] = useState(null); // null | "balance" | "profile"

  const mode = getTopBarMode({ isConnected, wrongNetwork });
  const showConnected = mode !== TOP_BAR_MODE.DISCONNECTED;

  return (
    <header className="relative z-40 flex min-h-14 shrink-0 items-center gap-3 border-b bg-background px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))]">
      <button
        onClick={onBurger}
        aria-label={burgerLabel}
        className="hidden size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid"
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
        <div className="grid size-8 place-items-center rounded-lg bg-[var(--brand-logo)] font-black text-[var(--brand-logo-text)]" aria-hidden="true">{BRAND_NAME[0]}</div>
        <span className="text-sm font-bold tracking-tight">
          <span className="sr-only">{BRAND_NAME} — </span>
          {BRAND_NAME}
        </span>
      </div>

      {/* Right cluster: one flex group, ms-auto anchored — never centered
          independently of this, never absolutely positioned (see PRIMARY
          GOAL). min-w-0 lets it compress before anything wraps. */}
      <div className="ms-auto flex min-w-0 shrink-0 items-center">
        {showConnected ? (
          <>
            {/* Desktop authenticated cluster (≥768px, matching the sidebar/
                burger breakpoint) — the new Balance/Fund/Activity/Profile
                composition this task adds. `hidden md:flex` (not JS
                conditional mounting) matches the exact pattern the burger
                toggle above already uses: CSS-hidden elements are excluded
                from both the visual layout AND the accessibility tree/tab
                order, so there is never a second focusable/announced copy
                at any width (see RESPONSIVE COMPRESSION: "Desktop header
                does not render on mobile / mobile header does not render
                on desktop"). */}
            <div className="hidden min-w-0 items-center gap-1.5 sm:gap-2 md:flex">
              <BalanceControl
                open={activePopover === "balance"}
                onOpenChange={(next) => setActivePopover(next ? "balance" : null)}
                casinoBalance={casinoBalance}
                casinoSymbol={casinoSymbol}
                casinoLoading={casinoBalanceLoading}
                sportsBalance={sportsBalance}
                sportsSymbol={sportsSymbol}
                wrongNetwork={wrongNetwork}
                onManageWallet={onManageWallet}
              />

              {mode === TOP_BAR_MODE.WRONG_NETWORK ? (
                <button
                  onClick={onSwitchNetwork}
                  data-test-id="switch-network"
                  className="flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg border border-[var(--warning)]/40 px-3 text-sm font-semibold text-[var(--warning)] hover:bg-[var(--warning)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Switch network
                </button>
              ) : (
                <button
                  onClick={onFund}
                  aria-label="Fund"
                  data-test-id="fund"
                  className="flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg bg-[var(--global-cta)] px-3.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Fund
                </button>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={onActivity}
                    aria-label={openPositionsCount > 0 ? `Activity, ${openPositionsCount} open` : "Activity"}
                    className="relative grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <ReceiptText className="size-5" aria-hidden="true" />
                    {openPositionsCount > 0 && (
                      <span className="absolute -end-1 -top-1">
                        <StatusBadge variant="attention" size="small" count={openPositionsCount} ariaLabel={`${openPositionsCount} open`} />
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Activity</TooltipContent>
              </Tooltip>

              <ProfileMenu
                open={activePopover === "profile"}
                onOpenChange={(next) => setActivePopover(next ? "profile" : null)}
                address={address}
                onManageWallet={onManageWallet}
                onResponsibleGambling={onResponsibleGambling}
                onSupport={onSupport}
                onSignOut={disconnect}
              />
            </div>

            {/* Mobile authenticated cluster (<768px) — unchanged from the
                previous header: a text Fund button once there's room
                (sm/640px+), an icon-only Activity button, and the wallet
                pill. Fuller account/activity access lives in the mobile
                menu's utility section (see MobileFullScreenMenu). */}
            <div className="flex items-center gap-2 md:hidden">
              <button
                onClick={onFund}
                aria-label="Fund"
                className="hidden rounded-lg bg-[var(--global-cta)] px-3 py-1.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:block"
              >
                Fund
              </button>
              <button
                onClick={onActivity}
                aria-label="Activity"
                className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ReceiptText className="size-5" />
              </button>
              <WalletButton onManage={onManageWallet} />
            </div>
          </>
        ) : (
          <WalletButton onManage={onManageWallet} />
        )}
      </div>
    </header>
  );
}
