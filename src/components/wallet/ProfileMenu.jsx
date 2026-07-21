import { useRef } from "react";
import { User, ChevronDown, Wallet as WalletIcon, ShieldCheck, ShieldAlert, LifeBuoy, LogOut, LogIn, ReceiptText } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { shortAddress } from "@/web3/useWallet";
import { PROFILE_VARIANT } from "@/lib/profileState";

// The one account entry point in the global shell (see PRIMARY GOAL) — a
// single component rendering three distinct bodies by `variant` rather than
// three separately-rendered `<ProfileMenu>` instances (TopBar.jsx used to
// pick between three near-duplicate call sites; see lib/profileState.js's
// getProfileVariant for how `variant` itself is decided). Only ever links to
// destinations that genuinely exist: Wallet (FundsDialog), Activity
// (BetHistoryDialog), Responsible Gaming and Support (both dialogs, see
// ResponsibleGamblingDialog/SupportDialog) and Sign out. No Settings,
// Security, or VIP row — none of those have a real surface anywhere in this
// app yet, so per PROFILE STATES/LOGGED-IN MENU ("omit destinations that do
// not exist", "do not create dead-end menu items") they're left out
// entirely rather than faked; the architecture (one menu, one row per real
// destination) is exactly how they'd slot in once they exist.
//
// `open`/`onOpenChange` are controlled by TopBar (one shared `activePopover`
// state — see OVERLAY OWNERSHIP), not owned locally.
export function ProfileMenu({ open, onOpenChange, variant, address, isConnected, onManageWallet, onActivity, onResponsibleGambling, onSupport, onSignOut }) {
  const triggerRef = useRef(null);
  const isLoggedIn = variant === PROFILE_VARIANT.LOGGED_IN;
  const isExpired = variant === PROFILE_VARIANT.SESSION_EXPIRED;

  // The trigger's accessible name IS how "current user state is announced"
  // (see ACCESSIBILITY) — it changes with `variant`, so a screen reader
  // reading the control always reports the state actually showing, not a
  // static "Profile" label regardless of session/wallet state. `isExpired`
  // can only be true in dev (see profileState.js's getProfileVariant — the
  // session-expired mock has no real-world equivalent), so this leads with
  // the build-time `import.meta.env.DEV` constant: Rollup can only
  // eliminate a branch whose condition folds to a compile-time constant,
  // not one that merely evaluates false at runtime (see DEV-ONLY
  // REQUIREMENT — same fix as TopBar.jsx's session-expired HUD block).
  const triggerLabel = import.meta.env.DEV && isExpired
    ? "Account, session expired"
    : isLoggedIn
      ? `Account, ${address ? shortAddress(address) : "signed in"}`
      : "Account, not signed in";

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenuPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          aria-label={triggerLabel}
          data-test-id="profile-trigger"
          className={cn(
            "flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-transparent px-1.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            open && "bg-secondary"
          )}
        >
          <span
            className={cn(
              "grid size-7 shrink-0 place-items-center rounded-full",
              isExpired ? "bg-[var(--warning)]/15 text-[var(--warning)]" : "bg-secondary text-muted-foreground"
            )}
          >
            {isExpired ? <ShieldAlert className="size-4" aria-hidden="true" /> : <User className="size-4" aria-hidden="true" />}
          </span>
          <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          aria-label="Account menu"
          onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus(); }}
          className="z-[var(--z-header-popover)] w-60 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {import.meta.env.DEV && isExpired ? (
            <>
              {/* A deliberately different shape than the logged-in summary —
                  never exposes the account identifier here (see SESSION
                  EXPIRED: "do not expose authenticated account details").
                  Icon + text, not color-only (see ACCESSIBILITY). */}
              <div className="flex items-center gap-2 px-2 py-1.5 text-sm font-semibold text-[var(--warning)]">
                <ShieldAlert className="size-4 shrink-0" aria-hidden="true" /> Session expired
              </div>
              <p className="px-2 pb-1.5 text-xs text-muted-foreground">Log in again to access your account.</p>
              <DropdownMenuPrimitive.Separator className="my-1 border-t" />
              <MenuItem icon={LogIn} label="Log in again" onSelect={onManageWallet} testId="profile-reconnect" />
              <MenuItem icon={ShieldCheck} label="Responsible Gaming" onSelect={onResponsibleGambling} />
              <MenuItem icon={LifeBuoy} label="Support" onSelect={onSupport} />
            </>
          ) : isLoggedIn ? (
            <>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <User className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{address ? shortAddress(address) : "Account"}</div>
                  {/* Wallet state shown here, never conflated with the fact
                      that the account itself IS logged in (see PROFILE
                      STATES: "do not derive authentication from wallet
                      connection" — this line is display-only). */}
                  <div className="truncate text-xs text-muted-foreground">{isConnected ? "Wallet connected" : "Wallet not connected"}</div>
                </div>
              </div>
              <DropdownMenuPrimitive.Separator className="my-1 border-t" />
              <MenuItem icon={WalletIcon} label={isConnected ? "Wallet" : "Connect wallet"} onSelect={onManageWallet} />
              <MenuItem icon={ReceiptText} label="Activity" onSelect={onActivity} />
              <MenuItem icon={ShieldCheck} label="Responsible Gaming" onSelect={onResponsibleGambling} />
              <MenuItem icon={LifeBuoy} label="Support" onSelect={onSupport} />
              <DropdownMenuPrimitive.Separator className="my-1 border-t" />
              <MenuItem icon={LogOut} label="Sign out" onSelect={onSignOut} testId="profile-signout" />
            </>
          ) : (
            <>
              {/* Guest state — the only real primary action here is
                  connecting a wallet (see LOGGED-OUT STATE: "Do not imply
                  that connecting a wallet automatically logs the player
                  in" — this label says exactly what it does, nothing is
                  disguised as a separate "Log in"/"Create account" flow
                  that doesn't exist anywhere in this app; see also DO NOT
                  ADD: "unsupported destinations"). */}
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Not signed in</div>
              <DropdownMenuPrimitive.Separator className="my-1 border-t" />
              <MenuItem icon={WalletIcon} label="Connect wallet" onSelect={onManageWallet} testId="profile-connect" />
              <MenuItem icon={ShieldCheck} label="Responsible Gaming" onSelect={onResponsibleGambling} />
              <MenuItem icon={LifeBuoy} label="Support" onSelect={onSupport} />
            </>
          )}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}

function MenuItem({ icon: Icon, label, onSelect, testId }) {
  return (
    <DropdownMenuPrimitive.Item
      onSelect={onSelect}
      data-test-id={testId}
      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-secondary hover:text-foreground focus:bg-secondary focus:text-foreground"
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" /> {label}
    </DropdownMenuPrimitive.Item>
  );
}
