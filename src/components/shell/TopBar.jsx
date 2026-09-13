import { useState } from "react";
import { Menu, ReceiptText, ShieldAlert } from "lucide-react";
import { WalletButton } from "@/components/wallet/WalletButton";
import { BalanceControl } from "@/components/wallet/BalanceControl";
import { ProfileMenu } from "@/components/wallet/ProfileMenu";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { BRAND_NAME } from "@/lib/brand";
import { useDevAwareWallet } from "@/lib/useDevAwareWallet";
import { useCasinoBalance } from "@/lib/casinoBalance";
import { getTopBarMode, HEADER_CENTER_VARIANT, getHeaderCenterVariant } from "@/lib/topBarState";
import { PROFILE_VARIANT, getProfileVariant, getSignOutAction } from "@/lib/profileState";
import { setDevMockState } from "@/lib/devMock";
import { useDevPanelLogoTap } from "@/lib/useDevPanelLogoTap";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";

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
//   Wallet  = manage money      -> the HUD's right half (same FundsDialog flow — Fund and
//                                  "Manage wallet" already resolved to one identical handler)
//   Activity = what happened    -> Activity button (opens BetHistoryDialog)
//   Profile = account/auth      -> ProfileMenu (Wallet, Activity, Responsible Gaming, Support, Sign out)
//
// Profile vs Balance is the same "auth and wallet are independent axes"
// split this whole task is about: `centerVariant` (below, unchanged from
// the earlier HUD task — see DO NOT CHANGE) governs ONLY the Balance+Wallet
// HUD; `profileVariant` (see lib/profileState.js) governs ONLY the Profile
// trigger/menu, computed from the SAME underlying authStatus/isConnected
// inputs but as a genuinely separate decision — the two can and do diverge
// (e.g. "logged in" + "wrong network" shows a normal logged-in Profile menu
// alongside a wrong-network HUD), which is exactly the point.
//
// profileMenuOpen is the ONE piece of state this component owns: whether
// the Profile dropdown is open. The nav wallet control used to be a second
// Popover here too, but it now opens FundsDialog directly with no
// intermediate popover (see WALLET UX REDESIGN) — real account/wallet data
// all still comes straight from useWallet(), never duplicated here.
//
// The burger is desktop-only (≥768px, matching the sidebar rail's own
// breakpoint) — mobile navigation lives entirely in the bottom nav's Menu
// item now (see MobileBottomNav/MobileFullScreenMenu). Below that breakpoint
// the header falls back to `flex` (the three-zone `grid` only applies at
// `md:`) and renders its existing compact mobile form (logo + wallet pill
// only) — the centered HUD is `hidden md:flex`, so it never renders on
// mobile at all (see RESPONSIVE COMPRESSION: "do not force the desktop
// centered HUD onto mobile"). Mobile's own account/menu-layer entry points
// (Responsible Gaming, Support, Sign out) live in App.jsx's mobileMenu
// utility section instead (see MobileFullScreenMenu) — reusing that
// existing full-screen surface rather than adding a second mobile account
// sheet (see OVERLAY BEHAVIOR: "do not stack it with the mobile menu").
export function TopBar({ onBurger, burgerLabel = "Toggle menu", onAccount, onManageWallet, onActivity, mobileActivityEnabled = true, onResponsibleGambling, onSupport, wrongNetwork, onSwitchNetwork, openPositionsCount = 0 }) {
  const wallet = useDevAwareWallet();
  const {
    isConnected, address, casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError, disconnect,
    loggedInNoWallet, sessionExpired, wrongNetworkOverride, authStatus,
  } = wallet;
  // Same underlying dev-aware wallet hook (react-query dedupes the actual
  // network request under the hood) — this just adds the shared
  // status layer on top for the nav wallet control (see lib/casinoBalance.js
  // — one balance model, not a second store).
  const { status: casinoBalanceStatus } = useCasinoBalance();

  // ONE primary balance in the nav: Casino ETH. The MVP is Casino only —
  // Sports/Predictions have no real product surface yet, so the wallet
  // never shows them (see WALLET MVP REDESIGN: "design for the MVP, not
  // for the repository").
  const primaryBalance = casinoBalance;
  const primarySymbol = casinoSymbol;
  const primaryLoading = casinoBalanceLoading;
  const primaryError = casinoBalanceError;
  const primaryStatus = casinoBalanceStatus;

  // Triple-tap the logo toggles the Developer Panel on touch devices, where
  // Shift+D isn't practical (see lib/useDevPanelLogoTap.js).
  const onLogoTap = useDevPanelLogoTap();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Dev Panel's own wallet mock is derived from the REAL wallet App.jsx
  // computed `wrongNetwork` from, so it can't see it — prefer the mock's
  // verdict whenever one is active (see useDevAwareWallet.js).
  const effectiveWrongNetwork = wrongNetworkOverride ?? wrongNetwork;
  const mode = getTopBarMode({ isConnected, wrongNetwork: effectiveWrongNetwork });
  const centerVariant = getHeaderCenterVariant({ sessionExpired, loggedInNoWallet, mode });
  const profileVariant = getProfileVariant({ authStatus, isConnected });

  // Sign Out's one real decision (see lib/profileState.js's
  // getSignOutAction): clear whichever devMock authStatus override is
  // active without touching the real wallet connection, or — when no mock
  // is active — fall back to this app's only real sign-out mechanism
  // (disconnecting the wallet, since wallet.isConnected IS the login signal
  // absent a real auth backend; see SIGN OUT: "use the current mocked auth
  // layer honestly"). Never resets unrelated dev-panel state (balance
  // preset, Platform Scope, etc.) — only the one `authStatus` field.
  const handleSignOut = () => {
    if (DEV_PANEL_ENABLED && getSignOutAction(authStatus) === "reset-auth-mock") {
      setDevMockState({ authStatus: "logged-out" });
    } else {
      disconnect();
    }
    setProfileMenuOpen(false);
  };

  return (
    // SURFACE HIERARCHY POLISH: was bg-background — the header shared the
    // exact same token as the main page canvas, so lifting --background
    // (see index.css) would have moved both together and left zero
    // separation between them. bg-sidebar matches Sidebar.jsx's own root
    // surface (both are "shell chrome", the deepest level in the
    // hierarchy) — header and sidebar now visibly read as one continuous
    // shell surrounding a slightly-lighter page, instead of the header
    // silently tracking whatever the page background happens to be.
    <header className="relative z-40 flex min-h-14 shrink-0 items-center gap-3 border-b bg-sidebar px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))] md:grid md:grid-cols-[1fr_auto_1fr] md:gap-3">
      {/* LEFT ZONE: menu toggle + logo. Logo is now the full brand wordmark
          image (public/img/brand/logo.png), replacing the LogoMark tile +
          text pairing — the mobile triple-tap dev-panel trigger
          (`onLogoTap` below) is unrelated interaction logic and is still
          untouched. */}
      <div className="flex min-w-0 shrink-0 items-center gap-2 md:justify-self-start">
        <button
          onClick={onBurger}
          aria-label={burgerLabel}
          className="hidden size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:grid"
        >
          <Menu className="size-5" />
        </button>

        <div className="flex shrink-0 select-none items-center gap-2" onClick={onLogoTap}>
          <img src="/img/brand/logo.png" alt={BRAND_NAME} className="h-6 w-auto" />
        </div>
      </div>

      {/* CENTER ZONE: the Balance+Wallet transactional HUD — desktop only,
          `hidden md:flex` so it's excluded from both layout AND the a11y
          tree on mobile (same pattern the burger button above already
          uses), never a second focusable copy at any width. Unchanged by
          this task (see DO NOT CHANGE: "centered balance + Wallet HUD"). */}
      <div className="hidden min-w-0 items-center justify-center md:flex md:justify-self-center">
        {centerVariant === HEADER_CENTER_VARIANT.SESSION_EXPIRED ? (
          // Developer-Panel-only state (Developer Panel -> User -> Session
          // expired). Gated on `DEV_PANEL_ENABLED` (devPanelFlag.js),
          // currently `true` in every build including production, so this
          // is reachable there too. A deliberately DIFFERENT shape than the
          // balance HUD, not a variant of it — auth and wallet are
          // independent (see WALLET STATES: "do not collapse auth and
          // wallet into one state"), so this never pretends to be a
          // balance control.
          DEV_PANEL_ENABLED && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-[var(--warning)]/40 px-3 text-sm font-semibold text-[var(--warning)]">
                <ShieldAlert className="size-4 shrink-0" aria-hidden="true" /> Session expired
              </span>
              <button
                onClick={onManageWallet}
                data-test-id="reconnect"
                className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg [background-image:var(--global-cta-gradient)] px-3.5 text-sm font-semibold text-[var(--global-cta-text)] hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
            className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg [background-image:var(--global-cta-gradient)] px-3.5 text-sm font-semibold text-[var(--global-cta-text)] hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Connect Wallet
          </button>
        ) : (
          // ONE combined identity+balance control, no Popover in between
          // (see WALLET UX AUDIT §2/§6/§7 — "click -> wallet popup", never
          // "click -> popover -> Manage wallet -> dialog"). Clicking it
          // opens FundsDialog directly. Wrong-network keeps its own
          // standing "Switch network" action glued beside it — that flow
          // is explicitly unchanged, not part of this redesign.
          <div className="flex h-11 shrink-0 items-stretch gap-1.5">
            <BalanceControl
              address={address}
              primaryBalance={primaryBalance}
              primarySymbol={primarySymbol}
              primaryLoading={primaryLoading}
              primaryError={primaryError}
              primaryStatus={primaryStatus}
              wrongNetwork={centerVariant === HEADER_CENTER_VARIANT.WRONG_NETWORK}
              onManageWallet={onManageWallet}
            />

            {centerVariant === HEADER_CENTER_VARIANT.WRONG_NETWORK && (
              <button
                onClick={onSwitchNetwork}
                data-test-id="switch-network"
                className="flex h-11 shrink-0 items-center whitespace-nowrap rounded-lg border border-[var(--warning)]/40 bg-[var(--warning)]/10 px-3.5 text-sm font-semibold text-[var(--warning)] hover:bg-[var(--warning)]/20 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Switch network
              </button>
            )}
          </div>
        )}
      </div>

      {/* RIGHT ZONE: Activity (logged in only) + Profile. Profile is the
          final right-side control and is ALWAYS present on desktop — even
          logged out it shows a guest-state trigger (see PRIMARY GOAL /
          LOGGED-OUT STATE) — driven entirely by `profileVariant`,
          independent of `centerVariant` above. `ms-auto` keeps it pinned
          right in the mobile `flex` layout; `md:justify-self-end` takes
          over once the header becomes a grid. */}
      <div className="ms-auto flex min-w-0 shrink-0 items-center md:justify-self-end">
        {/* Desktop utilities (≥768px). `hidden md:flex` — same CSS-hide
            pattern as everywhere else in this header, so there's never a
            second focusable copy at any width (see RESPONSIVE TESTING:
            "Desktop menu does not render on mobile"). */}
        <div className="hidden min-w-0 items-center gap-1.5 sm:gap-2 md:flex">
          {profileVariant === PROFILE_VARIANT.LOGGED_IN && (
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
          )}

          <ProfileMenu
            open={profileMenuOpen}
            onOpenChange={setProfileMenuOpen}
            variant={profileVariant}
            address={address}
            isConnected={isConnected}
            onAccount={onAccount}
            onManageWallet={onManageWallet}
            onActivity={onActivity}
            onResponsibleGambling={onResponsibleGambling}
            onSupport={onSupport}
            onSignOut={handleSignOut}
          />
        </div>

        {/* Mobile authenticated cluster (<768px) — the wallet pill always
            reflects real wallet connection regardless of profileVariant
            (see SESSION-EXPIRED: "preserve wallet connection state
            separately"); Activity is an authenticated-account action, gated
            the same way it is on desktop, PLUS `mobileActivityEnabled` —
            App.jsx passes the same platformScope-derived MVP flag it uses
            for the mobile burger menu's Activity row (see
            lib/platformScope.js's isFullPlatformFeatureEnabled), so this
            standalone icon can't outlive that row as a leftover Activity
            entry point (see CASINO-ONLY MVP AUDIT). The standalone "Fund" button that
            used to sit here was removed — it opened the exact same
            FundsDialog as the wallet pill beside it (see WALLET UX AUDIT
            §4 — "duplicate of #4"), so tapping the pill is now the one way
            in, matching desktop's single combined control. */}
        <div className="flex items-center gap-2 md:hidden">
          {profileVariant === PROFILE_VARIANT.LOGGED_IN && mobileActivityEnabled && (
            <button
              onClick={onActivity}
              aria-label="Activity"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ReceiptText className="size-5" />
            </button>
          )}
          <WalletButton
            onManage={onManageWallet}
            isConnected={isConnected}
            address={address}
            primaryBalance={primaryBalance}
            primarySymbol={primarySymbol}
            primaryLoading={primaryLoading}
            primaryError={primaryError}
            wrongNetwork={effectiveWrongNetwork}
          />
        </div>
      </div>
    </header>
  );
}
