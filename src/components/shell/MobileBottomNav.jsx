import { Menu as MenuIcon, Dices, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDevMockState } from "@/lib/devMock";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { isArenaAllowed } from "@/lib/platformScope";
import { ARENAS } from "@/lib/arenas";

// Mobile-only icon choice — Trophy reads as a generic sports/competition
// symbol rather than implying one specific sport (the previous Volleyball
// icon could be read as literally "volleyball"). Desktop's arena switcher
// (Sidebar.jsx) keeps its own icon unchanged — this is a mobile-nav-only
// polish, not a desktop navigation change. Icons/colors are presentation,
// not "availability" data — see lib/arenas.js for why id/label live there.
const ARENA_ICONS = { casino: Dices, predictions: TrendingUp, sports: Trophy };
// ONE-BRAND UNIFICATION: the active arena's tint is the single Tribet brand
// colour, not a per-arena hue — see Sidebar.jsx's ACTIVE_ACCENT for the same
// change on desktop. Arena differentiation is icon/label only now.
// `color` (icon/label text on the dark nav bar) uses the lighter
// --global-cta-hover tone — the base brand blue only computes to ~4.4:1
// as small text/icon on this background, below AA; `barColor` (the solid
// 3px indicator bar, not text) keeps the base brand tone.
const PRODUCTS = ARENAS.map((a) => ({ ...a, icon: ARENA_ICONS[a.id], color: "var(--global-cta-hover)", barColor: "var(--global-cta)" }));

// Shared indicator geometry — every item (Menu or arena) uses the exact
// same width/height/radius/position/transition; only colour and opacity
// differ. Always rendered, opacity-toggled (not conditionally mounted) so
// the fade is smooth and consistent everywhere.
const INDICATOR = "pointer-events-none absolute top-0 left-1/2 h-[3px] w-[60%] -translate-x-1/2 rounded-full transition-opacity duration-200";

// The complete primary mobile navigation — four equal-width items, Menu
// first. Pure shared presentation with exactly ONE live instance at any
// moment (see App.jsx and MobileFullScreenMenu.jsx): the shell renders it
// only while the menu is closed, and the menu's own Dialog Content renders
// it internally while open — never both at once, and never via z-index/
// pointer-events tricks to fake one interaction layer out of two DOM
// copies. When rendered in the shell it's a plain static bar (last item in
// the app's flex column, never `fixed`, so iOS Safari's collapsing toolbar
// can't make it float); when rendered inside the menu it's just an
// ordinary descendant of that dialog's own stacking context and focus
// boundary — it needs no z-index or pointer-events override in either
// case. `md:hidden` matches the desktop rail's own breakpoint (see
// Sidebar.jsx) so the two never both show in the 768–1023px range.
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
  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this app.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";

  return (
    <nav
      aria-label="Main product navigation"
      className="relative shrink-0 border-t bg-background md:hidden"
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
          // Gated on `DEV_PANEL_ENABLED` (devPanelFlag.js) — currently
          // `true` in every build including production, same as every
          // other devMock-driven override in this app.
          const disabled = DEV_PANEL_ENABLED && !isArenaAllowed(p.id, platformScope);
          return (
            <button
              key={p.id}
              onClick={disabled ? undefined : () => onSelectArena(p.id)}
              aria-current={active ? "page" : undefined}
              aria-disabled={disabled || undefined}
              aria-label={DEV_PANEL_ENABLED && disabled ? `${p.label}, coming soon` : undefined}
              style={!disabled && active ? { color: p.color } : undefined}
              className={cn(
                "relative flex h-full min-h-11 flex-col items-center justify-center text-[10px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                // Disabled tiles fit a third row (icon/label/Soon pill) into
                // the same fixed tile height, so only they get the tighter
                // gap — enabled tiles (including Casino) keep their
                // original two-line spacing untouched.
                disabled ? "cursor-default gap-0.5" : active ? "gap-1 font-semibold" : "gap-1 font-medium text-muted-foreground"
              )}
            >
              <span
                aria-hidden="true"
                className={cn(INDICATOR, !disabled && active && !menuOpen ? "opacity-100" : "opacity-0")}
                style={{ background: p.barColor }}
              />
              <Icon className={cn("size-5", disabled && "opacity-50")} aria-hidden="true" />
              <span className={cn("max-w-full truncate px-0.5", disabled && "opacity-60")}>{p.label}</span>
              {DEV_PANEL_ENABLED && disabled && (
                <span
                  aria-hidden="true"
                  className="inline-flex h-[18px] items-center justify-center rounded-full border px-1.5 text-[10px] font-medium leading-none text-foreground/50"
                  style={{ background: "var(--badge-muted-bg)", borderColor: "var(--badge-muted-border)" }}
                >
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="pb-[env(safe-area-inset-bottom,0px)]" aria-hidden="true" />
    </nav>
  );
}
