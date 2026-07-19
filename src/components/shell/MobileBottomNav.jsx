import { Menu as MenuIcon, Dices, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

// Mobile-only icon choice — Trophy reads as a generic sports/competition
// symbol rather than implying one specific sport (the previous Volleyball
// icon could be read as literally "volleyball"). Desktop's arena switcher
// (Sidebar.jsx) keeps its own icon unchanged — this is a mobile-nav-only
// polish, not a desktop navigation change.
const PRODUCTS = [
  { id: "casino", label: "Casino", icon: Dices, color: "#D99AB9" },
  { id: "predictions", label: "Predictions", icon: TrendingUp, color: "#92D4DF" },
  { id: "sports", label: "Sports", icon: Trophy, color: "#D7E78A" },
];

// Shared indicator geometry — every item (Menu or arena) uses the exact
// same width/height/radius/position/transition; only colour and opacity
// differ. Always rendered, opacity-toggled (not conditionally mounted) so
// the fade is smooth and consistent everywhere.
const INDICATOR = "pointer-events-none absolute top-0 left-1/2 h-[3px] w-[60%] -translate-x-1/2 rounded-full transition-opacity duration-200";

// The complete primary mobile navigation — four equal-width items, Menu
// first. Static bar (last item in the app's flex column) — never `fixed`,
// so iOS Safari's collapsing toolbar can't make it float. `relative z-[80]`
// keeps it stacked *above* the full-screen menu (z-[70], `fixed inset-0`) —
// otherwise the menu would cover the Menu button itself, making "tap Menu
// again" / "switch arena" (both listed close triggers) unreachable while
// open. `pointer-events-auto` is required too: Radix's modal scroll lock
// sets `pointer-events: none` on <body>, which this bar would otherwise
// inherit (it's a body descendant) despite winning the z-index stack.
// `md:hidden` matches the desktop rail's own breakpoint (see Sidebar.jsx)
// so the two never both show in the 768–1023px range.
//
// Menu switches the *section* menu for whichever arena is already active;
// it never switches arenas itself, and stays visually generic (burger only
// — no X morph, see MobileFullScreenMenu's top-right close for that) in
// every arena — the active arena item already gives context, so the button
// never carries an arena icon, color or count.
//
// Active-state hierarchy: only one top indicator is ever shown at a time.
// While the menu is open, the Menu item's indicator (neutral, strong) is
// the only one visible — the active arena keeps its tinted icon/label (it
// IS still active) but its own indicator fades out, so the two states read
// as "menu open, over Casino" rather than two equally loud signals.
export function MobileBottomNav({ product, onSelectArena, menuOpen, onToggleMenu }) {
  return (
    <nav
      aria-label="Main product navigation"
      className="relative z-[80] shrink-0 border-t bg-background pointer-events-auto md:hidden"
    >
      {/* Fixed content height (--mobile-nav-height, kept in sync with the
          shared bottom-padding calc other mobile surfaces use) lives in its
          own box, separate from the safe-area spacer below — so the inset
          always ADDS to the visual nav height instead of eating into it. */}
      <div className="grid h-[var(--mobile-nav-height)] grid-cols-4">
        <button
          id="mobile-menu-trigger"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-controls="mobile-fullscreen-menu"
          aria-label="Menu"
          className={cn(
            "relative flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
            menuOpen ? "font-semibold text-foreground" : "font-medium text-muted-foreground active:text-foreground"
          )}
        >
          <span aria-hidden="true" className={cn(INDICATOR, "bg-foreground/80", menuOpen ? "opacity-100" : "opacity-0")} />
          <MenuIcon className="size-5" aria-hidden="true" />
          Menu
        </button>

        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          const active = product === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectArena(p.id)}
              aria-current={active ? "page" : undefined}
              style={active ? { color: p.color } : undefined}
              className={cn(
                "relative flex h-full min-h-11 flex-col items-center justify-center gap-1 text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                active ? "font-semibold" : "font-medium text-muted-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(INDICATOR, active && !menuOpen ? "opacity-100" : "opacity-0")}
                style={{ background: p.color }}
              />
              <Icon className="size-5" aria-hidden="true" />
              <span className="max-w-full truncate px-0.5">{p.label}</span>
            </button>
          );
        })}
      </div>
      <div className="pb-[env(safe-area-inset-bottom,0px)]" aria-hidden="true" />
    </nav>
  );
}
