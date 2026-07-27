import { useState } from "react";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAzuroBet } from "@/web3/useAzuro";
import { useWallet } from "@/web3/useWallet";
import { toast } from "@/lib/toast";
import { BetslipSelectionRow } from "./BetslipSelectionRow";
import { BetslipSuccessState } from "./BetslipSuccessState";

const STEP_LABEL = {
  switching: "Switching to Polygon Amoy…",
  funding: "Getting test USDT…",
  approving: "Approving relayer…",
  signing: "Sign the order in your wallet…",
  submitting: "Submitting to Azuro…",
};

// Real-provider bet slip. Renders the *shared* selections[] (all guaranteed
// source: "provider" — mixed source is blocked at add-time, see
// lib/sportsBetslip.js) as a list, so multiple real selections can be
// reviewed together. Submission itself is untouched real on-chain logic
// (mint/approve/sign/submit), still targeting exactly one selection at a
// time — the Azuro relayer's `createBet` takes a single { conditionId,
// outcomeId } pair, there is no batch/parlay path in this integration (see
// PROVIDER_SUBMISSION_NOT_SUPPORTED in getBetslipValidation) — so
// `validation.submittableSelection` (the one selection actually eligible
// right now) is what gets submitted, never an invented combined bet.
//
// presentation: "modal" (mobile Dialog popup, legacy/unused below 1024px
// once MobileBetslipSheet is active) | "panel" (desktop persistent
// right-side panel — see DesktopBetslipPanel.jsx) | "sheet" (mobile
// full-screen surface — see MobileBetslipSheet.jsx). Same component, same
// hooks, same submit() in all three — only the outer wrapper and the
// success-state richness change, so the real transaction flow is never
// forked. In panel/sheet mode the header (title/count/collapse-or-back/
// clear) is owned by the parent surface, so this renders only the list +
// stake/summary body (+ the richer BetslipSuccessState in sheet mode).
export function AzuroBetSlip({ selections, stake, setStake, removeSelection, combinedOdds, potentialReturn, validation, onClose, onDone, onContinueBetting, onViewMyBets, onBetPlaced, presentation = "modal" }) {
  const { ready, placeBet, mintUsdt } = useAzuroBet();
  const { sportsBalance } = useWallet();
  const [phase, setPhase] = useState("idle"); // idle | placing | done
  const [step, setStep] = useState(null);
  const [minting, setMinting] = useState(false);
  const [order, setOrder] = useState(null);

  if (selections.length === 0) return null;
  const target = validation.submittableSelection; // the one selection actually eligible to submit, if any
  const busy = phase === "placing";
  const stakeNum = Number(stake) || 0;
  const insufficient = stakeNum > sportsBalance;
  const isPanel = presentation === "panel";
  const isSheet = presentation === "sheet";
  const isEmbedded = isPanel || isSheet; // no Dialog wrapper — the parent surface owns chrome

  const getUsdt = async () => {
    if (!ready) { toast.error("Connect your wallet first"); return; }
    setMinting(true);
    try { await mintUsdt(100); toast.success("Minted 100 test USDT"); }
    catch (e) { toast.error(e.shortMessage || e.message || "Mint failed"); }
    finally { setMinting(false); }
  };

  const submit = async () => {
    if (!ready) { toast.error("Connect your wallet first"); return; }
    if (!validation.canSubmit || !target || busy) return;
    const game = target.payload?.event?.raw;
    const market = target.payload?.market?.raw;
    const outcome = target.payload?.outcome?.raw;
    if (!market?.conditionId || !outcome?.outcomeId) {
      toast.error("This selection is missing provider data — remove it and try again.");
      return;
    }
    setPhase("placing");
    try {
      const res = await placeBet({
        conditionId: market.conditionId,
        outcomeId: outcome.outcomeId,
        odds: target.odds,
        amountUsdt: stakeNum,
        onStep: setStep,
      });
      setOrder(res);
      setPhase("done");
      toast.success(`Bet accepted (order ${String(res.id).slice(0, 8)}…)`);
      onBetPlaced?.({
        product: "sports", title: `${game?.title ?? target.eventLabel} · ${target.marketLabel}`, selection: target.outcomeLabel,
        stake: stakeNum, potential: +(stakeNum * target.odds).toFixed(6), status: "open", orderId: res.id,
      });
    } catch (e) {
      setPhase("idle"); setStep(null);
      toast.error(e.shortMessage || e.message || "Bet failed");
    }
  };

  // The sheet's success state fully replaces the list + stake body (a
  // compact single-selection summary, not the whole list) — handled before
  // `body` is built at all, since it renders BetslipSuccessState's own
  // complete flex/scroll/footer structure rather than nesting inside it.
  if (isSheet && phase === "done" && target) {
    return (
      <BetslipSuccessState
        subtitle="Confirmed on Polygon Amoy · Azuro Protocol"
        eventLabel={target.eventLabel}
        marketLabel={target.marketLabel}
        outcomeLabel={target.outcomeLabel}
        odds={target.odds}
        stake={stakeNum}
        potentialReturn={+(stakeNum * target.odds).toFixed(2)}
        currencyLabel="USDT"
        reference={order?.id}
        onContinueBetting={() => onContinueBetting?.(target.id)}
        onViewMyBets={() => onViewMyBets?.(target.id)}
      />
    );
  }

  const body = (
    <>
      <div className={isEmbedded ? "tribet-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto" : "tribet-scrollbar max-h-64 space-y-2 overflow-y-auto"}>
        {selections.map((sel) => (
          <BetslipSelectionRow key={sel.id} selection={sel} onRemove={() => removeSelection(sel.id)} disabled={busy} />
        ))}
      </div>

      {phase === "done" ? (
        <div className="flex shrink-0 flex-col items-center gap-2 border-t pt-4 text-center">
          <CheckCircle2 className="size-8 text-[var(--success)]" />
          <div className="text-sm font-semibold">Bet accepted by the relayer</div>
          <div className="font-mono text-xs text-muted-foreground">order {String(order?.id).slice(0, 10)}…</div>
          <button onClick={onDone} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/70">Done</button>
        </div>
      ) : (
        <div className={isEmbedded ? "shrink-0 space-y-3 border-t pt-3" : "space-y-3"}>
          <label className="block">
            <span className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>Stake (USDT)</span>
              <span className="normal-case">Balance: <span className="font-mono tabular-nums">{sportsBalance.toFixed(2)}</span></span>
            </span>
            <div className="flex items-center gap-1 rounded-lg border bg-background pe-1.5 ps-3">
              <input
                type="text" inputMode="decimal" value={stake} disabled={busy}
                onFocus={(e) => e.target.select()}
                onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setStake(v); }}
                className="min-w-0 flex-1 bg-transparent py-2.5 font-mono tabular-nums outline-none"
                placeholder="0"
                data-test-id="betslip-stake"
              />
              <div className="flex shrink-0 items-center gap-1">
                {[1, 5, 25].map((v) => (
                  <button key={v} onClick={() => setStake(String(v))} disabled={busy} className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40">{v}</button>
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
            <p id="azuro-betslip-validation" role="status" className="break-words rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">{validation.message}</p>
          )}

          {busy ? (
            <div role="status" aria-live="polite" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg border text-sm text-[var(--global-cta-hover)]" data-test-id="betslip-loader">
              <Loader2 className="size-4 shrink-0 animate-spin" /> <span className="truncate">{STEP_LABEL[step] ?? "Placing bet…"}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={submit}
                disabled={!ready || !validation.canSubmit}
                aria-describedby={!validation.canSubmit ? "azuro-betslip-validation" : undefined}
                data-test-id="betslip-submit"
                // CTA OWNERSHIP SYSTEM: placing a bet is a Sports arena
                // action, not a platform action — Sports Action Blue.
                className="flex min-h-[52px] w-full items-center justify-center rounded-lg bg-[var(--global-cta)] text-base font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              >
                Place bet
              </button>
              {insufficient && (
                <button onClick={getUsdt} disabled={minting} data-test-id="betslip-mint" className="flex min-h-11 w-full items-center justify-center rounded-lg border text-xs font-medium hover:bg-secondary disabled:opacity-50">
                  {minting ? "Minting…" : "Low balance — get 100 test USDT"}
                </button>
              )}
            </div>
          )}

          <p className="flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <ExternalLink className="size-3 shrink-0" /> Gasless on Polygon Amoy — you sign, a relayer submits.
          </p>
        </div>
      )}
    </>
  );

  if (isEmbedded) {
    return <div className="flex h-full min-h-0 flex-col gap-3">{body}</div>;
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bet slip{selections.length > 1 ? ` · ${selections.length} selections` : ""}</DialogTitle>
          <DialogDescription className="truncate">Polygon Amoy · Azuro Protocol</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
