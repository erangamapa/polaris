import { useState } from "react";
import { Loader2, CheckCircle2, ExternalLink, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAzuroBet } from "@/web3/useAzuro";
import { useWallet } from "@/web3/useWallet";
import { toast } from "@/lib/toast";

const STEP_LABEL = {
  switching: "Switching to Polygon Amoy…",
  funding: "Getting test USDT…",
  approving: "Approving relayer…",
  signing: "Sign the order in your wallet…",
  submitting: "Submitting to Azuro…",
};

// Bet slip modal: opens when an outcome is selected. Renders the *shared*
// selections[] (all guaranteed source: "provider" — mixed source is blocked
// at add-time, see lib/sportsBetslip.js) as a list, so multiple real
// selections can be reviewed together. Submission itself is untouched real
// on-chain logic (mint/approve/sign/submit), still targeting exactly one
// selection at a time — the Azuro relayer's `createBet` takes a single
// { conditionId, outcomeId } pair, there is no batch/parlay path in this
// integration (see PROVIDER_SUBMISSION_NOT_SUPPORTED in
// getBetslipValidation) — so `validation.submittableSelection` (the one
// selection actually eligible right now) is what gets submitted, never an
// invented combined bet.
export function AzuroBetSlip({ selections, stake, setStake, removeSelection, combinedOdds, potentialReturn, validation, onClose, onDone, onBetPlaced }) {
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

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Bet slip{selections.length > 1 ? ` · ${selections.length} selections` : ""}</DialogTitle>
          <DialogDescription className="truncate">Polygon Amoy · Azuro Protocol</DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-2 overflow-y-auto">
          {selections.map((sel) => (
            <SelectionRow key={sel.id} selection={sel} onRemove={() => removeSelection(sel.id)} disabled={busy} />
          ))}
        </div>

        {phase === "done" ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="size-8 text-[var(--success)]" />
            <div className="text-sm font-semibold">Bet accepted by the relayer</div>
            <div className="font-mono text-xs text-muted-foreground">order {String(order?.id).slice(0, 10)}…</div>
            <button onClick={onDone} className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/70">Done</button>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
                <span>Stake (USDT)</span>
                <span className="normal-case">Balance: <span className="font-mono">{sportsBalance.toFixed(2)}</span></span>
              </span>
              <div className="flex items-center rounded-lg border bg-background px-3">
                <input
                  type="text" inputMode="decimal" value={stake} disabled={busy}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => { const v = e.target.value; if (v === "" || /^\d*\.?\d*$/.test(v)) setStake(v); }}
                  className="w-full bg-transparent py-2.5 font-mono tabular-nums outline-none"
                  placeholder="0"
                  data-test-id="betslip-stake"
                />
                {[1, 5, 25].map((v) => (
                  <button key={v} onClick={() => setStake(String(v))} disabled={busy} className="px-2 text-xs text-muted-foreground hover:text-foreground">{v}</button>
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

            {busy ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm text-[var(--global-cta)]" data-test-id="betslip-loader">
                <Loader2 className="size-4 animate-spin" /> {STEP_LABEL[step] ?? "Placing bet…"}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={submit}
                  disabled={!ready || !validation.canSubmit}
                  data-test-id="betslip-submit"
                  className="rounded-lg bg-[var(--global-cta)] py-2.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] disabled:opacity-50"
                >
                  Place bet
                </button>
                {insufficient && (
                  <button onClick={getUsdt} disabled={minting} data-test-id="betslip-mint" className="rounded-lg border py-2 text-xs font-medium hover:bg-secondary disabled:opacity-50">
                    {minting ? "Minting…" : "Low balance — get 100 test USDT"}
                  </button>
                )}
              </div>
            )}

            <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
              <ExternalLink className="size-3" /> Gasless on Polygon Amoy — you sign, a relayer submits.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SelectionRow({ selection, onRemove, disabled }) {
  const blocked = selection.status !== "active" && selection.status !== "odds_changed";
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-xs text-muted-foreground">{selection.eventLabel}</div>
          <div className="truncate text-xs text-muted-foreground">{selection.marketLabel}</div>
        </div>
        <button onClick={onRemove} disabled={disabled} aria-label={`Remove ${selection.outcomeLabel}`} className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-40">
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
