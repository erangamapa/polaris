import { cn } from "@/lib/utils";
import { useOddsFormat } from "@/lib/odds";

export function OddsButton({ label, odds, selected, onClick, dir, disabled }) {
  const { fmtOdds } = useOddsFormat();
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "cursor-not-allowed border-border bg-muted/20 opacity-50"
          : selected
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
            : "border-border bg-muted/30 hover:border-ring/50 hover:bg-muted/60"
      )}
    >
      <span className="line-clamp-1 text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums transition-colors",
          dir === "up" && "text-emerald-400",
          dir === "down" && "text-rose-400"
        )}
      >
        {dir === "up" && <span className="text-[9px] leading-none">▲</span>}
        {dir === "down" && <span className="text-[9px] leading-none">▼</span>}
        {fmtOdds(odds)}
      </span>
    </button>
  );
}
