import { useState } from "react";
import { Menu, ReceiptText, Wallet as WalletIcon, ShieldAlert } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { BalanceControl } from "@/components/wallet/BalanceControl";
import { ProfileMenu } from "@/components/wallet/ProfileMenu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BRAND_NAME } from "@/lib/brand";
import { useDevAwareWallet } from "@/lib/useDevAwareWallet";
import { TOP_BAR_MODE, getTopBarMode } from "@/lib/topBarState";
import { useDevPanelLogoTap } from "@/lib/useDevPanelLogoTap";

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
  const wallet = useDevAwareWallet();
  const {
    isConnected, address, casinoBalance, casinoSymbol, casinoBalanceLoading, sportsBalance, sportsSymbol, disconnect,
    loggedInNoWallet, sessionExpired, wrongNetworkOverride,
  } = wallet;

  // Triple-tap the logo toggles the Developer Panel on touch devices, where
  // Shift+D isn't practical (see lib/useDevPanelLogoTap.js).
  const onLogoTap = useDevPanelLogoTap();

  const [activePopover, setActivePopover] = useState(null); // null | "balance" | "profile"

  // Dev Panel's own wallet mock is derived from the REAL wallet App.jsx
  // computed `wrongNetwork` from, so it can't see it — prefer the mock's
  // verdict whenever one is active (see useDevAwareWallet.js).
  const effectiveWrongNetwork = wrongNetworkOverride ?? wrongNetwork;
  const mode = getTopBarMode({ isConnected, wrongNetwork: effectiveWrongNetwork });
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
        onClick={onLogoTap}
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
        {import.meta.env.DEV && sessionExpired ? (
          // DEV-ONLY state (Developer Panel -> User -> Session expired).
          // Gated on the build-time `import.meta.env.DEV` constant, not
          // just the runtime `sessionExpired` flag: that flag is already
          // always false in production (see useDevAwareWallet.js), but
          // without this the branch's JSX would still ship as dead code in
          // the production bundle — Rollup can only eliminate a branch
          // whose condition folds to a compile-time constant, not one that
          // merely evaluates false at runtime (see DEV-ONLY REQUIREMENT:
          // "tree-shake where practical" / "no dev-only labels in
          // production UI" — confirmed via a production build grep before
          // adding this).
          // wallet connection is preserved (per AUTH AND WALLET RULES —
          // "preserve wallet connection state") but the account itself
          // needs re-auth, so Balance/Fund are replaced with a distinct
          // prompt while Activity/Profile stay reachable.
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--warning)]/40 px-3 text-sm font-semibold text-[var(--warning)]">
              <ShieldAlert className="size-4 shrink-0" aria-hidden="true" /> Session expired
            </span>
            <button
              onClick={onManageWallet}
              data-test-id="reconnect"
              className="flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg bg-[var(--global-cta)] px-3.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Reconnect
            </button>
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
        ) : import.meta.env.DEV && loggedInNoWallet ? (
          // DEV-ONLY state (Developer Panel -> User -> Logged in, Wallet ->
          // Disconnected): the one auth/wallet combination with no real
          // backing system yet (see useDevAwareWallet.js's architecture
          // note) — an authenticated Profile is reachable, but Balance/Fund
          // need a real wallet connection first.
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={onManageWallet}
              data-test-id="connect-wallet-authenticated"
              className="flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold text-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <WalletIcon className="size-4 shrink-0" aria-hidden="true" /> Connect wallet
            </button>
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
        ) : showConnected ? (
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
