import { cn } from "@/lib/utils";

// TOOLBAR REDESIGN — the ONE shared control every GameUtilityBar action
// renders through (Game Info / Report Issue / Fullscreen). A real
// <button>, never clickable text or a div — same height, padding, icon
// size, gap, typography, and hover/pressed/focus/disabled treatment for
// every slot, filling its grid column exactly (see GameUtilityBar's
// `grid-cols-3`) so every slot is a genuine equal third, not just
// visually similar.
//
// `label`/`mobileLabel` are both real text nodes (not one hidden via JS) —
// only one is ever visible at a given breakpoint (Tailwind `hidden`
// utilities), and CSS `display:none` content is excluded from accessible-
// name computation, so the control's accessible name always matches
// whichever label is actually on screen — "Report Issue" on desktop,
// "Report" on mobile — with no separate aria-label needed.
export function GameUtilityAction({ icon: Icon, label, mobileLabel, onClick, pressed, disabled, testId, dividerLeft }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed || undefined}
      data-test-id={testId}
      title={label}
      className={cn(
        "flex h-11 min-w-0 items-center justify-center gap-1.5 px-2 text-[11px] font-medium leading-none transition-colors duration-150 sm:gap-2 sm:px-3 sm:text-xs",
        // `ring-inset` (not the app's usual outset ring) — GameUtilityBar's
        // own `overflow-hidden` (needed to clip content to its rounded
        // bottom corners) would otherwise clip an outset ring at the
        // toolbar's edges, exactly the "clipped focus ring" failure mode
        // the earlier game-header pass already had to avoid.
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
        dividerLeft && "border-l border-white/5",
        disabled
          ? "cursor-not-allowed text-zinc-600 opacity-50"
          : pressed
            ? "bg-white/[0.04] text-white"
            : "text-zinc-400 hover:bg-white/[0.03] hover:text-white active:bg-white/[0.06]"
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden truncate sm:inline">{label}</span>
      <span className="truncate sm:hidden">{mobileLabel ?? label}</span>
    </button>
  );
}
