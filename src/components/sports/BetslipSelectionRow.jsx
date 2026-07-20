import { X } from "lucide-react";

// One shared selection row, used by AzuroBetSlip, DemoBetSlip and
// DesktopBetslipPanel — extracted so the three betslip presentations (modal
// real, modal demo, desktop panel) never carry three copies of the same
// row markup out of sync with each other.
export function BetslipSelectionRow({ selection, onRemove, disabled }) {
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
