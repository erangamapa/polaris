import { useEffect, useRef, useState } from "react";
import { Dices, TrendingUp, Volleyball as SoccerBall } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDevMockState } from "@/lib/devMock";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { isArenaAllowed } from "@/lib/platformScope";
import { ARENAS } from "@/lib/arenas";

// Icons are desktop-rail-specific presentation, not "availability" data —
// see lib/arenas.js for why id/label live there instead of being retyped here.
const ARENA_ICONS = { casino: Dices, predictions: TrendingUp, sports: SoccerBall };
const PRODUCTS = ARENAS.map((a) => ({ ...a, icon: ARENA_ICONS[a.id] }));

// Subtle per-product accents (no left bar) — tint + tinted text only.
// Each product keeps its OWN colour even when another product is active.
const ACCENTS = {
  casino: {
    tab: { background: "rgba(184,92,142,0.12)", color: "#D99AB9", border: "1px solid rgba(184,92,142,0.42)" },
    item: { background: "rgba(184,92,142,0.16)", color: "#D99AB9" },
    bar: "#D99AB9",
  },
  predictions: {
    tab: { background: "rgba(79,167,184,0.12)", color: "#92D4DF", border: "1px solid rgba(79,167,184,0.42)" },
    item: { background: "rgba(79,167,184,0.16)", color: "#92D4DF" },
    bar: "#92D4DF",
  },
  sports: {
    tab: { background: "rgba(175,195,74,0.12)", color: "#D7E78A", border: "1px solid rgba(175,195,74,0.42)" },
    item: { background: "rgba(175,195,74,0.16)", color: "#D7E78A" },
    bar: "#D7E78A",
  },
};

// MOTION QUALITY PASS timing — one small, shared system for every rail
// transition below, rather than duration/easing values scattered per
// element. Mirrors the CSS --motion-* tokens (index.css) but kept as JS
// numbers too where a setTimeout/onTransitionEnd fallback needs the exact
// figure. Do not use these ms values as reasons to add motion elsewhere in
// this file — this list only covers the sidebar transitions this task
// specifically calls for.
const RAIL_WIDTH_MS = 280; // --motion-layout
const LABEL_OUT_MS = 100; // --motion-fast-ish; label fades out FIRST, no delay
const LABEL_IN_MS = 140; // label fades back in, with a short delay (below)
const LABEL_IN_DELAY_MS = 90; // don't start revealing a label until the rail has visibly widened
const TAB_CROSSFADE_MS = 110; // product-tab-row <-> icon-column swap, sequential fade

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function ItemIcon({ icon, className = "size-4" }) {
  if (!icon) return <span className={className} />;
  if (typeof icon === "string") return <span className={cn("grid place-items-center text-sm", className)}>{icon}</span>;
  const Icon = icon;
  return <Icon className={className} />;
}

// Active state is never colour-only: an accent background PLUS a left-edge
// bar, so it still reads correctly for colour-blind users / high-contrast
// mode. Shared by every rail item (arena tab, section item, collapsed icon).
function SideIndicator({ color }) {
  return <span aria-hidden="true" className="absolute inset-y-1 start-0 w-[3px] rounded-full" style={{ background: color }} />;
}

// MOTION QUALITY PASS — one persistent row for both expanded and collapsed
// modes (previously ExpandedRail/CollapsedRail rendered two entirely
// separate element trees, swapped the instant `railMode` changed — see
// SIDEBAR ARCHITECTURE BEFORE in the final report). Now there is exactly
// ONE button per item, always mounted: the icon sits in a fixed-width slot
// that never moves horizontally, and only the label's width/opacity/
// transform animate. This is what makes "icon does not jump", "no
// duplicated focusable controls", and "focus identity stable" true by
// construction rather than by a refocus workaround.
//
// Tooltip is likewise always mounted (never conditionally wrapped/
// unwrapped — that would risk recreating the trigger's DOM node), but its
// open state is fully controlled: `enabled` (collapsed AND the width
// transition has settled) gates whether hover/focus can ever actually show
// it, so it can't appear mid-collapse or while still expanded, and a stale
// hover-intent from just before collapsing can't cause a delayed pop-open
// once `enabled` flips true (see the reset effect below).
function RailItemRow({ navId, icon, label, active, accentColor, onClick, badge, ariaCurrent, testId, disabled, disabledLabel, expanded, tooltipsEnabled }) {
  const [tipOpen, setTipOpen] = useState(false);
  useEffect(() => { if (!tooltipsEnabled) setTipOpen(false); }, [tooltipsEnabled]);

  const button = (
    <button
      id={navId}
      onClick={disabled ? undefined : onClick}
      aria-current={ariaCurrent}
      aria-disabled={disabled || undefined}
      aria-label={!expanded ? (disabled ? `${label}, ${disabledLabel}` : label) : undefined}
      data-test-id={testId}
      className={cn(
        "relative flex h-11 w-full shrink-0 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled ? "cursor-not-allowed" : active ? "font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      )}
      style={!disabled && active ? { background: ACCENTS[accentColor]?.item.background ?? "rgba(255,255,255,0.08)", color: ACCENTS[accentColor]?.item.color } : undefined}
    >
      {!disabled && active && <SideIndicator color={ACCENTS[accentColor]?.bar ?? "currentColor"} />}
      {/* Fixed-width icon slot — this is the element that must never move
          horizontally between modes. Its own left inset (via the button's
          constant px-2.5) is identical whether the rail is 60px or 220px
          wide, so the icon's on-screen X position is stable through the
          whole width transition, not just at the two endpoints. */}
      <span className="grid size-6 shrink-0 place-items-center">
        <ItemIcon icon={icon} className={cn("size-4", disabled && "opacity-50")} />
      </span>
      {/* Label — the ONLY thing that actually animates here. Collapse fades
          it out immediately (no delay, so it can't linger and wrap as the
          rail narrows); expand delays the reveal briefly so the label never
          starts appearing before there is real width to hold it (see
          LABEL_IN_DELAY_MS). aria-hidden while collapsed so this text never
          contributes a second, duplicate accessible name alongside the
          tooltip/aria-label above (see "no hidden labels remaining
          accessible twice"). */}
      <span
        aria-hidden={!expanded || undefined}
        className={cn(
          "min-w-0 flex-1 truncate whitespace-nowrap text-start text-sm motion-reduce:transition-none motion-reduce:duration-0",
          expanded ? "opacity-100" : "pointer-events-none max-w-0 -translate-x-1 opacity-0"
        )}
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: expanded ? `${LABEL_IN_MS}ms` : `${LABEL_OUT_MS}ms`,
          transitionTimingFunction: "var(--ease-emphasized)",
          // The global prefers-reduced-motion rule (index.css) forces
          // transition-DURATION near-zero everywhere via !important, which
          // beats this inline style — but it can't touch transition-DELAY,
          // a separate property. Without zeroing it explicitly here too, a
          // reduced-motion user would still see the label wait 90ms before
          // its (now effectively instant) appearance — a delay is still a
          // delay, not the "switches instantly" this task requires.
          transitionDelay: expanded && !prefersReducedMotion() ? `${LABEL_IN_DELAY_MS}ms` : "0ms",
        }}
      >
        {label}
      </span>
      {badge && (
        <span
          className={cn(
            "shrink-0 transition-[opacity,transform] motion-reduce:transition-none",
            expanded ? "static ms-auto opacity-100" : "absolute -end-1 -top-1 opacity-100"
          )}
          style={{ transitionDuration: "var(--motion-fast)", transitionTimingFunction: "var(--ease-emphasized)" }}
        >
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <Tooltip open={tooltipsEnabled && tipOpen} onOpenChange={setTipOpen}>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={typeof document !== "undefined" && document.dir === "rtl" ? "left" : "right"}>
        {disabled ? disabledLabel : label}
      </TooltipContent>
    </Tooltip>
  );
}

// The items list (Favorites/Recently Played/section labels/dividers) — one
// shared render for both modes now (see RailItemRow above). Section labels
// have no collapsed equivalent (there is nowhere to put the text, and
// they're not focusable/interactive) so they still unmount in collapsed
// mode; that's the one place this list still relies on React's normal
// mount/unmount rather than an animated element, which is fine — nothing
// about a plain heading's disappearance can "jump" an icon or drop focus.
function RailItems({ items, product, selected, onSelect, expanded, tooltipsEnabled }) {
  return (
    <div className="flex flex-col gap-1 px-2">
      {items.map((it) => {
        if (it.sectionLabel) {
          return expanded ? (
            <div key={it.id} className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {it.sectionLabel}
            </div>
          ) : null;
        }
        if (it.divider) {
          return (
            <div
              key={it.id}
              aria-hidden="true"
              className={cn(
                "my-1 h-px self-center bg-white/10 transition-[width] motion-reduce:transition-none",
                expanded ? "w-full" : "w-5"
              )}
              style={{ transitionDuration: "var(--motion-layout)", transitionTimingFunction: "var(--ease-emphasized)" }}
            />
          );
        }
        return (
          <RailItemRow
            key={it.id}
            navId={`nav-item-${it.id}`}
            icon={it.icon}
            label={it.label}
            active={selected === it.id}
            accentColor={product}
            ariaCurrent={selected === it.id ? "page" : undefined}
            onClick={() => (it.action ? it.action() : onSelect(it.id))}
            testId={it.id === "Favorites" ? (expanded ? "sidebar-favorites-count" : "sidebar-favorites-collapsed") : undefined}
            expanded={expanded}
            tooltipsEnabled={tooltipsEnabled}
            badge={
              it.count > 0 ? (
                <StatusBadge
                  variant="neutral"
                  size={expanded ? "medium" : "small"}
                  count={it.count}
                  ariaLabel={it.id === "Favorites" ? `${it.count} favorite${it.count === 1 ? "" : "s"}` : `${it.count} ${it.label}`}
                />
              ) : null
            }
          />
        );
      })}
    </div>
  );
}

// Product/arena tabs (Casino/Predictions/Sports switcher) genuinely change
// SHAPE between modes — a row of three wide tiles (icon over label) versus
// a column of three icon-only squares — not just "same layout, hide text".
// Forcing that into one shared element tree would mean redesigning one of
// the two shapes (out of scope: "not a visual redesign"), so this keeps
// both renderers, but replaces the previous instant unmount/mount with a
// short sequential crossfade (fade out the current shape, swap, fade the
// new one in) timed to roughly track the rail's own width transition —
// see TAB_CROSSFADE_MS. Under reduced motion the swap is immediate, no
// pause (see the effect below).
function ProductTabs({ product, setProduct, platformScope, expanded }) {
  const [visualExpanded, setVisualExpanded] = useState(expanded);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    if (expanded === visualExpanded) return undefined;
    if (prefersReducedMotion()) { setVisualExpanded(expanded); return undefined; }
    setFading(true);
    const t = setTimeout(() => { setVisualExpanded(expanded); setFading(false); }, TAB_CROSSFADE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  return (
    <div
      className="transition-opacity motion-reduce:transition-none"
      style={{ opacity: fading ? 0 : 1, transitionDuration: `${TAB_CROSSFADE_MS}ms`, transitionTimingFunction: "var(--ease-emphasized)" }}
    >
      {visualExpanded ? (
        <div className="flex gap-1.5">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            const active = product === p.id;
            const disabled = DEV_PANEL_ENABLED && !isArenaAllowed(p.id, platformScope);
            const tile = (
              <button
                key={p.id}
                id={`nav-arena-${p.id}`}
                onClick={disabled ? undefined : () => setProduct(p.id)}
                aria-current={active ? "page" : undefined}
                aria-disabled={disabled || undefined}
                aria-label={DEV_PANEL_ENABLED && disabled ? `${p.label}, coming soon` : undefined}
                style={!disabled && active ? ACCENTS[p.id].tab : undefined}
                className={cn(
                  "relative flex h-[54px] flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-transparent px-1 text-[11px] transition-[color,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  disabled ? "cursor-not-allowed" : active ? "font-medium" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4", disabled && "opacity-50")} aria-hidden="true" />
                <span className={disabled ? "opacity-50" : undefined}>{p.label}</span>
              </button>
            );
            if (DEV_PANEL_ENABLED && disabled) {
              return (
                <Tooltip key={p.id}>
                  <TooltipTrigger asChild>{tile}</TooltipTrigger>
                  <TooltipContent>Coming soon</TooltipContent>
                </Tooltip>
              );
            }
            return tile;
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {PRODUCTS.map((p) => {
            const disabled = DEV_PANEL_ENABLED && !isArenaAllowed(p.id, platformScope);
            return (
              <RailIconOnly
                key={p.id}
                navId={`nav-arena-${p.id}`}
                icon={p.icon}
                label={p.label}
                active={product === p.id}
                accentColor={p.id}
                ariaCurrent={product === p.id ? "page" : undefined}
                onClick={() => setProduct(p.id)}
                disabled={disabled}
                disabledLabel={DEV_PANEL_ENABLED ? "Coming soon" : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Plain icon-only rail button (collapsed product tabs only — the items
// list uses the unified RailItemRow above instead). Tooltip here is a
// straightforward hover/focus one: the product row's own crossfade already
// keeps it from being interactive mid-swap (opacity 0 + no pointer events
// during `fading`), so it doesn't need the settle-gated controlled-open
// treatment RailItemRow uses.
function RailIconOnly({ navId, icon, label, active, accentColor, onClick, disabled, disabledLabel }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          id={navId}
          onClick={disabled ? undefined : onClick}
          aria-label={disabled ? `${label}, ${disabledLabel}` : label}
          aria-current={active ? "page" : undefined}
          aria-disabled={disabled || undefined}
          className={cn(
            "relative grid size-11 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            disabled ? "cursor-not-allowed" : active ? "font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
          style={!disabled && active ? { background: ACCENTS[accentColor]?.item.background ?? "rgba(255,255,255,0.08)", color: ACCENTS[accentColor]?.item.color } : undefined}
        >
          {!disabled && active && <SideIndicator color={ACCENTS[accentColor]?.bar ?? "currentColor"} />}
          <ItemIcon icon={icon} className={cn("size-4", disabled && "opacity-50")} />
        </button>
      </TooltipTrigger>
      <TooltipContent side={typeof document !== "undefined" && document.dir === "rtl" ? "left" : "right"}>{disabled ? disabledLabel : label}</TooltipContent>
    </Tooltip>
  );
}

// Desktop/tablet only (≥768px) — never fully hidden; burger toggles between
// an expanded rail (~220px, full labels) and a collapsed icon rail (~60px),
// per `railMode`. Below 768px this renders nothing: mobile navigation is the
// bottom nav + MobileFullScreenMenu (a dedicated mobile-first component, not
// this desktop rail reused as an overlay).
//
// MOTION QUALITY PASS: the items list (the majority of this rail's rows)
// now shares one persistent DOM between modes — see RailItems/RailItemRow
// above. `settled` tracks whether the width transition has actually
// finished (via onTransitionEnd, with a matching setTimeout fallback for
// reduced motion, where no transitionend event fires because the duration
// is effectively zero) so tooltips can only appear once the rail has
// genuinely reached its collapsed width, never mid-animation.
export function Sidebar({ railMode, product, setProduct, items, selected, onSelect }) {
  const expanded = railMode === "expanded";
  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this app.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";

  // Focus retention across the product-tabs boundary — that section is
  // still two different element trees (see ProductTabs above), so a nav
  // item that WAS the product-tab row's focused element can still lose
  // focus to <body> when the shape swaps. The items list no longer needs
  // this (same DOM the whole time), but keeping the mechanism generic and
  // harmless for the one remaining case is simpler than special-casing it.
  const focusedIdRef = useRef(null);
  const onFocusCapture = (e) => {
    if (e.target.id?.startsWith("nav-")) focusedIdRef.current = e.target.id;
  };
  useEffect(() => {
    const id = focusedIdRef.current;
    if (!id) return;
    document.getElementById(id)?.focus();
  }, [expanded]);

  // Announce meaningful nav-state changes only (not every animation frame,
  // and not duplicating the burger button's own aria-label, which describes
  // the *next* action rather than the state just entered).
  const [announcement, setAnnouncement] = useState("");
  const prevExpanded = useRef(expanded);
  useEffect(() => {
    if (prevExpanded.current !== expanded) setAnnouncement(expanded ? "Navigation expanded" : "Navigation collapsed");
    prevExpanded.current = expanded;
  }, [expanded]);

  // Tooltips are only ever allowed once collapsed AND the width transition
  // has genuinely finished — see the file-level comment above. Starts
  // "settled" (true) since the very first paint isn't mid-transition.
  const [settled, setSettled] = useState(true);
  const navRef = useRef(null);
  useEffect(() => {
    setSettled(false);
    if (prefersReducedMotion()) { setSettled(true); return undefined; }
    const t = setTimeout(() => setSettled(true), RAIL_WIDTH_MS);
    return () => clearTimeout(t);
  }, [expanded]);
  const onNavTransitionEnd = (e) => { if (e.target === navRef.current && e.propertyName === "width") setSettled(true); };
  const tooltipsEnabled = settled && !expanded;

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

      {/* desktop/tablet persistent rail — never fully hidden at md+, never
          rendered below it. `<nav>` with an accessible name, not a bare
          `<aside>`: this whole rail IS the app's primary navigation (arena
          switcher + section links), not supplementary/tangential content,
          so `nav` is the correct landmark role here (see LANDMARKS: "Casino
          sidebar navigation... use concise accessible names"). */}
      <nav
        ref={navRef}
        aria-label="Casino sidebar"
        onFocusCapture={onFocusCapture}
        onTransitionEnd={onNavTransitionEnd}
        className={cn(
          "hidden shrink-0 overflow-hidden border-e bg-sidebar transition-[width] duration-200 motion-reduce:transition-none md:block",
          expanded ? "md:w-[220px]" : "md:w-[60px]"
        )}
        style={{ transitionDuration: `${RAIL_WIDTH_MS}ms`, transitionTimingFunction: "var(--ease-emphasized)" }}
      >
        <div className="h-full overflow-y-auto overflow-x-hidden">
          <div className="p-3">
            <ProductTabs product={product} setProduct={setProduct} platformScope={platformScope} expanded={expanded} />
            {/* Arena/section boundary — same distinct, more opaque rule in
                both modes (width itself is the only thing that changes). */}
            <div
              className={cn("my-2 border-t-2 border-white/15 transition-[width] motion-reduce:transition-none", expanded ? "w-full" : "mx-auto w-8")}
              style={{ transitionDuration: "var(--motion-layout)", transitionTimingFunction: "var(--ease-emphasized)" }}
            />
          </div>
          <RailItems items={items} product={product} selected={selected} onSelect={onSelect} expanded={expanded} tooltipsEnabled={tooltipsEnabled} />
        </div>
      </nav>
    </>
  );
}
