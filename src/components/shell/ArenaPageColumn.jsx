import { cn } from "@/lib/utils";

// THE one canonical content-column wrapper for all three arenas' page
// content (Casino/Predictions render it once per arena at the top-level
// section component; Sports now renders it once in SportsArena.jsx rather
// than duplicating it in every sub-page — see LAYOUT STABILITY below).
//
// LAYOUT STABILITY (leg-switching jump fix): this is deliberately
// left-anchored (max-width + no auto-centering), NOT `mx-auto`-centered.
// The previous per-arena/per-page copies all used `mx-auto max-w-6xl`,
// which centers by splitting <main>'s CURRENT available width evenly on
// both sides — and <main>'s available width genuinely differs on Sports,
// since the desktop betslip panel (DesktopBetslipPanel.jsx) is a real
// flex sibling of <main> in App.jsx that shrinks it by up to
// var(--sports-betslip-width) (340px) when open, or
// var(--sports-betslip-collapsed-width) (60px) when collapsed. Because
// each arena's content was centering itself against that changing width,
// the content's LEFT EDGE moved depending on which arena/betslip state
// was active — the reported "jump." Left-anchoring instead means the
// content's left edge is always `sidebar width + <main>'s own (constant,
// arena-independent) padding` — it never depends on how much space a
// right-side module is currently using. Any leftover width beyond
// max-w-6xl simply sits unused on the right, which is exactly what "do
// not centre each arena independently based on its own content width"
// calls for.
export function ArenaPageColumn({ children, className }) {
  return (
    <div data-test-id="arena-page-column" className={cn("w-full max-w-6xl space-y-6", className)}>
      {children}
    </div>
  );
}
