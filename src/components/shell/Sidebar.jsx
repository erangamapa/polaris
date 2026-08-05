import { useEffect, useRef, useState } from "react";
import { Dices, TrendingUp, Volleyball as SoccerBall } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDevMockState } from "@/lib/devMock";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { isArenaAllowed } from "@/lib/platformScope";
import { ARENAS } from "@/lib/arenas";
import { SIDEBAR_SETTLE_MS, railVisuals } from "@/lib/sidebarTransition";

// Icons are desktop-rail-specific presentation, not "availability" data —
// see lib/arenas.js for why id/label live there instead of being retyped here.
const ARENA_ICONS = { casino: Dices, predictions: TrendingUp, sports: SoccerBall };
const PRODUCTS = ARENAS.map((a) => ({ ...a, icon: ARENA_ICONS[a.id] }));

// ONE-BRAND UNIFICATION: navigation no longer changes colour by arena — the
// active item (arena tab or in-arena nav item alike) always uses the single
// Tribet brand colour. Arena differentiation now comes from icon/label/
// content only, never a separate per-arena accent (previously a
// casino/predictions/sports-keyed ACCENTS map, each pointing at that arena's
// own --*-accent/--*-text-accent tokens — removed as the arena-specific
// navigation colouring this pass explicitly retires).
const ACTIVE_ACCENT = {
  tab: {
    background: "color-mix(in srgb, var(--global-cta) 12%, transparent)",
    // Text on a subtle brand-tinted background (not a solid brand fill) —
    // the base brand blue only computes to ~3.8:1 here, below AA; the
    // lighter --global-cta-hover tone (per Meridian Blue's own "use the
    // hover tone for brand-colored text on dark panels" rule) passes.
    color: "var(--global-cta-hover)",
    border: "1px solid color-mix(in srgb, var(--global-cta) 42%, transparent)",
  },
  item: { background: "color-mix(in srgb, var(--global-cta) 16%, transparent)", color: "var(--global-cta-hover)" },
  bar: "var(--global-cta)",
};

// SIDEBAR SEQUENTIAL HANDOFF — one source of truth for both the shell's
// own width and each layer's own FIXED width (see CompactSidebarLayer/
// ExpandedSidebarLayer below — this is what makes "collapsed icons remain
// in their original left-anchored position" true regardless of the
// shell's own current, possibly-animating width, rather than true only
// when timing happens to line up).
const SIDEBAR_COLLAPSED_WIDTH_PX = 60;
const SIDEBAR_EXPANDED_WIDTH_PX = 220;
const SIDEBAR_SHELL_DURATION_MS = 145;
const SIDEBAR_SHELL_START_DELAY_MS = 24;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// SOFT OVERLAPPING FADE — replaces an earlier discrete phase machine that
// waited for each step (outgoing fade, then shell width, then incoming
// fade) to fully finish before starting the next. That produced a
// noticeably long blank pause. This hook just tracks whether the whole
// sequence has had enough time to visually settle — the actual outgoing-
// fade/shell-width/incoming-fade choreography is pure CSS (delay+duration
// values from lib/sidebarTransition.js, applied directly in this file's
// JSX below), left to run concurrently rather than JS-timer-chained.
// `settled` only gates interactivity/tooltips/AT-exposure, never the
// visual animation itself — so reversing direction mid-transition is just
// "the CSS target flipped, the browser reverses it", no special handling
// needed, and rapid toggling can't get anything stuck: this is the ONLY
// timer in the whole component, and React's effect cleanup on every
// `desiredExpanded` change cancels whichever one was pending before.
function useSidebarSettled(desiredExpanded) {
  const [settled, setSettled] = useState(true);
  useEffect(() => {
    if (prefersReducedMotion()) {
      setSettled(true);
      return undefined;
    }
    setSettled(false);
    const t = setTimeout(() => setSettled(true), SIDEBAR_SETTLE_MS);
    return () => clearTimeout(t);
  }, [desiredExpanded]);
  return settled;
}

// RESKIN (product-language unification): the string-icon branch this used
// to have (rendering a raw emoji glyph as text) is gone — Sports' sport
// icons were the only caller ever passing a string, and those are now
// Lucide components too (see sportsModel.js), matching every other
// arena's icon system. No emoji anywhere in the icon system now.
function ItemIcon({ icon, className = "size-4" }) {
  if (!icon) return <span className={className} />;
  const Icon = icon;
  return <Icon className={className} />;
}

// Active state is never colour-only: an accent background PLUS a left-edge
// bar, so it still reads correctly for colour-blind users / high-contrast
// mode. Shared by every rail item (arena tab, section item, both layers).
function SideIndicator({ color }) {
  return <span aria-hidden="true" className="absolute inset-y-1 start-0 w-[3px] rounded-full" style={{ background: color }} />;
}

const tooltipSide = () => (typeof document !== "undefined" && document.dir === "rtl" ? "left" : "right");

// ════════════════════════════════════════════════════════════════════════
// COMPACT LAYER — icon-only. Every row is a fixed size-11 (44px) square.
// The LAYER ITSELF (see CompactSidebarLayer's own wrapping div, rendered
// by Sidebar below) is absolutely positioned at a FIXED
// SIDEBAR_COLLAPSED_WIDTH_PX, pinned to the left edge — not sized to
// whatever the shell's own (possibly-animating) current width happens to
// be. That is what makes "collapsed icons never travel toward the
// centre" true unconditionally: `items-center` here only ever centers
// icons within this layer's own constant 60px box, never within a
// growing container (the bug the previous version had — see the report).
// ════════════════════════════════════════════════════════════════════════
function CompactButton({ id, icon, label, active, onClick, disabled, disabledLabel, badge, ariaCurrent, testId, tooltipsEnabled, pulseSeq }) {
  const [tipOpen, setTipOpen] = useState(false);
  useEffect(() => { if (!tooltipsEnabled) setTipOpen(false); }, [tooltipsEnabled]);

  return (
    <Tooltip open={tooltipsEnabled && tipOpen} onOpenChange={setTipOpen}>
      <TooltipTrigger asChild>
        <button
          id={id}
          onClick={disabled ? undefined : onClick}
          aria-label={disabled ? `${label}, ${disabledLabel}` : label}
          aria-current={ariaCurrent}
          aria-disabled={disabled || undefined}
          data-test-id={testId}
          className={cn(
            "relative grid size-11 shrink-0 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            disabled ? "cursor-not-allowed" : active ? "font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          )}
          style={!disabled && active ? { background: ACTIVE_ACCENT.item.background, color: ACTIVE_ACCENT.item.color } : undefined}
        >
          {!disabled && active && <SideIndicator color={ACTIVE_ACCENT.bar} />}
          {/* SURFACE HIERARCHY POLISH: inactive icons get their own
              slightly-brighter tone (--icon-secondary) instead of
              inheriting the same --muted-foreground the label next to
              them (in the expanded layer) also uses — active/disabled
              icons are untouched, keeping ACTIVE_ACCENT's inherited color
              and the existing disabled treatment exactly as before.
              FAVORITES ADD CUE: `pulseSeq` (only ever set on the Favorites
              item, see App.jsx's sidebar builder) is a sequence number, not
              a boolean — `key={pulseSeq}` on the icon below forces a fresh
              remount (and therefore a fresh animation play) on every single
              add, including two adds fired in quick succession, rather than
              a second `true` value being a no-op against an already-`true`
              one. The animation class is additive, not a replacement branch
              of the color ternary: index.css's keyframe drives color/fill
              itself while playing and has no fill-mode holding it open
              afterward, so the underlying --icon-secondary/active-accent
              color classes correctly take back over the instant it ends —
              a one-shot coral fill on just the icon, never the row/
              background (see VISUAL STYLE: "no permanently red sidebar
              row"). */}
          <span className="relative grid size-6 place-items-center rounded-md">
            <ItemIcon
              key={pulseSeq}
              icon={icon}
              className={cn(
                "size-4",
                pulseSeq > 0 && "sidebar-fav-heart-pulse",
                !disabled && !active && "text-[var(--icon-secondary)]",
                disabled && "opacity-50"
              )}
            />
          </span>
          {badge && <span className="absolute -end-1 -top-1">{badge}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide()}>{disabled ? disabledLabel : label}</TooltipContent>
    </Tooltip>
  );
}

// The whole compact composition: arena-tab icon column, a short boundary
// rule, then the item icons — every id suffixed `-compact` (this layer
// and the expanded layer below are BOTH permanently mounted at once, so
// the same logical nav destination needs two distinct DOM ids — two
// elements sharing one id would be invalid HTML and break
// `getElementById`-based focus restoration).
function CompactSidebarLayer({ product, setProduct, items, selected, onSelect, platformScope, tooltipsEnabled }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3">
      {PRODUCTS.map((p) => {
        const disabled = DEV_PANEL_ENABLED && !isArenaAllowed(p.id, platformScope);
        return (
          <CompactButton
            key={p.id}
            id={`nav-arena-${p.id}-compact`}
            icon={p.icon}
            label={p.label}
            active={product === p.id}
            ariaCurrent={product === p.id ? "page" : undefined}
            onClick={() => setProduct(p.id)}
            disabled={disabled}
            disabledLabel={DEV_PANEL_ENABLED ? "Coming soon" : undefined}
            tooltipsEnabled={tooltipsEnabled}
          />
        );
      })}
      {/* LOBBY HIERARCHY PASS: 25% -> 15% — the sidebar should read quieter
          than the arena content next to it; this divider is purely
          decorative separation, not a signal that needs to stay bold. */}
      <div aria-hidden="true" className="my-1 h-px w-8 bg-white/15" />
      {items.map((it) => {
        // Section labels have no compact equivalent (nowhere to put text,
        // not focusable) — simply omitted.
        if (it.sectionLabel) return null;
        if (it.divider) return <div key={it.id} aria-hidden="true" className="my-1 h-px w-5 bg-white/10" />;
        return (
          <CompactButton
            key={it.id}
            id={`nav-item-${it.id}-compact`}
            icon={it.icon}
            label={it.label}
            active={selected === it.id}
            ariaCurrent={selected === it.id ? "page" : undefined}
            onClick={() => (it.action ? it.action() : onSelect(it.id))}
            testId={it.id === "Favorites" ? "sidebar-favorites-collapsed" : undefined}
            tooltipsEnabled={tooltipsEnabled}
            pulseSeq={it.pulseSeq}
            badge={
              it.count > 0 ? (
                <StatusBadge
                  variant="neutral"
                  size="small"
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

// ════════════════════════════════════════════════════════════════════════
// EXPANDED LAYER — full labeled rows, section headings, dividers, the
// three-tile arena-tab row. Also absolutely positioned at its own FIXED
// SIDEBAR_EXPANDED_WIDTH_PX (see Sidebar below) — by the time this layer
// is ever visible (opacity > 0), the shell has already fully finished
// widening (OPENING always completes before EXPANDED_REVEALING begins —
// see lib/sidebarTransition.js), so its width never has to "catch up".
// ════════════════════════════════════════════════════════════════════════
function ExpandedItemRow({ id, icon, label, active, onClick, badge, ariaCurrent, testId, pulseSeq }) {
  return (
    <button
      id={id}
      onClick={onClick}
      aria-current={ariaCurrent}
      data-test-id={testId}
      className={cn(
        "relative flex h-11 w-full shrink-0 items-center gap-2.5 overflow-hidden rounded-lg px-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
      )}
      style={active ? { background: ACTIVE_ACCENT.item.background, color: ACTIVE_ACCENT.item.color } : undefined}
    >
      {active && <SideIndicator color={ACTIVE_ACCENT.bar} />}
      <span className="relative grid size-6 shrink-0 place-items-center rounded-md">
        {/* SURFACE HIERARCHY POLISH: icon and label are separate elements
            but previously inherited the identical --muted-foreground tone
            from this button when inactive — --icon-secondary gives the
            icon its own slightly brighter value without touching the
            label span below, which stays on --muted-foreground exactly as
            before. Active rows are untouched (still inherit
            ACTIVE_ACCENT's colour via the button's inline style).
            FAVORITES ADD CUE: see CompactButton's own comment on why
            `pulseSeq` is a sequence number keyed onto the icon (not a
            boolean class branch) and why the animation is additive rather
            than replacing the normal color class. */}
        <ItemIcon
          key={pulseSeq}
          icon={icon}
          className={cn("size-4", pulseSeq > 0 && "sidebar-fav-heart-pulse", !active && "text-[var(--icon-secondary)]")}
        />
      </span>
      <span className="min-w-0 flex-1 truncate whitespace-nowrap text-start text-sm">{label}</span>
      {badge && <span className="ms-auto shrink-0">{badge}</span>}
    </button>
  );
}

function ExpandedSidebarLayer({ product, setProduct, items, selected, onSelect, platformScope }) {
  return (
    <div>
      <div className="p-3">
        <div className="flex gap-1.5">
          {PRODUCTS.map((p) => {
            const Icon = p.icon;
            const active = product === p.id;
            const disabled = DEV_PANEL_ENABLED && !isArenaAllowed(p.id, platformScope);
            const tile = (
              <button
                key={p.id}
                id={`nav-arena-${p.id}-expanded`}
                onClick={disabled ? undefined : () => setProduct(p.id)}
                aria-current={active ? "page" : undefined}
                aria-disabled={disabled || undefined}
                aria-label={DEV_PANEL_ENABLED && disabled ? `${p.label}, coming soon` : undefined}
                style={!disabled && active ? ACTIVE_ACCENT.tab : undefined}
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
        {/* LOBBY HIERARCHY PASS: /12 -> /8, and 2px -> 1px — the sidebar
            should read quieter than the arena content next to it; this
            divider is purely decorative separation, not a signal that
            needs to stay bold. */}
        <div className="my-2 w-full border-t border-white/8" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1 px-2">
        {items.map((it) => {
          if (it.sectionLabel) {
            return (
              <div key={it.id} className="text-label px-2.5 pb-1 pt-2">
                {it.sectionLabel}
              </div>
            );
          }
          if (it.divider) return <div key={it.id} aria-hidden="true" className="my-1 h-px w-full bg-white/10" />;
          return (
            <ExpandedItemRow
              key={it.id}
              id={`nav-item-${it.id}-expanded`}
              icon={it.icon}
              label={it.label}
              active={selected === it.id}
              ariaCurrent={selected === it.id ? "page" : undefined}
              onClick={() => (it.action ? it.action() : onSelect(it.id))}
              testId={it.id === "Favorites" ? "sidebar-favorites-count" : undefined}
              pulseSeq={it.pulseSeq}
              badge={
                it.count > 0 ? (
                  <StatusBadge
                    variant="neutral"
                    size="medium"
                    count={it.count}
                    ariaLabel={it.id === "Favorites" ? `${it.count} favorite${it.count === 1 ? "" : "s"}` : `${it.count} ${it.label}`}
                    className="ms-auto"
                  />
                ) : null
              }
            />
          );
        })}
      </div>
    </div>
  );
}

// Desktop/tablet only (≥768px) — never fully hidden; burger toggles between
// an expanded rail (~220px, full labels) and a collapsed icon rail (~60px),
// per `railMode`. Below 768px this renders nothing: mobile navigation is
// the bottom nav + MobileFullScreenMenu, untouched by this pass.
//
// SIDEBAR SOFT OVERLAPPING FADE — replaces two earlier designs. The first
// (a full crossfade) stacked both layers in one shared, width-animating
// CSS grid cell, so the compact layer's `items-center` centered its icons
// within that CURRENT, growing width — icons visibly drifted toward the
// centre — and cross-faded both layers' opacity during the same window,
// so a dense expanded menu and the compact icon column were both
// partially visible and overlapping (busy, not a subtle blend). The
// second (strictly sequential: fade out fully, THEN resize, THEN fade in)
// fixed both of those, but the strict full-completion waiting between
// each step produced a noticeably long blank pause.
//
// This version keeps every structural fix from the sequential pass
// (each layer absolutely positioned at its OWN fixed width — see
// CompactSidebarLayer/ExpandedSidebarLayer, still true here, still what
// makes icons immovable regardless of the shell's current width) but
// replaces the JS-timer-chained waiting with plain concurrent CSS: the
// outgoing fade, the shell width, and the incoming fade all start on
// their own fixed delay (see lib/sidebarTransition.js's constants) and
// run at the same time, coordinated only by those delay values — no
// waiting for one to finish before starting the next.
export function Sidebar({ railMode, product, setProduct, items, selected, onSelect }) {
  const desiredExpanded = railMode === "expanded";
  const settled = useSidebarSettled(desiredExpanded);
  const { widthExpanded, compactOpacity, expandedOpacity, compactInteractive, expandedInteractive, compactTiming, expandedTiming } = railVisuals(desiredExpanded, settled);

  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this app.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";

  // Focus retention across the layer swap. Both layers use ids suffixed
  // `-compact`/`-expanded` for the SAME logical destination (two elements
  // can't share one id), so this tracks the LOGICAL key (id minus suffix)
  // continuously, and only actually refocuses once the whole sequence has
  // settled — refocusing any earlier would target an element that isn't
  // interactive yet (compactInteractive/expandedInteractive are each true
  // only once settled, in the direction that matches).
  const focusedIdRef = useRef(null);
  const onFocusCapture = (e) => {
    const id = e.target.id;
    const match = id && /^(nav-(?:item|arena)-.+)-(?:compact|expanded)$/.exec(id);
    if (match) focusedIdRef.current = match[1];
  };
  useEffect(() => {
    if (!settled) return;
    const key = focusedIdRef.current;
    if (!key) return;
    const suffix = desiredExpanded ? "expanded" : "compact";
    document.getElementById(`${key}-${suffix}`)?.focus();
  }, [settled, desiredExpanded]);

  // Announce meaningful nav-state changes only — keyed on the raw
  // requested target, matching what the user actually asked for.
  const [announcement, setAnnouncement] = useState("");
  const prevDesiredExpanded = useRef(desiredExpanded);
  useEffect(() => {
    if (prevDesiredExpanded.current !== desiredExpanded) setAnnouncement(desiredExpanded ? "Navigation expanded" : "Navigation collapsed");
    prevDesiredExpanded.current = desiredExpanded;
  }, [desiredExpanded]);

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

      {/* desktop/tablet persistent rail — never fully hidden at md+, never
          rendered below it. `<nav>` with an accessible name, not a bare
          `<aside>`: this whole rail IS the app's primary navigation (arena
          switcher + section links), not supplementary/tangential content. */}
      <nav
        data-sidebar-state={!settled ? "transitioning" : desiredExpanded ? "expanded" : "collapsed"}
        aria-label="Casino sidebar"
        onFocusCapture={onFocusCapture}
        className={cn(
          // LOBBY HIERARCHY PASS: the default `border-e` inherits the
          // app-wide --border token (used everywhere from cards to the
          // footer) — a dedicated, softer edge here instead, so the
          // sidebar reads quieter than the arena content beside it without
          // touching that shared token.
          "hidden shrink-0 overflow-hidden border-e border-white/[0.06] bg-sidebar transition-[width] motion-reduce:transition-none md:block",
          widthExpanded ? "md:w-[220px]" : "md:w-[60px]"
        )}
        style={{ transitionDuration: `${SIDEBAR_SHELL_DURATION_MS}ms`, transitionDelay: `${SIDEBAR_SHELL_START_DELAY_MS}ms`, transitionTimingFunction: "var(--ease-emphasized)" }}
      >
        {/* Positioning context for the two absolutely-positioned layers
            below — each is pinned to its OWN fixed width, never the
            shell's own current (possibly still-animating) width. */}
        <div className="relative h-full">
          <div
            className="absolute inset-y-0 start-0 overflow-y-auto overflow-x-hidden transition-opacity motion-reduce:transition-none"
            style={{
              width: SIDEBAR_COLLAPSED_WIDTH_PX,
              opacity: compactOpacity,
              pointerEvents: compactInteractive ? undefined : "none",
              transitionDuration: `${compactTiming.durationMs}ms`,
              transitionDelay: `${compactTiming.delayMs}ms`,
              transitionTimingFunction: "ease-out",
            }}
            inert={!compactInteractive || undefined}
            aria-hidden={!compactInteractive || undefined}
          >
            <CompactSidebarLayer
              product={product}
              setProduct={setProduct}
              items={items}
              selected={selected}
              onSelect={onSelect}
              platformScope={platformScope}
              tooltipsEnabled={compactInteractive}
            />
          </div>
          <div
            className="absolute inset-y-0 start-0 overflow-y-auto overflow-x-hidden transition-opacity motion-reduce:transition-none"
            style={{
              width: SIDEBAR_EXPANDED_WIDTH_PX,
              opacity: expandedOpacity,
              pointerEvents: expandedInteractive ? undefined : "none",
              transitionDuration: `${expandedTiming.durationMs}ms`,
              transitionDelay: `${expandedTiming.delayMs}ms`,
              transitionTimingFunction: "ease-out",
            }}
            inert={!expandedInteractive || undefined}
            aria-hidden={!expandedInteractive || undefined}
          >
            <ExpandedSidebarLayer
              product={product}
              setProduct={setProduct}
              items={items}
              selected={selected}
              onSelect={onSelect}
              platformScope={platformScope}
            />
          </div>
        </div>
      </nav>
    </>
  );
}
