import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { outcomeResult } from "@/lib/sportsData";
import { toast } from "@/lib/toast";
import { BetslipSelectionRow } from "./BetslipSelectionRow";
import { BetslipSuccessState } from "./BetslipSuccessState";

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
// presentation: "modal" (mobile Dialog popup, legacy/unused below 1024px
// once MobileBetslipSheet is active) | "panel" (desktop persistent
// right-side panel — see DesktopBetslipPanel.jsx) | "sheet" (mobile
// full-screen surface — see MobileBetslipSheet.jsx). Same component/state
// in all three; only the outer wrapper and the success-state richness
// change. In panel/sheet mode the header (title/count/collapse-or-back/
// clear) is owned by the parent surface.
export function DemoBetSlip({ selections, stake, setStake, removeSelection, combinedOdds, potentialReturn, validation, onClose, onDone, onContinueBetting, onViewMyBets, onBetPlaced, presentation = "modal" }) {
  const [phase, setPhase] = useState("idle"); // idle | placed

  if (selections.length === 0) return null;
  const target = validation.submittableSelection; // the one selection actually eligible to submit, if any
  const isPanel = presentation === "panel";
  const isSheet = presentation === "sheet";
  const isEmbedded = isPanel || isSheet;

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

  // Same early-return pattern as AzuroBetSlip: the sheet's success state
  // fully replaces the list + stake body with a compact single-selection
  // summary via the shared BetslipSuccessState component.
  if (isSheet && phase === "placed" && target) {
    return (
      <BetslipSuccessState
        subtitle="Demo bet — not real funds"
        eventLabel={target.eventLabel}
        marketLabel={target.marketLabel}
        outcomeLabel={target.outcomeLabel}
        odds={target.odds}
        stake={Number(stake) || 0}
        potentialReturn={potentialReturn ?? 0}
        currencyLabel="USDT"
        onContinueBetting={() => onContinueBetting?.(target.id)}
        onViewMyBets={() => onViewMyBets?.(target.id)}
      />
    );
  }

  const body = (
    <>
      <div className={isEmbedded ? "tribet-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto" : "tribet-scrollbar max-h-64 space-y-2 overflow-y-auto"}>
        {selections.map((sel) => (
          <BetslipSelectionRow key={sel.id} selection={sel} onRemove={() => removeSelection(sel.id)} />
        ))}
      </div>

      {phase === "placed" ? (
        <div className="flex shrink-0 flex-col items-center gap-2 border-t pt-4 text-center">
          <CheckCircle2 className="size-8 text-[var(--success)]" />
          <div className="text-sm font-semibold">Demo bet placed</div>
          <div className="text-xs text-muted-foreground">See it in My Bets.</div>
          <button onClick={onDone} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/70">Done</button>
        </div>
      ) : (
        <div className={isEmbedded ? "shrink-0 space-y-3 border-t pt-3" : "space-y-3"}>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Stake (demo USDT)</span>
            <div className="flex items-center gap-1 rounded-lg border bg-background pe-1.5 ps-3">
              <input
                type="text" inputMode="decimal" value={stake}
                onFocus={(e) => e.target.select()}
                onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setStake(v); }}
                className="min-w-0 flex-1 bg-transparent py-2.5 font-mono tabular-nums outline-none"
                placeholder="0"
              />
              <div className="flex shrink-0 items-center gap-1">
                {[1, 5, 25].map((v) => (
                  <button key={v} onClick={() => setStake(String(v))} className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">{v}</button>
                ))}
              </div>
            </div>
          </label>

          {selections.length > 1 && (
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              <span>Combined odds (preview)</span>
              <span className="whitespace-nowrap text-right font-mono tabular-nums">{combinedOdds != null ? combinedOdds.toFixed(2) : "—"}</span>
            </div>
          )}

          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Potential payout</span>
            <span className="whitespace-nowrap text-right font-mono text-base font-bold tabular-nums">{potentialReturn != null ? potentialReturn.toFixed(2) : "0.00"} USDT</span>
          </div>

          {!validation.canSubmit && (
            <p id="demo-betslip-validation" role="status" className="break-words rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">{validation.message}</p>
          )}

          <button
            onClick={submit}
            disabled={!validation.canSubmit}
            aria-describedby={!validation.canSubmit ? "demo-betslip-validation" : undefined}
            // CTA OWNERSHIP SYSTEM: a Sports arena action, not platform.
            className="flex min-h-[52px] w-full items-center justify-center rounded-lg bg-[var(--global-cta)] text-base font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            Place demo bet
          </button>
        </div>
      )}
    </>
  );

  if (isEmbedded) {
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
