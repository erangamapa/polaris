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
// --content-max-w simply sits unused on the right, which is exactly what
// "do not centre each arena independently based on its own content width"
// calls for.
//
// MAIN CONTENT WIDTH FIX: cap raised from max-w-6xl (1152px) to
// var(--content-max-w) (see index.css — shared with Footer.jsx so the two
// can never drift apart) specifically so normal desktop/laptop widths no
// longer read as artificially cropped when no right panel is mounted.
// MOCKUP ALIGNMENT CORRECTION: space-y-6 -> space-y-8 — a uniform, slightly
// more generous rhythm between each arena's major blocks (promo+search,
// category nav, game catalog), matching the same space-y-8 CasinoCatalog.jsx
// already uses between its own rail sections — one consistent scale rather
// than two different gap sizes stacked on top of each other.
//
// That rhythm was set against a desktop mockup and stays there from sm up. On
// a 390px phone the same 32px between every block spent most of the first
// screen on empty space before a single game was visible, so mobile steps it
// down to 20px. Same scale, one notch tighter where the viewport is scarce.
export function ArenaPageColumn({ children, className }) {
  return (
    <div data-test-id="arena-page-column" className={cn("w-full max-w-[var(--content-max-w)] space-y-5 sm:space-y-8", className)}>
      {children}
    </div>
  );
}
