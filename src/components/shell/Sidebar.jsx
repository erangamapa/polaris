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
// Each product keeps its OWN colour even when another product is active.
// THEME READINESS: previously three copies of the same rgba(<channel>,<own
// opacity>) shape, each hardcoding the exact channel values of
// --casino-accent/--predictions-accent/--sports-accent (index.css) a
// second time. `color-mix()` reads the branch token directly at the SAME
// opacity ratios these already used (12%/16%/42% — deliberately its own,
// slightly different opacities than the shared --*-soft/-subtle tokens,
// so left as distinct mixes rather than forced onto a token whose exact
// value would visibly change this contrast) — the eventual Casino-
// ultraviolet/Predictions-racing-green/Sports-cobalt swap now only means
// editing --casino-accent/etc. in index.css, not touching this file.
// (Already an established pattern in this codebase — see index.css's
// --scrollbar-thumb, built the same way.)
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

// SIDEBAR TRANSITION FIX — one shared timing system, consumed by the
// state machine (lib/sidebarTransition.js) and this file's CSS. WIDTH and
// CONTENT never animate at the same time (see that file's own diagram) —
// there is no "delay" number trying to approximate that anymore; the
// phase machine enforces it structurally. Durations themselves are
// unchanged from the prior motion pass (this fix is architectural, not a
// retune — see this task's own "do not solve this by merely increasing
// duration or changing easing").
const RAIL_WIDTH_MS = 280;
const CONTENT_REVEAL_MS = 140; // labels fading IN, once width has already finished opening
const CONTENT_HIDE_MS = 100; // labels fading OUT, before width starts closing
// Safety-net fallback in case the real `transitionend` never fires for the
// nav's width (a backgrounded tab throttling timers, or any other browser
// quirk) — without this, OPENING/CLOSING could get stuck forever with no
// other recovery path. Slack is generous on purpose; this should basically
// never actually fire in normal use.
const WIDTH_FALLBACK_SLACK_MS = 150;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The actual phase-machine wiring for one <nav> rail. Pure phase logic
// lives in lib/sidebarTransition.js (unit-tested there); this hook is just
// the React glue — one `useEffect` per real event source (a fresh desired
// target, the width's real `transitionend`, and content's centralized
// duration timer), each owning and cleaning up its own timer/listener.
// Rapid toggling and mid-transition reversal need NO special-casing here:
// every `useEffect` below reacts to `phase`/`desiredExpanded` changing by
// tearing down its previous timer (React's normal cleanup-on-dependency-
// change) before the new one runs, so a stale timer can never fire into a
// phase this hook has already left.
function useRailTransition(desiredExpanded) {
  const [phase, setPhase] = useState(() => initialRailPhase(desiredExpanded));

  // A fresh target arrived (toggle click, cross-tab storage sync, browser
  // back/forward, whatever). Reduced-motion users skip the whole
  // multi-phase sequence entirely — straight to the steady end state, no
  // intermediate opening/revealing/hiding/closing ever rendered.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setPhase(desiredExpanded ? RAIL_PHASE.EXPANDED : RAIL_PHASE.COLLAPSED);
      return;
    }
    setPhase((p) => onDesiredChange(p, desiredExpanded));
  }, [desiredExpanded]);

  // Content-duration timer (REVEALING/HIDING only) — see
  // sidebarTransition.js's own comment on why a centralized timer, not a
  // per-element `transitionend`, is the right tool for content (it spans
  // many separate label elements sharing one duration, not one element).
  useEffect(() => {
    if (!isContentInMotion(phase)) return undefined;
    const duration = phase === RAIL_PHASE.REVEALING ? CONTENT_REVEAL_MS : CONTENT_HIDE_MS;
    const t = setTimeout(() => setPhase((p) => onContentTransitionEnd(p, desiredExpanded)), duration);
    return () => clearTimeout(t);
  }, [phase, desiredExpanded]);

  // Width fallback timer (OPENING/CLOSING only) — see WIDTH_FALLBACK_SLACK_MS.
  useEffect(() => {
    if (phase !== RAIL_PHASE.OPENING && phase !== RAIL_PHASE.CLOSING) return undefined;
    const t = setTimeout(() => setPhase((p) => onWidthTransitionEnd(p, desiredExpanded)), RAIL_WIDTH_MS + WIDTH_FALLBACK_SLACK_MS);
    return () => clearTimeout(t);
  }, [phase, desiredExpanded]);

  // The real, primary width-transitionend handler — attached to the <nav>
  // itself by the caller. Firing this after the fallback above already
  // fired is harmless: onWidthTransitionEnd is a pure, idempotent check
  // against the CURRENT phase, so a redundant call once we've already
  // moved on is a no-op.
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
// mode. Shared by every rail item (arena tab, section item, collapsed icon).
function SideIndicator({ color }) {
  return <span aria-hidden="true" className="absolute inset-y-1 start-0 w-[3px] rounded-full" style={{ background: color }} />;
}

// One persistent row for both collapsed and expanded content states —
// exactly ONE button per item, always mounted: the icon sits in a
// fixed-width slot that never moves horizontally, and only the label's
// opacity/transform animate, gated entirely by `contentVisible` (a
// phase-derived value from the parent's useRailTransition — see there for
// why this is NOT the same thing as "is expanded currently requested").
// This is what makes "icon does not jump", "no duplicated focusable
// controls", and "focus identity stable" true by construction.
//
// Tooltip is likewise always mounted (never conditionally wrapped/
// unwrapped — that would risk recreating the trigger's DOM node), but its
// open state is fully controlled: `tooltipsEnabled` (true ONLY in the
// fully-settled RAIL_PHASE.COLLAPSED phase — see sidebarTransition.js)
// gates whether hover/focus can ever actually show it, so it can't appear
// mid-collapse, mid-expand, or while expanded, and a stale hover-intent
// from just before collapsing can't cause a delayed pop-open once
// `tooltipsEnabled` flips true (see the reset effect below).
function RailItemRow({ navId, icon, label, active, accentColor, onClick, badge, ariaCurrent, testId, disabled, disabledLabel, contentVisible, contentDurationMs, tooltipsEnabled }) {
  const [tipOpen, setTipOpen] = useState(false);
  useEffect(() => { if (!tooltipsEnabled) setTipOpen(false); }, [tooltipsEnabled]);

  const button = (
    <button
      id={navId}
      onClick={disabled ? undefined : onClick}
      aria-current={ariaCurrent}
      aria-disabled={disabled || undefined}
      aria-label={!contentVisible ? (disabled ? `${label}, ${disabledLabel}` : label) : undefined}
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
      {/* Label — the ONLY thing that actually animates here, and ONLY once
          `contentVisible` says it's safe to (i.e. the rail has already
          finished widening, for reveal; or is about to start narrowing,
          for hide — see sidebarTransition.js). No text wrapping is
          possible: overflow-hidden on the button + truncate/whitespace-
          nowrap here. aria-hidden while not visible so this text never
          contributes a second, duplicate accessible name alongside the
          tooltip/aria-label above. */}
      <span
        aria-hidden={!contentVisible || undefined}
        className={cn(
          "min-w-0 flex-1 truncate whitespace-nowrap text-start text-sm motion-reduce:transition-none motion-reduce:duration-0",
          contentVisible ? "opacity-100" : "pointer-events-none max-w-0 -translate-x-1 opacity-0"
        )}
        style={{
          transitionProperty: "opacity, transform",
          transitionDuration: `${contentDurationMs}ms`,
          transitionTimingFunction: "var(--ease-emphasized)",
          transitionDelay: "0ms",
        }}
      >
        {label}
      </span>
      {badge && (
        <span
          className={cn(
            "shrink-0 transition-[opacity,transform] motion-reduce:transition-none",
            contentVisible ? "static ms-auto opacity-100" : "absolute -end-1 -top-1 opacity-100"
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

// The items list (Favorites/Recently Played/section labels/dividers) —
// one shared render for both content states. Section labels have no
// collapsed equivalent (there is nowhere to put the text, and they're not
// focusable/interactive) so they still unmount when content isn't
// visible; that's the one place this list still relies on React's normal
// mount/unmount rather than an animated element, which is fine — nothing
// about a plain heading's disappearance can "jump" an icon or drop focus.
function RailItems({ items, product, selected, onSelect, contentVisible, contentDurationMs, tooltipsEnabled }) {
  return (
    <div className="flex flex-col gap-1 px-2">
      {items.map((it) => {
        if (it.sectionLabel) {
          return contentVisible ? (
            <div key={it.id} className="text-label px-2.5 pb-1 pt-2">
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
                contentVisible ? "w-full" : "w-5"
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
            testId={it.id === "Favorites" ? (contentVisible ? "sidebar-favorites-count" : "sidebar-favorites-collapsed") : undefined}
            contentVisible={contentVisible}
            contentDurationMs={contentDurationMs}
            tooltipsEnabled={tooltipsEnabled}
            badge={
              it.count > 0 ? (
                <StatusBadge
                  variant="neutral"
                  size={contentVisible ? "medium" : "small"}
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
// SHAPE between the two content states — a row of three wide tiles (icon
// over label) versus a column of three icon-only squares — not just "same
// layout, hide text". Forcing that into one shared element tree would mean
// redesigning one of the two shapes (out of scope: "do not redesign the
// sidebar"), so this keeps both renderers, but the swap is now driven
// entirely by the SAME phase-derived `contentVisible`/`showExpandedShape`
// the rest of the rail uses — no independent timer of its own anymore.
// `showExpandedShape` stays true through HIDING (the tile row keeps
// rendering while it fades OUT) and only flips once CLOSING begins — the
// DOM swap always happens at the exact instant the outgoing shape has
// already reached opacity 0, so the swap itself is invisible by
// construction, the same trick RailItemRow's label uses.
function ProductTabs({ product, setProduct, platformScope, showExpandedShape, contentVisible, contentDurationMs }) {
  // The row shape mounts fresh at the exact render where `showExpandedShape`
  // first becomes true — a brand-new element has no "previous frame" to
  // transition FROM, so setting its opacity straight to 1 on that first
  // paint would just snap into view with no fade at all. `entered` starts
  // false on that mounting render (forcing the first paint to opacity 0),
  // then flips true one frame later via requestAnimationFrame, giving the
  // browser two real, distinct paints to interpolate between — the
  // standard technique for animating a freshly-inserted element. Lazily
  // initialized to `showExpandedShape` itself (not a hardcoded `false`) so
  // a COLD LOAD that starts already expanded renders fully visible on the
  // very first frame with no unwanted fade-in flash (see FIRST RENDER
  // requirements — first paint must never animate from the wrong default).
  const [entered, setEntered] = useState(() => showExpandedShape);
  useEffect(() => {
    if (!showExpandedShape) { setEntered(false); return undefined; }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [showExpandedShape]);

  // `contentVisible` only ever describes the ROW shape's target opacity —
  // the icon column (rendered whenever `!showExpandedShape`) is always
  // fully visible and steady; it has nothing to do with the expanded
  // content's own fade at all, so it must not be gated by `contentVisible`
  // (which is false through COLLAPSED/OPENING/CLOSING — exactly when the
  // icon column is the one actually on screen).
  const opacity = !showExpandedShape ? 1 : entered && contentVisible ? 1 : 0;

  return (
    <div
      className="transition-opacity motion-reduce:transition-none"
      style={{ opacity, transitionDuration: `${contentDurationMs}ms`, transitionTimingFunction: "var(--ease-emphasized)" }}
    >
      {showExpandedShape ? (
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
// straightforward hover/focus one: the product row's own opacity gate
// already keeps it non-interactive mid-swap, so it doesn't need the
// settle-gated controlled-open treatment RailItemRow uses.
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
// SIDEBAR TRANSITION FIX: `railMode` is only ever the DESIRED target now —
// the actual rendered width/content/tooltip state all come from
// `useRailTransition`'s phase machine (see above), which is what
// structurally guarantees width and content motion never overlap. See
// lib/sidebarTransition.js for the full phase diagram and reasoning.
export function Sidebar({ railMode, product, setProduct, items, selected, onSelect }) {
  const desiredExpanded = railMode === "expanded";
  const { phase, onWidthEnd, widthExpanded, contentVisible, tooltipsEnabled } = useRailTransition(desiredExpanded);
  const contentDurationMs = phase === RAIL_PHASE.REVEALING ? CONTENT_REVEAL_MS : CONTENT_HIDE_MS;
  // The tile-row shape (ProductTabs) keeps rendering through HIDING (mid
  // fade-out) and only swaps to the icon column once CLOSING begins — see
  // ProductTabs' own comment.
  const showProductTabsExpandedShape = phase === RAIL_PHASE.REVEALING || phase === RAIL_PHASE.EXPANDED || phase === RAIL_PHASE.HIDING;

  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this app.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";

  // Focus retention across the product-tabs shape swap — that's the one
  // remaining place this rail still swaps real DOM elements (see
  // ProductTabs' own comment on why merging the two shapes would be a
  // redesign). Re-keyed on the actual swap boundary (`showProductTabsExpandedShape`
  // flipping), not the raw `railMode` prop, so a focused product tab is
  // reliably refocused in its new form the instant the new shape mounts —
  // not one phase early (DOM not there yet) or one phase late (a visible
  // focus drop in between).
  const focusedIdRef = useRef(null);
  const onFocusCapture = (e) => {
    if (e.target.id?.startsWith("nav-")) focusedIdRef.current = e.target.id;
  };
  useEffect(() => {
    const id = focusedIdRef.current;
    if (!id) return;
    document.getElementById(id)?.focus();
  }, [showProductTabsExpandedShape]);

  // Announce meaningful nav-state changes only (not every phase-machine
  // step, and not duplicating the burger button's own aria-label, which
  // describes the *next* action rather than the state just entered) — keyed
  // on the raw requested target, matching what the user actually asked for,
  // not the internal phase sequence.
  const [announcement, setAnnouncement] = useState("");
  const prevDesiredExpanded = useRef(desiredExpanded);
  useEffect(() => {
    if (prevDesiredExpanded.current !== desiredExpanded) setAnnouncement(desiredExpanded ? "Navigation expanded" : "Navigation collapsed");
    prevDesiredExpanded.current = desiredExpanded;
  }, [desiredExpanded]);

  const navRef = useRef(null);

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
          <div className="p-3">
            <ProductTabs
              product={product}
              setProduct={setProduct}
              platformScope={platformScope}
              showExpandedShape={showProductTabsExpandedShape}
              contentVisible={contentVisible}
              contentDurationMs={contentDurationMs}
            />
            {/* Arena/section boundary — same distinct, more opaque rule in
                both content states (width itself is the only thing that
                changes). */}
            <div
              className={cn("my-2 border-t-2 border-white/15 transition-[width] motion-reduce:transition-none", contentVisible ? "w-full" : "mx-auto w-8")}
              style={{ transitionDuration: "var(--motion-layout)", transitionTimingFunction: "var(--ease-emphasized)" }}
            />
          </div>
          <RailItems
            items={items}
            product={product}
            selected={selected}
            onSelect={onSelect}
            contentVisible={contentVisible}
            contentDurationMs={contentDurationMs}
            tooltipsEnabled={tooltipsEnabled}
          />
        </div>
      </nav>
    </>
  );
}
