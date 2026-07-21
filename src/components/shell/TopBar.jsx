import { useState } from "react";
import { Menu, ReceiptText, ShieldAlert } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { BalanceControl } from "@/components/wallet/BalanceControl";
import { ProfileMenu } from "@/components/wallet/ProfileMenu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BRAND_NAME } from "@/lib/brand";
import { useDevAwareWallet } from "@/lib/useDevAwareWallet";
import { getTopBarMode, HEADER_CENTER_VARIANT, getHeaderCenterVariant } from "@/lib/topBarState";
import { useDevPanelLogoTap } from "@/lib/useDevPanelLogoTap";

// Authenticated desktop top bar — a stable three-zone grid (see PRIMARY
// GOAL): [left: menu + logo] [center: Balance+Wallet HUD] [right: Activity +
// Profile]. `grid-cols-[1fr_auto_1fr]` with each zone's own `justify-self`
// is what keeps the center HUD geometrically centered against the FULL
// header width regardless of how wide the left/right zones are — critical
// here because the persistent sidebar (Sidebar.jsx) renders as a sibling
// BELOW this header, not beside it, so this header always spans the full
// viewport width whether the sidebar is expanded, collapsed, or (on mobile)
// not rendered at all. That settles the centering-reference question up
// front: center against the header/viewport, never against a "content area
// excluding the sidebar" that this shell doesn't actually have.
//
// Mental model this header enforces end to end (every control below maps to
// exactly one of these, never two):
//   Balance = what I have       -> BalanceControl (read-only glance + per-chain breakdown)
//   Wallet  = manage money      -> the HUD's right half (same FundsDialog flow as before — Fund and
//                                  "Manage wallet" already resolved to one identical handler, so this
//                                  is a rename/merge, not a new control; see CENTER HUD STRUCTURE)
//   Activity = what happened    -> Activity button (opens BetHistoryDialog)
//   Profile = account/settings  -> ProfileMenu (Manage wallet, Responsible gambling, Support, Sign out)
//
// activePopover is the ONE piece of state this component owns: which of
// the two lightweight header popovers (Balance, Profile) is open. Both are
// controlled from here specifically so they can never both be open at once
// (see OVERLAY OWNERSHIP) — real account/wallet data all still comes
// straight from useWallet(), never duplicated here.
//
// The burger is desktop-only (≥768px, matching the sidebar rail's own
// breakpoint) — mobile navigation lives entirely in the bottom nav's Menu
// item now (see MobileBottomNav/MobileFullScreenMenu). Below that breakpoint
// the header falls back to `flex` (the three-zone `grid` only applies at
// `md:`) and renders its existing compact mobile form (logo + wallet pill
// only) — the centered HUD is `hidden md:flex`, so it never renders on
// mobile at all (see RESPONSIVE COMPRESSION: "do not force the desktop
// centered HUD onto mobile").
export function TopBar({ onBurger, burgerLabel = "Toggle menu", onManageWallet, onFund, onActivity, onResponsibleGambling, onSupport, wrongNetwork, onSwitchNetwork, openPositionsCount = 0 }) {
  const wallet = useDevAwareWallet();
  const {
    isConnected, address, casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError, sportsBalance, sportsSymbol, disconnect,
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
  const centerVariant = getHeaderCenterVariant({ sessionExpired, loggedInNoWallet, mode });

  return (
    <header className="relative z-40 flex min-h-14 shrink-0 items-center gap-3 border-b bg-background px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] md:grid md:grid-cols-[1fr_auto_1fr] md:gap-3">
      {/* LEFT ZONE: menu toggle + logo. Never redesigned here (see DO NOT
          CHANGE: "logo"/"mobile triple-tap dev-panel trigger"). */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 md:justify-self-start">
        <button
          onClick={onBurger}
          aria-label={burgerLabel}
          className="hidden size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid"
        >
          <Menu className="size-5" />
        </button>

        <div className="flex shrink-0 select-none items-center gap-2" onClick={onLogoTap}>
          <div className="grid size-8 place-items-center rounded-lg bg-[var(--brand-logo)] font-black text-[var(--brand-logo-text)]" aria-hidden="true">{BRAND_NAME[0]}</div>
          <span className="text-sm font-bold tracking-tight">
            <span className="sr-only">{BRAND_NAME} — </span>
            {BRAND_NAME}
          </span>
        </div>
      </div>

      {/* CENTER ZONE: the Balance+Wallet transactional HUD — desktop only,
          `hidden md:flex` so it's excluded from both layout AND the a11y
          tree on mobile (same pattern the burger button above already
          uses), never a second focusable copy at any width. */}
      <div className="hidden min-w-0 items-center justify-center md:flex md:justify-self-center">
        {centerVariant === HEADER_CENTER_VARIANT.SESSION_EXPIRED ? (
          // DEV-ONLY state (Developer Panel -> User -> Session expired).
          // Gated on the build-time `import.meta.env.DEV` constant, not
          // just the runtime `sessionExpired` flag: that flag is already
          // always false in production (see useDevAwareWallet.js), but
          // without this the branch's JSX would still ship as dead code in
          // the production bundle — Rollup can only eliminate a branch
          // whose condition folds to a compile-time constant, not one that
          // merely evaluates false at runtime (see DEV-ONLY REQUIREMENT).
          // A deliberately DIFFERENT shape than the balance HUD, not a
          // variant of it — auth and wallet are independent (see WALLET
          // STATES: "do not collapse auth and wallet into one state"), so
          // this never pretends to be a balance control.
          import.meta.env.DEV && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--warning)]/40 px-3 text-sm font-semibold text-[var(--warning)]">
                <ShieldAlert className="size-4 shrink-0" aria-hidden="true" /> Session expired
              </span>
              <button
                onClick={onManageWallet}
                data-test-id="reconnect"
                className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg bg-[var(--global-cta)] px-3.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Reconnect
              </button>
            </div>
          )
        ) : centerVariant === HEADER_CENTER_VARIANT.DISCONNECTED || centerVariant === HEADER_CENTER_VARIANT.LOGGED_IN_NO_WALLET ? (
          // No wallet connected — nothing real to show in a balance segment
          // (see WALLET STATES: "do not show a fake balance"), so this is a
          // single standalone CTA, not the grouped pill: no empty "Not
          // connected" segment glued beside it, no unused width left behind
          // (see PRIMARY GOAL). Same button — height/radius/type/hover/
          // focus/turquoise — as the connected HUD's Wallet action, just
          // fully rounded (`rounded-lg`, not `rounded-e-lg`) since there's
          // no adjacent segment to seam against.
          <button
            onClick={onManageWallet}
            aria-label="Connect Wallet"
            data-test-id="wallet-hud-action"
            className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg bg-[var(--global-cta)] px-3.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Connect Wallet
          </button>
        ) : (
          <div className="flex h-11 shrink-0 items-stretch">
            <BalanceControl
              open={activePopover === "balance"}
              onOpenChange={(next) => setActivePopover(next ? "balance" : null)}
              casinoBalance={casinoBalance}
              casinoSymbol={casinoSymbol}
              casinoLoading={casinoBalanceLoading}
              casinoBalanceError={casinoBalanceError}
              sportsBalance={sportsBalance}
              sportsSymbol={sportsSymbol}
              wrongNetwork={centerVariant === HEADER_CENTER_VARIANT.WRONG_NETWORK}
              onManageWallet={onManageWallet}
            />

            {centerVariant === HEADER_CENTER_VARIANT.WRONG_NETWORK ? (
              <button
                onClick={onSwitchNetwork}
                data-test-id="switch-network"
                className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-e-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3.5 text-sm font-semibold text-[var(--warning)] hover:bg-[var(--warning)]/20 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Switch network
              </button>
            ) : (
              <button
                onClick={onManageWallet}
                aria-label="Wallet"
                data-test-id="wallet-hud-action"
                className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-e-lg bg-[var(--global-cta)] px-3.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Wallet
              </button>
            )}
          </div>
        )}
      </div>

      {/* RIGHT ZONE: Activity + Profile on desktop, the existing compact
          mobile cluster below `md:`. `ms-auto` keeps it pinned right in
          the mobile `flex` layout; `md:justify-self-end` takes over once
          the header becomes a grid. */}
      <div className="ms-auto flex min-w-0 shrink-0 items-center md:justify-self-end">
        {centerVariant === HEADER_CENTER_VARIANT.SESSION_EXPIRED ? (
          import.meta.env.DEV && (
            <ProfileMenu
              open={activePopover === "profile"}
              onOpenChange={(next) => setActivePopover(next ? "profile" : null)}
              address={address}
              onManageWallet={onManageWallet}
              onResponsibleGambling={onResponsibleGambling}
              onSupport={onSupport}
              onSignOut={disconnect}
            />
          )
        ) : centerVariant === HEADER_CENTER_VARIANT.LOGGED_IN_NO_WALLET ? (
          import.meta.env.DEV && (
            <ProfileMenu
              open={activePopover === "profile"}
              onOpenChange={(next) => setActivePopover(next ? "profile" : null)}
              address={address}
              onManageWallet={onManageWallet}
              onResponsibleGambling={onResponsibleGambling}
              onSupport={onSupport}
              onSignOut={disconnect}
            />
          )
        ) : centerVariant !== HEADER_CENTER_VARIANT.DISCONNECTED ? (
          <>
            {/* Desktop utilities (≥768px). `hidden md:flex` — same CSS-hide
                pattern as everywhere else in this header, so there's never
                a second focusable copy at any width. */}
            <div className="hidden min-w-0 items-center gap-1.5 sm:gap-2 md:flex">
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

            {/* Mobile authenticated cluster (<768px) — unchanged from
                before: a text Fund button once there's room (sm/640px+),
                an icon-only Activity button, and the wallet pill. Fuller
                account/activity access lives in the mobile menu's utility
                section (see MobileFullScreenMenu). */}
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
          // Pure logged-out/disconnected: mobile still needs its own
          // Connect Wallet pill (the center HUD is desktop-only); desktop's
          // Connect Wallet lives in the centered HUD above already, so
          // nothing duplicates it here.
          <div className="md:hidden">
            <WalletButton onManage={onManageWallet} />
          </div>
        )}
      </div>
    </header>
  );
}
