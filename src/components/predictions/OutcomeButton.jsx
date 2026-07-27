import { cn } from "@/lib/utils";

// THE one shared Yes/No control for Prediction Markets — MarketCard's
// quick-buy pair, MarketDetail's Buy Yes/Buy No, PositionTicket's side
// toggle, and PositionTicket's final confirm button (rendered with
// `selected` always true, full width) all render through this, so every
// Yes/No surface in the app shares one token source (see index.css's
// PREDICTION MARKETS block) instead of each hardcoding its own colors.
//
// Resting (selected=false): soft tint + border + coloured text — equal
// visual weight for both sides. Buying NO is the opposite position, not a
// destructive action, so it never gets the app's generic error-button
// treatment. Selected (a committed/active side): solid semantic fill with
// high-contrast text. Only one side is ever visually "selected" at a time
// — callers control that by only ever passing `selected` to the side that
// matches their own current selection state, never both.
//
// No transform/scale, no shadow, no glow — only a background-color/
// border-color/color transition, never every property at once.
export function OutcomeButton({ side, selected = false, disabled = false, className, children, ...props }) {
  const isYes = side === "Yes";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-1 rounded-md border text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed border-[var(--border)] bg-[var(--muted)] text-[var(--disabled)]",
        !disabled && isYes && !selected &&
          "border-[var(--yes-border)] bg-[var(--yes-soft)] text-[var(--yes-base)] hover:border-[var(--yes-hover)] hover:bg-[var(--yes-soft-hover)] hover:text-[var(--yes-hover)] active:border-[var(--yes-pressed)] active:text-[var(--yes-pressed)]",
        !disabled && isYes && selected &&
          "border-[var(--yes-base)] bg-[var(--yes-base)] text-[var(--yes-selected-text)] hover:border-[var(--yes-hover)] hover:bg-[var(--yes-hover)] active:border-[var(--yes-pressed)] active:bg-[var(--yes-pressed)]",
        !disabled && !isYes && !selected &&
          "border-[var(--no-border)] bg-[var(--no-soft)] text-[var(--no-base)] hover:border-[var(--no-hover)] hover:bg-[var(--no-soft-hover)] hover:text-[var(--no-hover)] active:border-[var(--no-pressed)] active:text-[var(--no-pressed)]",
        !disabled && !isYes && selected &&
          "border-[var(--no-base)] bg-[var(--no-base)] text-[var(--no-selected-text)] hover:border-[var(--no-hover)] hover:bg-[var(--no-hover)] active:border-[var(--no-pressed)] active:bg-[var(--no-pressed)]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
