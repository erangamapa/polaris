import { useEffect, useRef, useState } from "react";
import { Dices, TrendingUp, Volleyball as SoccerBall } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useDevMockState } from "@/lib/devMock";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { isArenaAllowed } from "@/lib/platformScope";
import { ARENAS } from "@/lib/arenas";
import {
  RAIL_PHASE,
  initialRailPhase,
  onDesiredChange,
  onWidthTransitionEnd,
  onContentTransitionEnd,
  railPhaseVisuals,
  isContentInMotion,
} from "@/lib/sidebarTransition";

// Icons are desktop-rail-specific presentation, not "availability" data —
// see lib/arenas.js for why id/label live there instead of being retyped here.
const ARENA_ICONS = { casino: Dices, predictions: TrendingUp, sports: SoccerBall };
const PRODUCTS = ARENAS.map((a) => ({ ...a, icon: ARENA_ICONS[a.id] }));

// Subtle per-product accents (no left bar) — tint + tinted text only.
// THEME READINESS: color-mix() against --casino-accent/etc. (index.css)
// rather than hardcoded hex — see that pass's own notes.
const ACCENTS = {
  casino: {
    tab: {
      background: "color-mix(in srgb, var(--casino-accent) 12%, transparent)",
      color: "var(--casino-text-accent)",
      border: "1px solid color-mix(in srgb, var(--casino-accent) 42%, transparent)",
    },
    item: { background: "color-mix(in srgb, var(--casino-accent) 16%, transparent)", color: "var(--casino-text-accent)" },
    bar: "var(--casino-text-accent)",
  },
  predictions: {
    tab: {
      background: "color-mix(in srgb, var(--predictions-accent) 12%, transparent)",
      color: "var(--predictions-text-accent)",
      border: "1px solid color-mix(in srgb, var(--predictions-accent) 42%, transparent)",
    },
    item: { background: "color-mix(in srgb, var(--predictions-accent) 16%, transparent)", color: "var(--predictions-text-accent)" },
    bar: "var(--predictions-text-accent)",
  },
  sports: {
    tab: {
      background: "color-mix(in srgb, var(--sports-accent) 12%, transparent)",
      color: "var(--sports-text-accent)",
      border: "1px solid color-mix(in srgb, var(--sports-accent) 42%, transparent)",
    },
    item: { background: "color-mix(in srgb, var(--sports-accent) 16%, transparent)", color: "var(--sports-text-accent)" },
    bar: "var(--sports-text-accent)",
  },
};

// SIDEBAR HANDOFF FIX — same timing system as the prior transition-state-
// machine pass (lib/sidebarTransition.js), unchanged. What changed in THIS
// pass is what the rail actually RENDERS in response to that phase — see
// the big comment above `Sidebar` below for why a single shared-DOM row
// (the previous approach) could not satisfy "compact rows do not stretch"
// and "no menu item changes y-position" at the same time.
const RAIL_WIDTH_MS = 280;
const CONTENT_REVEAL_MS = 140;
const CONTENT_HIDE_MS = 100;
const WIDTH_FALLBACK_SLACK_MS = 150;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The phase-machine wiring for one <nav> rail — unchanged from the prior
// pass. Pure phase logic lives in lib/sidebarTransition.js (unit-tested
// there, 31 cases); this hook is just the React glue. See that file for
// the full phase diagram and the reasoning behind transitionend-for-width
// vs a centralized timer for content.
function useRailTransition(desiredExpanded) {
  const [phase, setPhase] = useState(() => initialRailPhase(desiredExpanded));

  useEffect(() => {
    if (prefersReducedMotion()) {
      setPhase(desiredExpanded ? RAIL_PHASE.EXPANDED : RAIL_PHASE.COLLAPSED);
      return;
    }
    setPhase((p) => onDesiredChange(p, desiredExpanded));
  }, [desiredExpanded]);

  useEffect(() => {
    if (!isContentInMotion(phase)) return undefined;
    const duration = phase === RAIL_PHASE.REVEALING ? CONTENT_REVEAL_MS : CONTENT_HIDE_MS;
    const t = setTimeout(() => setPhase((p) => onContentTransitionEnd(p, desiredExpanded)), duration);
    return () => clearTimeout(t);
  }, [phase, desiredExpanded]);

  useEffect(() => {
    if (phase !== RAIL_PHASE.OPENING && phase !== RAIL_PHASE.CLOSING) return undefined;
    const t = setTimeout(() => setPhase((p) => onWidthTransitionEnd(p, desiredExpanded)), RAIL_WIDTH_MS + WIDTH_FALLBACK_SLACK_MS);
    return () => clearTimeout(t);
  }, [phase, desiredExpanded]);

  const onWidthEnd = (e) => {
    if (e.propertyName !== "width") return;
    setPhase((p) => onWidthTransitionEnd(p, desiredExpanded));
  };

  return { phase, onWidthEnd, ...railPhaseVisuals(phase) };
}

function ItemIcon({ icon, className = "size-4" }) {
  if (!icon) return <span className={className} />;
  if (typeof icon === "string") return <span className={cn("grid place-items-center text-sm", className)}>{icon}</span>;
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
// COMPACT LAYER — icon-only. Every row is a fixed size-11 (44px) square;
// nothing here ever measures or reacts to the rail's current width, so
// nothing in this layer can "stretch" as the shell widens (the bug this
// pass fixes: the previous single-shared-row design used a `w-full`
// button whose own background/hit-area grew right along with the shell).
// Tooltip open state is fully controlled by `tooltipsEnabled` (true only
// once RAIL_PHASE.COLLAPSED is fully settled — see Sidebar below) so it
// can never appear mid-transition.
// ════════════════════════════════════════════════════════════════════════
function CompactButton({ id, icon, label, active, accentColor, onClick, disabled, disabledLabel, badge, ariaCurrent, testId, tooltipsEnabled }) {
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
          style={!disabled && active ? { background: ACCENTS[accentColor]?.item.background ?? "rgba(255,255,255,0.08)", color: ACCENTS[accentColor]?.item.color } : undefined}
        >
          {!disabled && active && <SideIndicator color={ACCENTS[accentColor]?.bar ?? "currentColor"} />}
          <ItemIcon icon={icon} className={cn("size-4", disabled && "opacity-50")} />
          {badge && <span className="absolute -end-1 -top-1">{badge}</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide()}>{disabled ? disabledLabel : label}</TooltipContent>
    </Tooltip>
  );
}

// The whole compact composition: arena-tab icon column, a short boundary
// rule, then the item icons — every id suffixed `-compact` (see Sidebar's
// own comment on why: this layer and the expanded layer below are BOTH
// permanently mounted at once, so the same logical nav destination needs
// two distinct DOM ids, one per layer — two elements sharing one id would
// be invalid HTML and break `getElementById`-based focus restoration).
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
            accentColor={p.id}
            ariaCurrent={product === p.id ? "page" : undefined}
            onClick={() => setProduct(p.id)}
            disabled={disabled}
            disabledLabel={DEV_PANEL_ENABLED ? "Coming soon" : undefined}
            tooltipsEnabled={tooltipsEnabled}
          />
        );
      })}
      {/* Arena/section boundary — short and centered, matching this
          layer's own compact width, not the full-width rule the expanded
          layer uses (that's ExpandedSidebarLayer's own separate element,
          not a shared/resized one — see the file-level comment on why
          each layer owns its complete composition independently). */}
      <div aria-hidden="true" className="my-1 h-px w-8 bg-white/25" />
      {items.map((it) => {
        // Section labels have no compact equivalent (nowhere to put text,
        // not focusable) — simply omitted, never a source of geometry
        // shift since this layer's OWN rows never had a heading-shaped gap
        // to begin with, unlike the previous single-shared-tree design
        // where a heading could pop into a list that ALSO held icon rows.
        if (it.sectionLabel) return null;
        if (it.divider) return <div key={it.id} aria-hidden="true" className="my-1 h-px w-5 bg-white/10" />;
        return (
          <CompactButton
            key={it.id}
            id={`nav-item-${it.id}-compact`}
            icon={it.icon}
            label={it.label}
            active={selected === it.id}
            accentColor={product}
            ariaCurrent={selected === it.id ? "page" : undefined}
            onClick={() => (it.action ? it.action() : onSelect(it.id))}
            testId={it.id === "Favorites" ? "sidebar-favorites-collapsed" : undefined}
            tooltipsEnabled={tooltipsEnabled}
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
// three-tile arena-tab row. A complete, independent composition: nothing
// here is shared with CompactSidebarLayer's DOM, so nothing this layer
// does (a heading appearing, a row being full-width) can ever push or
// resize anything in the compact layer — they only ever interact via a
// plain opacity crossfade at the Sidebar level (see below).
// ════════════════════════════════════════════════════════════════════════
function ExpandedItemRow({ id, icon, label, active, accentColor, onClick, badge, ariaCurrent, testId }) {
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
      style={active ? { background: ACCENTS[accentColor]?.item.background ?? "rgba(255,255,255,0.08)", color: ACCENTS[accentColor]?.item.color } : undefined}
    >
      {active && <SideIndicator color={ACCENTS[accentColor]?.bar ?? "currentColor"} />}
      <span className="grid size-6 shrink-0 place-items-center">
        <ItemIcon icon={icon} className="size-4" />
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
        <div className="my-2 w-full border-t-2 border-white/15" aria-hidden="true" />
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
              accentColor={product}
              ariaCurrent={selected === it.id ? "page" : undefined}
              onClick={() => (it.action ? it.action() : onSelect(it.id))}
              testId={it.id === "Favorites" ? "sidebar-favorites-count" : undefined}
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
// SIDEBAR HANDOFF FIX — root cause of the remaining jumpiness the prior
// pass left behind: that pass unified compact and expanded into ONE
// shared row per item (a persistent button whose LABEL faded in/out).
// That fixed the *timing* (width vs. label motion no longer overlapped)
// but not the *geometry*:
//   - the shared button was `w-full`, so as the shell widened, the
//     button's own background/hit-area visibly stretched into a long
//     empty bar before the label ever appeared — "compact rows do not
//     stretch" was violated by construction
//   - section headings only exist in expanded mode, so they still had to
//     conditionally MOUNT the instant content became visible — a plain
//     `{condition && <div>heading</div>}` with no transition of its own,
//     which both popped in abruptly AND, being a real flex sibling, pushed
//     every item below it down by its own height in the same frame —
//     "no section headings push existing icons downward" was violated
//
// The fix: two COMPLETE, independent, PERMANENTLY MOUNTED layers
// (CompactSidebarLayer / ExpandedSidebarLayer above), stacked in one CSS
// grid cell (both children placed at the same row/column, so the taller
// one — expanded, with its headings — sizes the shared track without
// either layer's content ever being able to move or resize the other),
// crossfaded via opacity alone. Neither layer's rows ever change width or
// position because of the OTHER layer's content — they simply aren't in
// each other's layout tree at all. `inert` (+ mirrored `aria-hidden`)
// keeps whichever layer isn't the current settled/target one out of the
// tab order and accessibility tree entirely, so there is never a moment
// with two "live" copies of the navigation — see the derived
// `compactInert`/`expandedInert` below, which force BOTH layers inert
// during the brief crossfade itself (REVEALING/HIDING), since no realistic
// interaction needs to land in that ~100-140ms window and doing so avoids
// ever exposing two simultaneously-interactive navigations.
export function Sidebar({ railMode, product, setProduct, items, selected, onSelect }) {
  const desiredExpanded = railMode === "expanded";
  const { phase, onWidthEnd, widthExpanded, contentVisible, tooltipsEnabled } = useRailTransition(desiredExpanded);
  const contentDurationMs = phase === RAIL_PHASE.REVEALING ? CONTENT_REVEAL_MS : CONTENT_HIDE_MS;
  const isCrossfading = phase === RAIL_PHASE.REVEALING || phase === RAIL_PHASE.HIDING;
  // Compact is the target/settled layer through COLLAPSED/OPENING/CLOSING
  // (opacity 1, interactive); expanded is the target/settled layer through
  // EXPANDED (opacity 1, interactive). Both are forced inert during the
  // crossfade itself — see the file comment above.
  const compactOpacity = contentVisible ? 0 : 1;
  const expandedOpacity = contentVisible ? 1 : 0;
  const compactInert = isCrossfading || contentVisible;
  const expandedInert = isCrossfading || !contentVisible;

  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this app.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";

  // Focus retention across the layer swap. Both layers use ids suffixed
  // `-compact`/`-expanded` for the SAME logical destination (two elements
  // can't share one id), so this tracks the LOGICAL key (id minus suffix)
  // continuously, and only actually refocuses once the rail has reached a
  // real steady endpoint (COLLAPSED or EXPANDED) — refocusing mid-
  // crossfade would target an element that's still `inert` at that exact
  // moment (both layers are inert throughout REVEALING/HIDING), and an
  // inert element cannot receive focus at all per the HTML spec.
  const focusedKeyRef = useRef(null);
  const onFocusCapture = (e) => {
    const id = e.target.id;
    const match = id && /^(nav-(?:item|arena)-.+)-(?:compact|expanded)$/.exec(id);
    if (match) focusedKeyRef.current = match[1];
  };
  useEffect(() => {
    if (phase !== RAIL_PHASE.EXPANDED && phase !== RAIL_PHASE.COLLAPSED) return;
    const key = focusedKeyRef.current;
    if (!key) return;
    const suffix = phase === RAIL_PHASE.EXPANDED ? "expanded" : "compact";
    document.getElementById(`${key}-${suffix}`)?.focus();
  }, [phase]);

  // Announce meaningful nav-state changes only — keyed on the raw
  // requested target (what the user actually asked for), not the internal
  // phase sequence.
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
        data-sidebar-phase={phase}
        aria-label="Casino sidebar"
        onFocusCapture={onFocusCapture}
        onTransitionEnd={onWidthEnd}
        className={cn(
          "hidden shrink-0 overflow-hidden border-e bg-sidebar transition-[width] duration-200 motion-reduce:transition-none md:block",
          widthExpanded ? "md:w-[220px]" : "md:w-[60px]"
        )}
        style={{ transitionDuration: `${RAIL_WIDTH_MS}ms`, transitionTimingFunction: "var(--ease-emphasized)" }}
      >
        <div className="h-full overflow-y-auto overflow-x-hidden">
          {/* The grid stack: both layers occupy the same single cell
              (col-start-1 row-start-1 on both), so the track's height is
              simply the taller of the two — neither layer's content can
              push, resize, or reflow the other, they only ever overlap
              visually, blended by opacity alone. */}
          <div className="grid min-w-0">
            <div
              className="col-start-1 row-start-1 min-w-0 transition-opacity motion-reduce:transition-none"
              style={{
                opacity: compactOpacity,
                pointerEvents: compactInert ? "none" : undefined,
                transitionDuration: `${contentDurationMs}ms`,
                transitionTimingFunction: "var(--ease-emphasized)",
              }}
              inert={compactInert || undefined}
              aria-hidden={compactInert || undefined}
            >
              <CompactSidebarLayer
                product={product}
                setProduct={setProduct}
                items={items}
                selected={selected}
                onSelect={onSelect}
                platformScope={platformScope}
                tooltipsEnabled={tooltipsEnabled}
              />
            </div>
            <div
              className="col-start-1 row-start-1 min-w-0 transition-opacity motion-reduce:transition-none"
              style={{
                opacity: expandedOpacity,
                pointerEvents: expandedInert ? "none" : undefined,
                transitionDuration: `${contentDurationMs}ms`,
                transitionTimingFunction: "var(--ease-emphasized)",
              }}
              inert={expandedInert || undefined}
              aria-hidden={expandedInert || undefined}
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
        </div>
      </nav>
    </>
  );
}
