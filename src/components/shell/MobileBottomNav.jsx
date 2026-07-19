import { Menu as MenuIcon, X, Dices, TrendingUp, Volleyball as SoccerBall } from "lucide-react";
import { cn } from "@/lib/utils";

const PRODUCTS = [
  { id: "casino", label: "Casino", icon: Dices, color: "#D99AB9" },
  { id: "predictions", label: "Predictions", icon: TrendingUp, color: "#92D4DF" },
  { id: "sports", label: "Sports", icon: SoccerBall, color: "#D7E78A" },
];

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
// it never switches arenas itself, and stays visually generic (burger/X +
// "Menu" label only) in every arena — the active arena item already gives
// context, so the button never carries an arena icon, color or count.
export function MobileBottomNav({ product, onSelectArena, menuOpen, onToggleMenu }) {
  return (
    <nav
      aria-label="Main product navigation"
      className="relative z-[80] grid shrink-0 grid-cols-4 border-t bg-background pb-[env(safe-area-inset-bottom,0px)] pointer-events-auto md:hidden"
    >
      <button
        id="mobile-menu-trigger"
        onClick={onToggleMenu}
        aria-expanded={menuOpen}
        aria-controls="mobile-fullscreen-menu"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        className={cn(
          "relative flex min-h-11 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          menuOpen ? "font-medium text-foreground" : "text-muted-foreground"
        )}
      >
        {menuOpen && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-[3px] rounded-full bg-foreground/70" />}
        <span className="relative grid size-5 place-items-center" aria-hidden="true">
          <MenuIcon className={cn("absolute size-5 transition-opacity duration-150 motion-reduce:transition-none", menuOpen ? "opacity-0" : "opacity-100")} />
          <X className={cn("absolute size-5 transition-opacity duration-150 motion-reduce:transition-none", menuOpen ? "opacity-100" : "opacity-0")} />
        </span>
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
              "relative flex min-h-11 flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active ? "font-medium" : "text-muted-foreground"
            )}
          >
            {active && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-[3px] rounded-full" style={{ background: p.color }} />}
            <Icon className="size-5" aria-hidden="true" />
            <span className="max-w-full truncate px-0.5">{p.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
