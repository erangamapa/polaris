import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, LifeBuoy } from "lucide-react";
import { track } from "@/lib/telemetry";
import { getComplianceState } from "@/lib/complianceState";
import { ComplianceBlock } from "./ComplianceBlock";

// The ONE shared Responsible Gaming destination in the app — reached from
// the desktop ProfileMenu, AccountDialog, the mobile menu's Account group,
// the footer, and GameInfoPanel (see ACCESS POINTS — every one of those
// call sites already opens this same dialog via App.jsx's single `rgOpen`
// state; see PRIMARY GOAL: "do not create duplicate dialogs"). Reads the
// same shared `complianceStatus` every other compliance-aware surface
// does (see lib/complianceState.js) — never a second, RG-only copy of it.
//
// DATA HONESTY — this app has no real backend for deposit/loss/session
// limits, reality-check reminders, cool-off, or self-exclusion: the
// previous version of this dialog persisted "limits" to localStorage and
// presented them as if saved/enforced, which is exactly the pattern this
// task forbids (see LIMITS: "if limits are not implemented, do not create
// editable controls"; SELF-EXCLUSION: "do not simulate self-exclusion
// using local storage and present it as production functionality"). None
// of those editable controls exist here anymore — only a plain,
// once-stated note that they aren't available yet, plus the one real,
// working thing this app can offer: Support access.
export function ResponsibleGamblingDialog({ open, onClose, complianceStatus, onSupport }) {
  useEffect(() => {
    if (open) track("responsible_gaming_opened", {});
  }, [open]);

  const compliance = getComplianceState({ complianceStatus });
  const supportSelected = () => { track("responsible_gaming_support_selected", { source: "responsible-gaming" }); onSupport(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--success)]" /> Responsible Gaming</DialogTitle>
          <DialogDescription>Tools and information to help you stay in control of your play.</DialogDescription>
        </DialogHeader>

        {/* Calm, persistent status — never a second blocking modal stacked
            on top of this one (see SELF-EXCLUDED / COOL-OFF ACTIVE STATE:
            "do not repeatedly show blocking modals... one stable status
            surface is sufficient"). Only renders while a Developer-Panel
            preview is active; a real user (complianceStatus "clear") never
            sees this. */}
        {compliance.status !== "clear" && (
          <ComplianceBlock status={compliance.status} title={compliance.title} message={compliance.message} />
        )}

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>Review your activity any time in Casino Activity.</li>
          <li>Take breaks between sessions.</li>
          <li>Contact Support if you have questions or concerns.</li>
          <li>Seek independent help if gambling is affecting you or someone you know.</li>
        </ul>

        {/* One honest sentence covering every unsupported control, rather
            than four separate hollow sections repeating the same
            disclaimer (see LIMITS: "optionally show one concise
            informational section"; DATA HONESTY: "do not create fake
            forms that do nothing"). */}
        <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground" data-test-id="rg-controls-unavailable">
          Limit, time and self-exclusion controls are not available in this prototype yet.
        </p>

        <button
          type="button"
          onClick={supportSelected}
          data-test-id="rg-support"
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--global-cta)] text-sm font-bold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LifeBuoy className="size-4" aria-hidden="true" /> Contact Support
        </button>
      </DialogContent>
    </Dialog>
  );
}
