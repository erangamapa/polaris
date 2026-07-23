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

// One rail item, icon-only, for the collapsed (60px) rail. Tooltip shows on
// hover AND keyboard focus (Radix default, and never on touch — Radix
// Tooltip is pointer/focus driven, not tap-triggered) so nothing is
// hover-only. Disabled items dim the icon to 50% opacity instead of a
// badge/pill — the tooltip is the only "Coming soon" signal, and it reads
// exactly that (not "label — Coming soon") since the icon-only trigger
// already establishes which item this is.
function RailIcon({ icon, label, active, accentColor, onClick, badge, ariaCurrent, testId, navId, disabled, disabledLabel }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          id={navId}
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
      <TooltipContent side={typeof document !== "undefined" && document.dir === "rtl" ? "left" : "right"}>{disabled ? disabledLabel : label}</TooltipContent>
    </Tooltip>
  );
}

// Collapsed rail renders every non-divider/non-label item in the same order
// the expanded rail does — `sectionLabel` pseudo-items are skipped entirely
// (collapsed mode has no room for text, see COLLAPSED DESKTOP SIDEBAR: "hide
// section labels") while `divider` pseudo-items still render a thin rule,
// so grouping survives as spacing even without the label text (see "preserve
// grouping with dividers or spacing"). One generic loop rather than a
// Favorites-specific carve-out — this now has to scale to a full Personal +
// Games structure, not just a single pinned utility item.
function CollapsedRail({ product, setProduct, items, selected, onSelect, platformScope }) {
  return (
    <div className="flex h-full flex-col items-center gap-1.5 overflow-y-auto py-3">
      {PRODUCTS.map((p) => {
        // Gated on `DEV_PANEL_ENABLED` (devPanelFlag.js) — currently `true`
        // in every build including production, same as every other
        // devMock-driven override in this app.
        const disabled = DEV_PANEL_ENABLED && !isArenaAllowed(p.id, platformScope);
        return (
          <RailIcon
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

      {/* Arena/section boundary — a full-width, more opaque rule so the two
          hierarchy levels (arena vs section) read as visually distinct. */}
      <div className="my-1 h-px w-8 bg-white/25" aria-hidden="true" />

      {items.map((it) => {
        if (it.sectionLabel) return null;
        if (it.divider) return <div key={it.id} className="my-1 h-px w-5 bg-white/10" aria-hidden="true" />;
        return (
          <RailIcon
            key={it.id}
            navId={`nav-item-${it.id}`}
            icon={it.icon}
            label={it.label}
            active={selected === it.id}
            accentColor={product}
            ariaCurrent={selected === it.id ? "page" : undefined}
            onClick={() => (it.action ? it.action() : onSelect(it.id))}
            testId={it.id === "Favorites" ? "sidebar-favorites-collapsed" : undefined}
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

function ExpandedRail({ product, setProduct, items, selected, onSelect, platformScope }) {
  const accent = ACCENTS[product];
  return (
    <div className="p-3">
      {/* product row */}
      <div className="mb-1 flex gap-1.5">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          const active = product === p.id;
          // See CollapsedRail's identical comment.
          const disabled = DEV_PANEL_ENABLED && !isArenaAllowed(p.id, platformScope);

          // Identical box for every state (active/inactive/disabled) — no
          // extra row, no background/border override for disabled — so
          // layout, spacing, and hit area never move relative to the
          // active Casino tile (see PRIMARY GOAL). Icon + label just dim to
          // 50% opacity; the ONLY other disabled-specific signal is the
          // tooltip below, not a pill/badge/lock/status text.
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
                // Fixed height + no-wrap so the active/bold state can never change the row height (no layout jump).
                "relative flex h-[54px] flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-transparent px-1 text-[11px] transition-[color,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                disabled ? "cursor-not-allowed" : active ? "font-medium" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4", disabled && "opacity-50")} aria-hidden="true" />
              <span className={disabled ? "opacity-50" : undefined}>{p.label}</span>
            </button>
          );

          // Tooltip only wraps disabled tiles — Casino (and Predictions/
          // Sports whenever Platform Scope is Full) stay exactly as before,
          // no tooltip added. Radix Tooltip is hover/focus-driven, never
          // tap-triggered, so this is silent on touch by construction (see
          // MOBILE: "do not show a tooltip on touch devices").
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

      {/* Arena/section boundary — same distinct, more opaque rule as the
          collapsed rail, so the hierarchy reads the same in both modes. */}
      <div className="my-2 border-t-2 border-white/15" />

      {/* contextual menu (no header — the product tab is the header) */}
      <div className="space-y-0.5">
        {items.map((it) =>
          it.divider ? (
            <div key={it.id} className="my-2 border-t border-white/10" />
          ) : it.sectionLabel ? (
            // Restrained, quiet group heading (Personal/Games) — same
            // typography the mobile menu's own section labels use (see
            // MobileFullScreenMenu.jsx), so the two surfaces read as one
            // consistent hierarchy rather than two different label styles.
            <div key={it.id} className="px-2.5 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {it.sectionLabel}
            </div>
          ) : (
            <button
              key={it.id}
              id={`nav-item-${it.id}`}
              onClick={() => (it.action ? it.action() : onSelect(it.id))}
              aria-current={selected === it.id ? "page" : undefined}
              style={selected === it.id ? accent.item : undefined}
              className={cn(
                "relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === it.id
                  ? "font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              {selected === it.id && <SideIndicator color={accent.bar} />}
              <ItemIcon icon={it.icon} />
              <span className="truncate">{it.label}</span>
              {it.count > 0 && (
                <StatusBadge
                  data-test-id={it.id === "Favorites" ? "sidebar-favorites-count" : undefined}
                  variant="neutral"
                  size="medium"
                  count={it.count}
                  ariaLabel={it.id === "Favorites" ? `${it.count} favorite${it.count === 1 ? "" : "s"}` : `${it.count} ${it.label}`}
                  className="ms-auto"
                />
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// Desktop/tablet only (≥768px) — never fully hidden; burger toggles between
// an expanded rail (~220px, full labels) and a collapsed icon rail (~60px),
// per `railMode`. Below 768px this renders nothing: mobile navigation is the
// bottom nav + MobileFullScreenMenu (a dedicated mobile-first component, not
// this desktop rail reused as an overlay). Width transitions (180-220ms)
// respect prefers-reduced-motion via motion-reduce:transition-none.
export function Sidebar({ railMode, product, setProduct, items, selected, onSelect }) {
  const expanded = railMode === "expanded";
  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this app.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";

  // Focus retention: collapsed <-> expanded swaps the entire rail's DOM
  // (different components), which would otherwise drop focus to <body>.
  // Track the last-focused nav item's id continuously and, once the mode
  // switch commits, refocus the same logical item in its new (icon-only or
  // labelled) form — both variants share ids via `nav-arena-*`/`nav-item-*`.
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

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>

      {/* desktop/tablet persistent rail — never fully hidden at md+, never rendered below it */}
      <aside
        onFocusCapture={onFocusCapture}
        className={cn(
          "hidden shrink-0 overflow-hidden border-e bg-sidebar transition-[width] duration-200 motion-reduce:transition-none md:block",
          expanded ? "md:w-[220px]" : "md:w-[60px]"
        )}
      >
        <div className={cn("h-full", expanded ? "overflow-y-auto" : "")}>
          {expanded ? (
            <ExpandedRail product={product} setProduct={setProduct} items={items} selected={selected} onSelect={onSelect} platformScope={platformScope} />
          ) : (
            <CollapsedRail product={product} setProduct={setProduct} items={items} selected={selected} onSelect={onSelect} platformScope={platformScope} />
          )}
        </div>
      </aside>
    </>
  );
}
