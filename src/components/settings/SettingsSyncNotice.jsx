import { Check, CloudOff, Loader2, RefreshCw, TriangleAlert, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { SYNC_STATE, usePlayerSettings } from "@/lib/usePlayerSettings.jsx";
import { track } from "@/lib/telemetry";

// The one place the app tells the player where their settings actually live.
// Shown wherever settings are edited (Responsible Gaming, Account preferences)
// so the answer is never left implicit.
//
// Every branch below states something true. That is the whole point of this
// component: "saved" means different things depending on whether a wallet is
// connected, whether it has signed, and whether the server has durable storage
// configured, and a single cheerful "Saved" label across all of those would be a
// lie in at least three of them.
export function SettingsSyncNotice() {
  const { isConnected } = useAccount();
  const { syncState, isSignedIn, persistent, canOfferSync, enableSync } = usePlayerSettings();

  const syncNow = async () => {
    track("settings_sync_requested", {});
    const ok = await enableSync();
    track("settings_sync_result", { ok });
  };

  // No wallet at all: settings genuinely work, and genuinely do not follow the
  // player anywhere. Both halves said plainly.
  if (!isConnected) {
    return (
      <Notice icon={CloudOff} testId="settings-sync-local">
        Saved on this device. Connect a wallet to keep these settings across devices.
      </Notice>
    );
  }

  if (syncState === SYNC_STATE.SIGNING) {
    return <Notice icon={Loader2} spin testId="settings-sync-signing">Waiting for your wallet to sign…</Notice>;
  }

  if (syncState === SYNC_STATE.SYNCING) {
    return <Notice icon={Loader2} spin testId="settings-sync-saving">Saving to your wallet…</Notice>;
  }

  if (syncState === SYNC_STATE.ERROR) {
    return (
      <Notice icon={TriangleAlert} tone="warning" testId="settings-sync-error" action={{ label: "Try again", icon: RefreshCw, onClick: syncNow }}>
        Saved on this device, but syncing failed.
      </Notice>
    );
  }

  // Declined, or simply never asked — either way there is something local worth
  // syncing and one signature would do it. Offered, never forced, and never
  // re-prompted automatically (see usePlayerSettings.jsx).
  if (canOfferSync || syncState === SYNC_STATE.DECLINED) {
    return (
      <Notice icon={CloudOff} testId="settings-sync-offer" action={{ label: "Sync to wallet", icon: Wallet, onClick: syncNow }}>
        Saved on this device. Sign once with your wallet to use them on any device.
      </Notice>
    );
  }

  if (isSignedIn && !persistent) {
    // The server is running without durable storage configured (see
    // api/_kv.js). Claiming these settings are synced would be false, so it
    // says what is actually true instead.
    return (
      <Notice icon={TriangleAlert} tone="warning" testId="settings-sync-ephemeral">
        Saved on this device. Cross-device sync isn't available on this deployment yet.
      </Notice>
    );
  }

  if (isSignedIn && syncState === SYNC_STATE.SYNCED) {
    return <Notice icon={Check} tone="success" testId="settings-sync-synced">Saved to your wallet. These settings follow you to any device.</Notice>;
  }

  return <Notice icon={CloudOff} testId="settings-sync-idle">Saved on this device.</Notice>;
}

const TONE_CLASS = {
  default: "text-muted-foreground",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
};

function Notice({ icon: Icon, children, tone = "default", spin = false, action = null, testId }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-dashed p-3 text-xs" data-test-id={testId}>
      <span className={`flex items-center gap-1.5 ${TONE_CLASS[tone]}`}>
        <Icon className={`size-3.5 shrink-0 ${spin ? "animate-spin" : ""}`} aria-hidden="true" />
        <span>{children}</span>
      </span>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          data-test-id={`${testId}-action`}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <action.icon className="size-3.5" aria-hidden="true" /> {action.label}
        </button>
      )}
    </div>
  );
}
