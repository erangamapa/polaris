import { useEffect } from "react";
import { ShieldAlert, ShieldOff, Clock, Fingerprint, MapPinOff, AlertTriangle, Loader2 } from "lucide-react";
import { track } from "@/lib/telemetry";

// The one shared compliance-blocking surface (see BLOCKING SURFACE: "use
// one shared compliance-blocking component... do not create separate
// visually inconsistent blocking modals"). Pure presentation — callers
// decide whether to wrap it in a Dialog (a blocked game-launch attempt) or
// render it inline (the Responsible Gaming hub's own persistent status
// banner — see SELF-EXCLUDED / COOL-OFF ACTIVE STATE: "use a calm
// persistent status... not... repeatedly show blocking modals"). Never
// renders a raw internal reason/status code — only the safe title/message
// the caller supplies from lib/complianceState.js's fixed copy table (see
// RESTRICTED ACCOUNT STATE: "hide raw internal risk/review codes").
const ICON_BY_STATUS = {
  "kyc-required": Fingerprint,
  "kyc-pending": Clock,
  "kyc-failed": ShieldAlert,
  "restricted": ShieldOff,
  "region-blocked": MapPinOff,
  "age-restricted": ShieldAlert,
  "self-excluded": ShieldOff,
  "cool-off": Clock,
  "error": AlertTriangle,
  "loading": Loader2,
};

export function ComplianceBlock({ status, title, message, primaryAction, secondaryAction, className }) {
  useEffect(() => {
    track("compliance_block_shown", { status });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per status shown, not on every unrelated re-render
  }, [status]);

  const Icon = ICON_BY_STATUS[status] ?? ShieldAlert;
  const runAction = (action) => {
    track("compliance_action_selected", { status, action: action.trackingId ?? action.label });
    action.onClick();
  };

  return (
    <div
      className={`flex flex-col items-center gap-3 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-bg)] p-6 text-center ${className ?? ""}`}
      data-test-id="compliance-block"
      data-compliance-status={status}
    >
      <Icon className={`size-8 text-[var(--warning)] ${status === "loading" ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden="true" />
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {message && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{message}</p>}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="mt-1 flex flex-wrap justify-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={() => runAction(primaryAction)}
              data-test-id="compliance-block-primary"
              className="global-cta-scrim rounded-lg [background-image:var(--global-cta-gradient)] px-4 py-2 text-sm font-bold text-white hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={() => runAction(secondaryAction)}
              data-test-id="compliance-block-secondary"
              className="rounded-lg border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
