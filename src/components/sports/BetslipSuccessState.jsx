import { CheckCircle2 } from "lucide-react";

// Full-screen mobile confirmation — shown inside MobileBetslipSheet after a
// successful real or demo submission (AzuroBetSlip/DemoBetSlip with
// presentation="sheet"). Reuses the exact stake/odds/potentialReturn values
// already computed by the caller — this renders success data, it never
// recomputes or duplicates the underlying bet logic.
//
// Kept as one shared component (not copy-pasted into both slip files) since
// the desktop/modal "done" states stay intentionally minimal — only the
// sheet gets this richer confirmation, per the task's own scope.
export function BetslipSuccessState({ subtitle, eventLabel, marketLabel, outcomeLabel, odds, stake, potentialReturn, currencyLabel, reference, onContinueBetting, onViewMyBets }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="tribet-scrollbar flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-1 py-6 text-center">
        <CheckCircle2 className="size-12 shrink-0 text-[var(--success)]" aria-hidden="true" />
        <div role="status" aria-live="polite">
          <p className="text-lg font-bold">Bet placed</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>

        <div className="w-full space-y-1.5 rounded-lg border bg-card p-3 text-left">
          <p className="line-clamp-2 break-words text-xs text-muted-foreground">{eventLabel}</p>
          <p className="line-clamp-1 break-words text-xs text-muted-foreground/75">{marketLabel}</p>
          <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
            <span className="line-clamp-1 min-w-0 break-words text-sm font-semibold">{outcomeLabel}</span>
            <span className="min-w-[52px] shrink-0 whitespace-nowrap text-right font-mono text-sm font-bold tabular-nums text-[var(--global-cta-hover)]">{odds.toFixed(2)}</span>
          </div>
        </div>

        <div className="w-full space-y-1.5">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
            <span className="text-muted-foreground">Stake</span>
            <span className="whitespace-nowrap text-right font-mono tabular-nums">{stake.toFixed(2)} {currencyLabel}</span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2.5 text-sm">
            <span className="text-muted-foreground">Potential return</span>
            <span className="whitespace-nowrap text-right font-mono text-base font-bold tabular-nums">{potentialReturn.toFixed(2)} {currencyLabel}</span>
          </div>
        </div>

        {reference && <p className="font-mono text-[11px] text-muted-foreground">Ref {String(reference).slice(0, 10)}…</p>}
      </div>

      <div className="shrink-0 space-y-2 border-t pt-3">
        <button
          onClick={onContinueBetting}
          data-test-id="betslip-continue-betting"
          className="flex min-h-[52px] w-full items-center justify-center rounded-lg [background-image:var(--global-cta-gradient)] text-base font-semibold text-[var(--global-cta-text)] hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Continue betting
        </button>
        <button
          onClick={onViewMyBets}
          data-test-id="betslip-view-my-bets"
          className="flex min-h-11 w-full items-center justify-center rounded-lg border text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          View My Bets
        </button>
      </div>
    </div>
  );
}
