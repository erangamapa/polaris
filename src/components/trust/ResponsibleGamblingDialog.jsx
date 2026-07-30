import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShieldCheck, LifeBuoy, Info } from "lucide-react";
import { REALITY_CHECK_INTERVALS, LIMIT_PERIODS, normalizeLimitAmount } from "@shared/playerSettings";
import { track } from "@/lib/telemetry";
import { getComplianceState } from "@/lib/complianceState";
import { usePlayerSettings } from "@/lib/usePlayerSettings.jsx";
import { useCurrency } from "@/lib/currency";
import { SettingsSyncNotice } from "@/components/settings/SettingsSyncNotice";
import { ComplianceBlock } from "./ComplianceBlock";

// The ONE shared Responsible Gaming destination in the app — reached from the
// desktop ProfileMenu, AccountDialog, the mobile menu's Account group, the
// footer, and GameInfoPanel (see ACCESS POINTS — every one of those call sites
// already opens this same dialog via App.jsx's single `rgOpen` state; see
// PRIMARY GOAL: "do not create duplicate dialogs"). Reads the same shared
// `complianceStatus` every other compliance-aware surface does (see
// lib/complianceState.js) — never a second, RG-only copy of it.
//
// DATA HONESTY — this dialog once had editable limit controls that wrote to
// localStorage and presented themselves as enforced. They were deleted for
// exactly the right reason: nothing was enforcing them. Controls are back now
// because settings genuinely persist per wallet (see lib/usePlayerSettings.jsx
// and api/settings.js), but PERSISTING A LIMIT IS NOT ENFORCING ONE, and the
// difference is stated on the controls themselves rather than left for the
// player to assume:
//
//   Reality-check reminder -> ENFORCED. lib/useRealityCheck.js runs a real timer
//                             and really does interrupt play.
//   Deposit / loss limits  -> SAVED ONLY. Enforcing them needs deposit
//                             interception and cross-chain bet accounting this
//                             app does not have. Labelled as a saved preference,
//                             never as an active cap.
//
// Cool-off and self-exclusion are still absent, deliberately. They are the two
// controls where "saved but not enforced" would be actively harmful — a player
// who believes they are self-excluded and is not has been failed by the product
// — so no control is offered until something can genuinely enforce them.
export function ResponsibleGamblingDialog({ open, onClose, complianceStatus, onSupport, onCloseAutoFocus }) {
  const { settings, updateGroup } = usePlayerSettings();
  const { currency } = useCurrency();
  const rg = settings.responsibleGaming;

  useEffect(() => {
    if (open) track("responsible_gaming_opened", {});
  }, [open]);

  const compliance = getComplianceState({ complianceStatus });
  const supportSelected = () => { track("responsible_gaming_support_selected", { source: "responsible-gaming" }); onSupport(); };

  const setLimit = (key, patch) => {
    updateGroup("responsibleGaming", { [key]: { ...rg[key], ...patch } });
    track("responsible_gaming_limit_changed", { limit: key });
  };

  const setRealityCheck = (value) => {
    const minutes = value === "off" ? null : Number(value);
    updateGroup("responsibleGaming", { realityCheckMinutes: minutes });
    track("responsible_gaming_reality_check_changed", { intervalMinutes: minutes });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-md overflow-y-auto" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--success)]" /> Responsible Gaming</DialogTitle>
          <DialogDescription>Tools and information to help you stay in control of your play.</DialogDescription>
        </DialogHeader>

        {/* Calm, persistent status — never a second blocking modal stacked on
            top of this one (see SELF-EXCLUDED / COOL-OFF ACTIVE STATE: "do not
            repeatedly show blocking modals... one stable status surface is
            sufficient"). Only renders while a Developer-Panel preview is
            active; a real user (complianceStatus "clear") never sees this. */}
        {compliance.status !== "clear" && (
          <ComplianceBlock status={compliance.status} title={compliance.title} message={compliance.message} />
        )}

        <Section title="Reality check" note="Active — this reminder really runs.">
          <Field label="Remind me while I'm playing" htmlFor="rg-reality-check">
            <select
              id="rg-reality-check"
              value={rg.realityCheckMinutes ?? "off"}
              onChange={(e) => setRealityCheck(e.target.value)}
              data-test-id="rg-reality-check"
              className="rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="off">Off</option>
              {REALITY_CHECK_INTERVALS.map((m) => (
                <option key={m} value={m}>{m >= 60 ? `Every ${m / 60} hour${m === 60 ? "" : "s"}` : `Every ${m} min`}</option>
              ))}
            </select>
          </Field>
          <p className="text-xs text-muted-foreground">
            Counts from when you open the app. Reloading the page starts a new session.
          </p>
        </Section>

        <Section title="Limits" note="Saved to your account — not yet enforced automatically.">
          <LimitField
            id="rg-deposit-limit"
            label="Deposit limit"
            currency={currency}
            limit={rg.depositLimit}
            onChange={(patch) => setLimit("depositLimit", patch)}
          />
          <LimitField
            id="rg-loss-limit"
            label="Loss limit"
            currency={currency}
            limit={rg.lossLimit}
            onChange={(patch) => setLimit("lossLimit", patch)}
          />
          {/* The honest disclaimer, attached to the controls it applies to
              rather than buried at the bottom of the dialog. */}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground" data-test-id="rg-limits-not-enforced">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            <span>
              These are saved as your stated limits and will apply when automatic enforcement ships. They do not block deposits or bets today —
              please don't rely on them to stop play.
            </span>
          </p>
        </Section>

        <SettingsSyncNotice />

        <Section title="Staying in control">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>Review your activity any time in Casino Activity.</li>
            <li>Take breaks between sessions.</li>
            <li>Contact Support if you have questions or concerns.</li>
            <li>Seek independent help if gambling is affecting you or someone you know.</li>
          </ul>
          {/* Cool-off and self-exclusion: named as absent rather than silently
              missing, so a player looking for them knows they are not hidden
              somewhere else in the app. */}
          <p className="text-xs text-muted-foreground" data-test-id="rg-exclusion-unavailable">
            Cool-off and self-exclusion aren't available yet. Contact Support if you need to stop playing.
          </p>
        </Section>

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

function Section({ title, note, children }) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {note && <span className="text-[11px] text-muted-foreground">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <label htmlFor={htmlFor} className="text-sm text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// A limit is an amount plus a period, and the amount needs local draft state:
// bound directly to the store, typing "0.5" would be normalised to null at the
// "0" keystroke (see normalizeLimitAmount — 0 is not a limit) and the field
// would fight the player mid-entry. So the draft is free text while focused and
// commits on blur or Enter.
function LimitField({ id, label, currency, limit, onChange }) {
  const [draft, setDraft] = useState(limit.amount === null ? "" : String(limit.amount));

  // Re-sync when the value changes underneath us — a sync from another device,
  // or this dialog reopening after a change elsewhere.
  const [lastSeen, setLastSeen] = useState(limit.amount);
  if (lastSeen !== limit.amount) {
    setLastSeen(limit.amount);
    setDraft(limit.amount === null ? "" : String(limit.amount));
  }

  const commit = () => {
    const amount = normalizeLimitAmount(draft);
    // Show the player what was actually stored, rather than leaving a rejected
    // entry like "abc" sitting in the field as though it had been saved.
    setDraft(amount === null ? "" : String(amount));
    if (amount !== limit.amount) onChange({ amount });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
      <label htmlFor={id} className="text-sm text-muted-foreground">{label}</label>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{currency}</span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          value={draft}
          placeholder="No limit"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          data-test-id={id}
          className="w-24 rounded-md border bg-background px-2 py-1.5 text-right text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <select
          value={limit.period}
          onChange={(e) => onChange({ period: e.target.value })}
          aria-label={`${label} period`}
          data-test-id={`${id}-period`}
          className="rounded-md border bg-background px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {LIMIT_PERIODS.map((p) => <option key={p} value={p}>per {p}</option>)}
        </select>
      </div>
    </div>
  );
}
