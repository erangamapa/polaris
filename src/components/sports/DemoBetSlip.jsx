import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { outcomeResult } from "@/lib/sportsData";
import { toast } from "@/lib/toast";
import { BetslipSelectionRow } from "./BetslipSelectionRow";

// Bet slip for fully-mocked fixtures only — never touches the wallet or any
// real transaction flow (see PLACEHOLDER ODDS / DEMO MODE). Visually mirrors
// AzuroBetSlip so switching between a real and a placeholder fixture feels
// like the same product, but every field below is local/shared UI state;
// nothing here signs, submits, or costs real funds.
//
// Renders the *shared* selections[] (all guaranteed source: "mock" — mixed
// source is blocked at add-time, see lib/sportsBetslip.js) as a list, not a
// single card. The real provider only accepts one bet per submission (see
// PROVIDER_SUBMISSION_NOT_SUPPORTED in getBetslipValidation) — this demo
// path deliberately mirrors that same one-at-a-time limitation rather than
// faking a combined-bet placement the real side could never support, so
// switching between a demo and a live fixture feels like the same product.
//
// presentation: "modal" (mobile Dialog popup, default) | "panel" (desktop
// persistent right-side panel — see DesktopBetslipPanel.jsx). Same
// component/state, only the outer wrapper changes; in panel mode the header
// (title/count/collapse/clear) is owned by DesktopBetslipPanel.
export function DemoBetSlip({ selections, stake, setStake, removeSelection, combinedOdds, potentialReturn, validation, onClose, onDone, onBetPlaced, presentation = "modal" }) {
  const [phase, setPhase] = useState("idle"); // idle | placed

  if (selections.length === 0) return null;
  const target = validation.submittableSelection; // the one selection actually eligible to submit, if any
  const isPanel = presentation === "panel";

  const submit = () => {
    if (!validation.canSubmit || !target) return;
    setPhase("placed");
    const finalScore = target.payload?.event?.raw?.finalScore;
    const result = finalScore ? outcomeResult(target.payload?.market?.raw ?? target.payload?.market, target.payload?.outcome?.pick, finalScore) : undefined;
    toast.success("Demo bet placed");
    // Routed through App.jsx's placeBet (not logRound) — placeBet is what
    // schedules the open -> won/lost/void auto-settlement, using this
    // predetermined `result` (score-driven, like other sports bets) instead
    // of the generic random winProb fallback.
    onBetPlaced?.({
      product: "sports",
      title: `${target.eventLabel} · ${target.marketLabel}`,
      selection: target.outcomeLabel,
      stake: Number(stake),
      potential: potentialReturn ?? 0,
      result,
      source: "mock",
    });
  };

  const body = (
    <>
      <div className={isPanel ? "min-h-0 flex-1 space-y-2 overflow-y-auto" : "max-h-64 space-y-2 overflow-y-auto"}>
        {selections.map((sel) => (
          <BetslipSelectionRow key={sel.id} selection={sel} onRemove={() => removeSelection(sel.id)} />
        ))}
      </div>

      {phase === "placed" ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-8 text-[var(--success)]" />
          <div className="text-sm font-semibold">Demo bet placed</div>
          <div className="text-xs text-muted-foreground">See it in My Bets.</div>
          <button onClick={onDone} className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/70">Done</button>
        </div>
      ) : (
        <div className={isPanel ? "shrink-0 space-y-3 border-t pt-3" : "space-y-3"}>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Stake (demo USDT)</span>
            <div className="flex items-center rounded-lg border bg-background px-3">
              <input
                type="text" inputMode="decimal" value={stake}
                onFocus={(e) => e.target.select()}
                onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setStake(v); }}
                className="w-full bg-transparent py-2.5 font-mono tabular-nums outline-none"
                placeholder="0"
              />
              {[1, 5, 25].map((v) => (
                <button key={v} onClick={() => setStake(String(v))} className="px-2 text-xs text-muted-foreground hover:text-foreground">{v}</button>
              ))}
            </div>
          </label>

          {selections.length > 1 && (
            <div className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              <span>Combined odds (preview)</span>
              <span className="font-mono">{combinedOdds != null ? combinedOdds.toFixed(2) : "—"}</span>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Potential payout</span>
            <span className="font-mono font-semibold">{potentialReturn != null ? potentialReturn.toFixed(2) : "0.00"} USDT</span>
          </div>

          {!validation.canSubmit && (
            <p id="demo-betslip-validation" role="status" className="rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">{validation.message}</p>
          )}

          <button
            onClick={submit}
            disabled={!validation.canSubmit}
            aria-describedby={!validation.canSubmit ? "demo-betslip-validation" : undefined}
            className="rounded-lg bg-[var(--global-cta)] py-2.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] disabled:opacity-50"
          >
            Place demo bet
          </button>
        </div>
      )}
    </>
  );

  if (isPanel) {
    return <div className="flex h-full min-h-0 flex-col gap-3">{body}</div>;
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Demo bet slip{selections.length > 1 ? ` · ${selections.length} selections` : ""}</DialogTitle>
          <DialogDescription>Placeholder fixture{selections.length > 1 ? "s" : ""} — not a real bet.</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
