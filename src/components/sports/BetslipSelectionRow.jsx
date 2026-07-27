import { X } from "lucide-react";

// One shared selection row, used by AzuroBetSlip, DemoBetSlip and
// DesktopBetslipPanel — extracted so the three betslip presentations (modal
// real, modal demo, desktop panel) never carry three copies of the same row
// markup out of sync with each other.
//
// Two-row grid, each `minmax(0, 1fr) auto` (text column never pushes the
// fixed-width right column out of the card — see PANEL POLISH: "no text can
// push odds outside the card"):
//   row 1: event + market text (clamps up to 2/1 lines)  | remove control
//   row 2: outcome text (clamps to 1 line)                | odds (never wraps)
export function BetslipSelectionRow({ selection, onRemove, disabled }) {
  const blocked = selection.status !== "active" && selection.status !== "odds_changed";
  const oddsChanged = selection.status === "odds_changed" && selection.previousOdds != null;

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
        <div className="min-w-0">
          <p className="line-clamp-2 break-words text-xs text-muted-foreground">{selection.eventLabel}</p>
          <p className="line-clamp-1 break-words text-xs text-muted-foreground/75">{selection.marketLabel}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          disabled={disabled}
          aria-label={`Remove ${selection.outcomeLabel}`}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <span className="line-clamp-1 min-w-0 break-words text-sm font-semibold">{selection.outcomeLabel}</span>
        {oddsChanged ? (
          <span className="flex min-w-[52px] shrink-0 items-baseline justify-end gap-1 whitespace-nowrap">
            <span className="font-mono text-xs text-muted-foreground line-through tabular-nums">{selection.previousOdds.toFixed(2)}</span>
            <span aria-hidden="true" className="text-xs text-muted-foreground">→</span>
            <span className="font-mono text-sm font-bold tabular-nums text-[var(--global-cta-hover)]">{selection.odds.toFixed(2)}</span>
            <span className="sr-only">, odds changed from {selection.previousOdds.toFixed(2)} to {selection.odds.toFixed(2)}</span>
          </span>
        ) : (
          <span className="min-w-[52px] shrink-0 whitespace-nowrap text-right font-mono text-sm font-bold tabular-nums text-[var(--global-cta-hover)]">
            {selection.odds.toFixed(2)}
          </span>
        )}
      </div>

      {blocked && <p className="mt-1 break-words text-[11px] text-muted-foreground">No longer available — remove to continue.</p>}
    </div>
  );
}
