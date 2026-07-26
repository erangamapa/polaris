import { cn } from "@/lib/utils";
import { useOddsFormat } from "@/lib/odds";

export function OddsButton({ label, odds, selected, onClick, dir, disabled }) {
  const { fmtOdds } = useOddsFormat();
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      // RESKIN: was rgba(175,195,74,*) — stale chartreuse from before Sports
      // was recolored to cobalt (--sports-primary is #5A87D4 now) — and a
      // hardcoded #1A1C20/#20241C background with a leftover greenish
      // hover tint. Fixed to the current sports token + the app's actual
      // neutral surface-elevation pattern (bg-card -> hover:bg-secondary,
      // same as every other interactive card in the app).
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "cursor-not-allowed border-border bg-muted/20 opacity-50"
          : selected
            ? "border-[var(--sports-primary)]/50 bg-[var(--sports-primary-soft)] text-[var(--sports-text-accent)]"
            : "border-border bg-[var(--card)] hover:bg-[var(--secondary)]"
      )}
    >
      <span className="line-clamp-1 text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          // Was asymmetric — "up" used arena color (sports blue), "down"
          // used the semantic outcome-negative token. An odds movement
          // direction is a semantic up/down signal, not an arena
          // identifier, so both sides now use the same semantic pair.
          "flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums transition-colors",
          dir === "up" && "text-[var(--outcome-affirmative)]",
          dir === "down" && "text-[var(--outcome-negative)]"
        )}
      >
        {dir === "up" && <span className="text-[9px] leading-none">▲</span>}
        {dir === "down" && <span className="text-[9px] leading-none">▼</span>}
        {fmtOdds(odds)}
      </span>
    </button>
  );
}
