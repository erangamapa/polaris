import { cn } from "@/lib/utils";
import { useOddsFormat } from "@/lib/odds";

export function OddsButton({ label, odds, selected, onClick, dir, disabled }) {
  const { fmtOdds } = useOddsFormat();
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border px-2 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled
          ? "cursor-not-allowed border-border bg-muted/20 opacity-50"
          : selected
            ? "border-[rgba(175,195,74,0.52)] bg-[rgba(175,195,74,0.12)] text-[#D7E78A]"
            : "border-border bg-[#1A1C20] hover:border-[rgba(175,195,74,0.34)] hover:bg-[#20241C]"
      )}
    >
      <span className="line-clamp-1 text-[11px] text-muted-foreground">{label}</span>
      <span
        className={cn(
          "flex items-center gap-0.5 font-mono text-sm font-semibold tabular-nums transition-colors",
          dir === "up" && "text-[#D7E78A]",
          dir === "down" && "text-[#E17B8D]"
        )}
      >
        {dir === "up" && <span className="text-[9px] leading-none">▲</span>}
        {dir === "down" && <span className="text-[9px] leading-none">▼</span>}
        {fmtOdds(odds)}
      </span>
    </button>
  );
}
