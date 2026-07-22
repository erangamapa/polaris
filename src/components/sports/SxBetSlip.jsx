import { useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { formatUnits, erc20Abi } from "viem";
import { Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useSxBet } from "@/web3/useSxBet";
import { sxbet } from "@shared/chains";
import { toast } from "@/lib/toast";
import { BetslipSelectionRow } from "./BetslipSelectionRow";
import { BetslipSuccessState } from "./BetslipSuccessState";

const STEP_LABEL = {
  switching: "Switching to SX Network…",
  funding: "Checking USDC balance…",
  approving: "Approving USDC…",
  signing: "Sign the bet in your wallet…",
  submitting: "Submitting to SX Bet…",
};

// Real-provider bet slip for SX Bet. Same shape/props/presentations as
// AzuroBetSlip (they're interchangeable via ProviderBetSlip) — only the submit
// path differs: SX fills a maker order (approve USDC -> EIP-712 fill sign ->
// POST /orders/fill/v2) instead of Azuro's relayer order. Still one selection
// per submit (validation.submittableSelection); the multi-selection list is
// presentation only.
export function SxBetSlip({ selections, stake, setStake, removeSelection, combinedOdds, potentialReturn, validation, onClose, onDone, onContinueBetting, onViewMyBets, onBetPlaced, presentation = "modal" }) {
  const { placeBet } = useSxBet();
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const [phase, setPhase] = useState("idle"); // idle | placing | done
  const [step, setStep] = useState(null);
  const [order, setOrder] = useState(null);

  const { data: usdcRaw } = useReadContract({
    address: sxbet.betToken.address, abi: erc20Abi, functionName: "balanceOf",
    args: [address], chainId: sxbet.chainId,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });
  const usdcBalance = usdcRaw !== undefined ? Number(formatUnits(usdcRaw, sxbet.betToken.decimals)) : 0;

  if (selections.length === 0) return null;
  const target = validation.submittableSelection;
  const busy = phase === "placing";
  const stakeNum = Number(stake) || 0;
  const insufficient = stakeNum > usdcBalance;
  const isPanel = presentation === "panel";
  const isSheet = presentation === "sheet";
  const isEmbedded = isPanel || isSheet;

  const submit = async () => {
    if (!validation.canSubmit || !target || busy) return;
    // Stake entered + a valid selection is enough to click; if the wallet
    // isn't connected yet, open the connect modal instead of placing. Once
    // connected, the button becomes "Place bet" and the next click submits.
    if (!isConnected) { open({ view: "Connect" }); return; }
    const fill = target.payload?.outcome?.raw;
    if (!fill?.marketHash || fill.isTakerBettingOutcomeOne === undefined) {
      toast.error("This selection is missing provider data — remove it and try again.");
      return;
    }
    setPhase("placing");
    try {
      const res = await placeBet({ fill, amountUsdc: stakeNum, onStep: setStep });
      setOrder(res);
      setPhase("done");
      const ref = res.fillHash ?? res.betId;
      toast.success(`Bet accepted (${String(ref).slice(0, 8)}…)`);
      onBetPlaced?.({
        product: "sports", title: `${target.eventLabel} · ${target.marketLabel}`, selection: target.outcomeLabel,
        stake: stakeNum, potential: +(stakeNum * target.odds).toFixed(6), status: "open", orderId: ref,
      });
    } catch (e) {
      setPhase("idle"); setStep(null);
      toast.error(e.shortMessage || e.message || "Bet failed");
    }
  };

  if (isSheet && phase === "done" && target) {
    return (
      <BetslipSuccessState
        subtitle="Confirmed on SX Network · SX Bet"
        eventLabel={target.eventLabel}
        marketLabel={target.marketLabel}
        outcomeLabel={target.outcomeLabel}
        odds={target.odds}
        stake={stakeNum}
        potentialReturn={+(stakeNum * target.odds).toFixed(2)}
        currencyLabel="USDC"
        reference={order?.fillHash ?? order?.betId}
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
          <div className="text-sm font-semibold">Bet accepted by SX Bet</div>
          <div className="font-mono text-xs text-muted-foreground">{String(order?.fillHash ?? order?.betId ?? "").slice(0, 10)}…</div>
          <button onClick={onDone} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/70">Done</button>
        </div>
      ) : (
        <div className={isEmbedded ? "shrink-0 space-y-3 border-t pt-3" : "space-y-3"}>
          <label className="block">
            <span className="mb-1 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <span>Stake (USDC)</span>
              <span className="normal-case">Balance: <span className="font-mono tabular-nums">{usdcBalance.toFixed(2)}</span></span>
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
                {[5, 10, 25].map((v) => (
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
            <span className="whitespace-nowrap text-right font-mono text-base font-bold tabular-nums">{potentialReturn != null ? potentialReturn.toFixed(2) : "0.00"} USDC</span>
          </div>

          {!validation.canSubmit && (
            <p id="sx-betslip-validation" role="status" className="break-words rounded-lg border border-dashed px-3 py-2 text-center text-xs text-muted-foreground">{validation.message}</p>
          )}

          {busy ? (
            <div role="status" aria-live="polite" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg border text-sm text-[var(--global-cta)]" data-test-id="betslip-loader">
              <Loader2 className="size-4 shrink-0 animate-spin" /> <span className="truncate">{STEP_LABEL[step] ?? "Placing bet…"}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                onClick={submit}
                disabled={!validation.canSubmit}
                aria-describedby={!validation.canSubmit ? "sx-betslip-validation" : undefined}
                data-test-id="betslip-submit"
                className="flex min-h-[52px] w-full items-center justify-center rounded-lg bg-[var(--global-cta)] text-base font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              >
                {isConnected ? "Place bet" : "Connect wallet to bet"}
              </button>
              {isConnected && insufficient && (
                <a href={sxbet.faucet} target="_blank" rel="noreferrer" data-test-id="betslip-faucet" className="flex min-h-11 w-full items-center justify-center gap-1 rounded-lg border text-xs font-medium hover:bg-secondary">
                  <ExternalLink className="size-3 shrink-0" /> Low balance — get testnet USDC
                </a>
              )}
            </div>
          )}

          <p className="flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground">
            <ExternalLink className="size-3 shrink-0" /> On SX Network — you approve &amp; sign, SX matches your bet.
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
          <DialogDescription className="truncate">SX Network · SX Bet</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
}
