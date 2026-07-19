import { useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { outcomeResult } from "@/lib/sportsData";
import { toast } from "@/lib/toast";

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
export function DemoBetSlip({ selections, stake, setStake, removeSelection, combinedOdds, potentialReturn, validation, onClose, onDone, onBetPlaced }) {
  const [phase, setPhase] = useState("idle"); // idle | placed

  if (selections.length === 0) return null;
  const target = validation.submittableSelection; // the one selection actually eligible to submit, if any

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

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Demo bet slip{selections.length > 1 ? ` · ${selections.length} selections` : ""}</DialogTitle>
          <DialogDescription>Placeholder fixture{selections.length > 1 ? "s" : ""} — not a real bet.</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {selections.map((sel) => (
            <SelectionRow key={sel.id} selection={sel} onRemove={() => removeSelection(sel.id)} />
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
          <>
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
              <p className="rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">{validation.message}</p>
            )}

            <button
              onClick={submit}
              disabled={!validation.canSubmit}
              className="rounded-lg bg-[var(--global-cta)] py-2.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] disabled:opacity-50"
            >
              Place demo bet
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SelectionRow({ selection, onRemove }) {
  const blocked = selection.status !== "active" && selection.status !== "odds_changed";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{selection.eventLabel}</div>
          <div className="truncate text-xs text-muted-foreground">{selection.marketLabel}</div>
        </div>
        <button onClick={onRemove} aria-label={`Remove ${selection.outcomeLabel}`} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{selection.outcomeLabel}</span>
        <span className="font-mono text-sm font-bold text-[var(--global-cta)]">{selection.odds.toFixed(2)}</span>
      </div>
      {selection.status === "odds_changed" && (
        <p className="mt-1 text-[11px] text-[var(--warning)]">Odds changed{selection.previousOdds ? ` from ${selection.previousOdds.toFixed(2)}` : ""}.</p>
      )}
      {blocked && <p className="mt-1 text-[11px] text-muted-foreground">No longer available — remove to continue.</p>}
    </div>
  );
}
