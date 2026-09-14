import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { MicroLabel } from "@/components/ui/micro-label";
import { User, ShieldCheck, ShieldAlert, LifeBuoy, LogOut, LogIn, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import { shortAddress } from "@/web3/useWallet";
import { PROFILE_VARIANT, getAccountAuthMethod } from "@/lib/profileState";
import { useCurrency, CURRENCIES } from "@/lib/currency";
import { useOddsFormat } from "@/lib/odds";
import { usePlayerSettings } from "@/lib/usePlayerSettings.jsx";
import { SettingsSyncNotice } from "@/components/settings/SettingsSyncNotice";
import { track } from "@/lib/telemetry";

const AUTH_METHOD_LABEL = { wallet: "Wallet", unknown: "Unknown" };

const NOTIFICATION_OPTIONS = [
  { key: "betSettled", label: "Bet settled" },
  { key: "largeWins", label: "Large wins" },
  { key: "promotions", label: "Promotions and bonuses" },
];

// The one Account destination in the app — reached from ProfileMenu.jsx
// (desktop popover) and the mobile menu's account section, both of which
// already compute the SAME `profileVariant`/`address`/`isConnected` this
// reads (see App.jsx) rather than this dialog deriving its own copy of
// account state (see ONE SHARED ACCOUNT MODEL: "do not create separate
// profile/account stores"). Sections that have nothing real to show are
// omitted entirely rather than rendered empty or faked (see DATA HONESTY) —
// this app has no email/username/avatar/2FA/session-list/notification
// system, so Profile only ever has a wallet address, Security only ever has
// a sign-in-method line + an honest "not available" note, and Sessions only
// ever has the current session (no device list exists to show).
export function AccountDialog({
  open, onClose, variant, address, isConnected, authStatus,
  onSignOut, onManageWallet, onResponsibleGambling, onSupport, onCloseAutoFocus,
}) {
  const [tab, setTab] = useState("profile");
  const { currency, setCurrency } = useCurrency();
  const { format: oddsFormat, setFormat: setOddsFormat } = useOddsFormat();
  const { settings, updateGroup } = usePlayerSettings();
  const isLoggedIn = variant === PROFILE_VARIANT.LOGGED_IN;
  const isExpired = variant === PROFILE_VARIANT.SESSION_EXPIRED;
  const authMethod = getAccountAuthMethod({ authStatus, isConnected });

  useEffect(() => {
    if (open) track("account_opened", { accountStatus: variant });
  }, [open, variant]);

  const selectTab = (next) => {
    setTab(next);
    track("account_section_viewed", { section: next });
  };

  const signInSelected = () => { track("account_sign_in_selected", {}); onManageWallet(); };
  const signOutSelected = () => { track("account_sign_out_selected", {}); onSignOut(); track("account_sign_out_completed", {}); onClose(); };
  const supportSelected = () => { track("account_support_selected", { source: "account" }); onSupport(); };
  const rgSelected = () => { track("account_responsible_gaming_selected", { source: "account" }); onResponsibleGambling(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-test-id="account-dialog" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="size-4" aria-hidden="true" /> Account
          </DialogTitle>
        </DialogHeader>

        {isExpired ? (
          <SessionExpiredBody onSignIn={signInSelected} onSupport={supportSelected} onResponsibleGambling={rgSelected} />
        ) : !isLoggedIn ? (
          <LoggedOutBody onSignIn={signInSelected} onSupport={supportSelected} onResponsibleGambling={rgSelected} />
        ) : (
          <>
            <Tabs value={tab} onValueChange={selectTab}>
              <TabsList className="w-full">
                <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
                <TabsTrigger value="security" className="flex-1">Security</TabsTrigger>
                <TabsTrigger value="sessions" className="flex-1">Sessions</TabsTrigger>
                <TabsTrigger value="preferences" className="flex-1">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-3 space-y-3">
                <Field label="Wallet address">
                  <span className="font-mono text-sm" data-test-id="account-address">{address ? shortAddress(address) : "Not connected"}</span>
                </Field>
                <Field label="Sign-in method">
                  <span className="text-sm">{authMethod ? AUTH_METHOD_LABEL[authMethod] : "—"}</span>
                </Field>
                {/* No display name/username/email/avatar exist anywhere in
                    this app's real data — none are rendered here rather than
                    shown as blank/placeholder fields (see PROFILE SECTION:
                    "no placeholder personal information"). */}
              </TabsContent>

              <TabsContent value="security" className="mt-3 space-y-3">
                <Field label="Sign-in method">
                  <span className="text-sm">{authMethod ? AUTH_METHOD_LABEL[authMethod] : "—"}</span>
                </Field>
                <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground" data-test-id="account-security-note">
                  Additional security controls are not available in this prototype.
                </p>
              </TabsContent>

              <TabsContent value="sessions" className="mt-3 space-y-3">
                {/* No backend session store exists — only the current
                    browser session (this connection) can be shown honestly;
                    no device list, no "sign out all sessions" (see ACTIVE
                    SESSIONS: "do not invent... do not create a fake session
                    list"). */}
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span>Current session</span>
                    <MicroLabel>This device</MicroLabel>
                  </div>
                  <button
                    type="button"
                    onClick={signOutSelected}
                    data-test-id="account-session-sign-out"
                    className="text-sm font-semibold text-[var(--danger)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sign out
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Other active sessions aren't available to manage in this prototype.</p>
              </TabsContent>

              <TabsContent value="preferences" className="mt-3 space-y-3">
                {/* Both of these are persisted per wallet now, not per browser
                    (see lib/usePlayerSettings.jsx) — still read through their
                    existing providers rather than a second store (see
                    PREFERENCES: "use existing setting state"), those providers
                    are just backed by the settings store now. Theme and
                    language remain genuinely unsupported (no toggle, no i18n
                    anywhere in this app) and stay omitted rather than faked. */}
                <Field label="Display currency">
                  <select
                    value={currency}
                    onChange={(e) => { setCurrency(e.target.value); track("account_preference_changed", { preference: "currency" }); }}
                    data-test-id="account-currency-select"
                    className="rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {CURRENCIES.map((c) => <option key={c.id} value={c.id}>{c.id}</option>)}
                  </select>
                </Field>

                <Field label="Odds format">
                  <select
                    value={oddsFormat}
                    onChange={(e) => { setOddsFormat(e.target.value); track("account_preference_changed", { preference: "oddsFormat" }); }}
                    data-test-id="account-odds-format-select"
                    className="rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="decimal">Decimal</option>
                    <option value="fractional">Fractional</option>
                    <option value="american">American</option>
                  </select>
                </Field>

                {/* NOTIFICATIONS — saved, and honestly labelled as not yet
                    delivered. No notification system exists in this app, so
                    presenting these as live alerts would be the same fake-form
                    pattern the Responsible Gaming dialog had to have removed.
                    They are kept because the player's choice is worth
                    remembering for when delivery ships. */}
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="text-sm font-semibold">Notifications</span>
                    <span className="text-[11px] text-muted-foreground">Saved — not delivered yet.</span>
                  </div>
                  {NOTIFICATION_OPTIONS.map((option) => (
                    <label key={option.key} className="flex min-h-9 items-center justify-between gap-3 text-sm text-muted-foreground">
                      <span>{option.label}</span>
                      <input
                        type="checkbox"
                        checked={settings.notifications[option.key]}
                        onChange={(e) => {
                          updateGroup("notifications", { [option.key]: e.target.checked });
                          track("account_preference_changed", { preference: `notifications.${option.key}` });
                        }}
                        data-test-id={`account-notify-${option.key}`}
                        className="size-4 accent-[var(--global-cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </label>
                  ))}
                  <p className="text-xs text-muted-foreground" data-test-id="account-notifications-note">
                    We'll use these once in-app notifications are available. Nothing is sent today.
                  </p>
                </div>

                <SettingsSyncNotice />
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={rgSelected} data-test-id="account-rg" className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <ShieldCheck className="size-4" aria-hidden="true" /> Responsible Gaming
                </button>
                <button type="button" onClick={supportSelected} data-test-id="account-support" className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <LifeBuoy className="size-4" aria-hidden="true" /> Support
                </button>
              </div>
              <button type="button" onClick={signOutSelected} data-test-id="account-signout" className="flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-semibold text-[var(--danger)] hover:bg-secondary">
                <LogOut className="size-4" aria-hidden="true" /> Sign out
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="min-w-0 max-w-[60%] truncate text-right">{children}</div>
    </div>
  );
}

function SessionExpiredBody({ onSignIn, onSupport, onResponsibleGambling }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center" data-test-id="account-session-expired">
      <ShieldAlert className="size-8 text-[var(--warning)]" aria-hidden="true" />
      <h2 className="text-base font-semibold">Session expired</h2>
      <p className="text-sm text-muted-foreground">Sign in again to continue using your account.</p>
      <button type="button" onClick={onSignIn} data-test-id="account-signin-again" className="global-cta-scrim mt-1 rounded-lg [background-image:var(--global-cta-gradient)] px-4 py-2 text-sm font-bold text-white hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)]">
        Sign in again
      </button>
      <div className="mt-2 flex gap-4 text-sm">
        <button type="button" onClick={onResponsibleGambling} className="text-muted-foreground hover:text-foreground hover:underline">Responsible Gaming</button>
        <button type="button" onClick={onSupport} className="text-muted-foreground hover:text-foreground hover:underline">Support</button>
      </div>
    </div>
  );
}

function LoggedOutBody({ onSignIn, onSupport, onResponsibleGambling }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center" data-test-id="account-logged-out">
      <User className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-base font-semibold">Sign in to access your account</h2>
      <button type="button" onClick={onSignIn} data-test-id="account-signin" className="global-cta-scrim mt-1 flex items-center gap-1.5 rounded-lg [background-image:var(--global-cta-gradient)] px-4 py-2 text-sm font-bold text-white hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)]">
        <LogIn className="size-4" aria-hidden="true" /> Sign in
      </button>
      <div className="mt-2 flex gap-4 text-sm">
        <button type="button" onClick={onResponsibleGambling} className="text-muted-foreground hover:text-foreground hover:underline">Responsible Gaming</button>
        <button type="button" onClick={onSupport} className="text-muted-foreground hover:text-foreground hover:underline">Support</button>
      </div>
    </div>
  );
}

// Loading/error states are exported for reuse rather than duplicated where
// account fetch failures might one day be real — this app's account state
// is derived synchronously today (see App.jsx's profileVariant, computed
// straight from devMock + wallet.isConnected, never actually async), so
// neither of these is reachable in production; kept ready, not wired to a
// fake trigger (see DEV PANEL: "do not present mock Developer Panel values
// as production truth").
export function AccountLoadingSkeleton() {
  return (
    <div className="space-y-3" data-test-id="account-loading" aria-hidden="true">
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Skeleton className="size-8 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

export function AccountErrorBody({ onRetry, onSupport }) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center" data-test-id="account-error">
      <AlertTriangle className="size-8 text-amber-400" aria-hidden="true" />
      <h2 className="text-base font-semibold">Unable to load account</h2>
      <p className="text-sm text-muted-foreground">Try again in a moment.</p>
      <div className="mt-1 flex gap-2">
        <button type="button" onClick={onRetry} className="global-cta-scrim rounded-lg [background-image:var(--global-cta-gradient)] px-3 py-1.5 text-sm font-bold text-white hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)]">Try again</button>
        <button type="button" onClick={onSupport} className="flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
          <ExternalLink className="size-3.5" aria-hidden="true" /> Contact support
        </button>
      </div>
    </div>
  );
}
