import { useEffect, useState } from "react";
import { CASINO_CATEGORIES } from "./casinoCategories";

// PILL NAVIGATION CONSISTENCY — the one place that knows how to smoothly
// scroll the Casino Lobby to a pill's matching section (with a consistent
// header-clearance offset) and how to track which section is currently
// "active" as the user scrolls, so CategoryNav's pill bar has a single
// implementation instead of inventing scroll math per pill. Scoped
// specifically to Lobby-pill navigation — Search/Sidebar/provider-tile
// clicks keep using the existing scrollToRail/activateCasinoCategory (see
// lib/casinoCategories.js), which this task explicitly leaves untouched.

// Every category with a real Lobby row, in Lobby order — derived from the
// SAME CASINO_CATEGORIES array CategoryNav's pills and the Sidebar's Games
// section already render from, not a second hardcoded id map (see
// IMPLEMENTATION: "do not maintain separate hardcoded maps for each
// pill"). Computed once at module load since CASINO_CATEGORIES is a
// static, load-time-only array.
const PILL_SECTIONS = CASINO_CATEGORIES.filter((c) => c.sectionId).map((c) => ({
  sectionId: c.sectionId,
  categoryId: c.id,
  order: c.order,
}));

export function categoryIdForSection(sectionId) {
  return PILL_SECTIONS.find((s) => s.sectionId === sectionId)?.categoryId ?? null;
}

// A programmatic scroll (triggered by a pill click) fires many native
// `scroll` events while it's animating, at intermediate positions that
// don't reflect the destination yet — recomputing the active section from
// those mid-flight positions fought the click's own optimistic
// setActiveSectionId, visibly flickering through several wrong pills before
// settling (confirmed via Playwright: clicking Live Casino briefly
// re-activated Lobby, then Tribet Originals, before Live Casino "stuck").
// Module-level (not component state) since the click handler and the
// scroll-spy hook are two independent call sites that both need to agree on
// this window without threading a ref between them. Comfortably longer than
// a native smooth-scroll typically takes to settle, matching the ~450-600ms
// range this task recommends for the animation itself (see ANIMATION).
const SCROLL_SPY_SUPPRESS_MS = 800;
let suppressScrollSpyUntil = 0;

// Comfortable spacing above a section's heading once scrolled into place.
// The Lobby's scrollable region is <main> itself, and neither the global
// TopBar (a fixed-height flex sibling, never overlapping <main>'s content)
// nor CategoryNav (deliberately non-sticky, see CategoryNav's own comment)
// ever sit on top of the content while scrolled — so this is pure visual
// breathing room, not header-clearance math, and one flat constant is
// sufficient. If a sticky in-page element is ever introduced above the
// Lobby sections, add its measured height here rather than duplicating
// this constant at each call site (see SCROLL POSITION: "use one shared
// offset calculation").
export const LOBBY_SECTION_SCROLL_OFFSET = 24;

// Pure geometry — the exact scrollTop `container` should animate to so
// `target`'s top edge lands `offset`px below the container's own visible
// top, never a dead-center alignment that could hide the heading (see
// SCROLL POSITION: "do not vertically center the row in a way that hides
// its heading"). No DOM mutation, so this is unit-testable with plain
// { getBoundingClientRect, scrollTop } doubles instead of a real browser
// (see casinoLobbyScroll.test.js).
export function scrollTargetFor(container, target, offset = LOBBY_SECTION_SCROLL_OFFSET) {
  const containerTop = container.getBoundingClientRect().top;
  const targetTop = target.getBoundingClientRect().top;
  const delta = targetTop - containerTop - offset;
  return Math.max(0, container.scrollTop + delta);
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Smoothly (or, under reduced motion, immediately) scrolls `container` to
// `target`'s position. Native scrollTo — no custom rAF/easing engine — so a
// second call mid-animation simply retargets rather than stacking a
// competing animation (see ANIMATION: "prevent competing animations or
// repeated scroll calls" — repeated clicks are safe by construction, the
// browser just redirects the in-flight scroll).
export function scrollElementIntoLobbyView(container, target, offset = LOBBY_SECTION_SCROLL_OFFSET) {
  if (!container || !target) return;
  container.scrollTo({ top: scrollTargetFor(container, target, offset), behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function scrollLobbyToTop(container) {
  if (!container) return;
  container.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

// Best-effort deep link — updated via replaceState only (never pushState),
// so scroll-spy/pill clicks never grow browser history (see URL BEHAVIOR:
// "do not create a history entry for every scroll-spy update... pill
// clicks may use replaceState"). Reusing routing.js's own slug convention
// (lowercase category id, spaces to hyphens) so "/casino/lobby#new" lines
// up with the same id "New" already used for the standalone route.
function writeSectionHash(categoryId) {
  if (typeof window === "undefined") return;
  const hash = categoryId && categoryId !== "Lobby" ? `#${categoryId.toLowerCase().replace(/\s+/g, "-")}` : "";
  const path = window.location.pathname + window.location.search;
  window.history.replaceState(window.history.state, "", path + hash);
}

// The one click handler every Lobby pill uses — always keeps the user on
// the Lobby route, never opens a standalone category page (see TARGET
// BEHAVIOR: "remain on the Casino Lobby... do not open a standalone
// category page"). `onNavigateToLobby` is only invoked when the pill was
// clicked from somewhere other than the Lobby (e.g. the Favorites page),
// matching "remain on the Casino Lobby" without forcing an already-Lobby
// click to re-navigate.
export function activateLobbyPill(category, { currentCategory, onNavigateToLobby, setActiveSectionId }) {
  const container = typeof document !== "undefined" ? document.querySelector("main") : null;
  const wasOnLobby = currentCategory === "Lobby";
  suppressScrollSpyUntil = Date.now() + SCROLL_SPY_SUPPRESS_MS;

  if (category.id === "Lobby") {
    setActiveSectionId(null);
    writeSectionHash("Lobby");
    if (!wasOnLobby) onNavigateToLobby?.();
    scrollLobbyToTop(container);
    return;
  }

  // No real Lobby section to scroll to (e.g. a category disabled for lack
  // of inventory) — a safe no-op rather than silently opening a dead or
  // standalone page (see MISSING SECTIONS: "do not silently open a
  // standalone page"). Not reachable through today's taxonomy (every
  // enabled, pill-visible category has a real showAsLobbyRow section), but
  // guarded so a future disabled-yet-still-pill-visible category can never
  // regress into one.
  if (!category.sectionId) return;

  setActiveSectionId(category.id);
  writeSectionHash(category.id);
  if (!wasOnLobby) onNavigateToLobby?.();

  const scroll = () => {
    const target = document.getElementById(category.sectionId);
    if (target) scrollElementIntoLobbyView(container, target);
  };
  // Coming from a different Casino page, the Lobby dashboard (and this
  // section) hasn't mounted yet this tick — defer one frame so the DOM
  // query below finds a real element instead of silently missing it
  // (mirrors scrollToRail's own identical requestAnimationFrame deferral
  // in lib/casinoCategories.js).
  if (wasOnLobby) scroll();
  else requestAnimationFrame(scroll);
}

// On first mount of the Lobby, restore a valid `#section` hash left by a
// previous visit/share (see URL BEHAVIOR: "page refresh with a valid
// section hash may restore the section"). An unrecognized hash is simply
// ignored — the Lobby itself is already the safe default, nothing further
// needs to happen (see "invalid section hashes should safely remain at
// Lobby"). Instant, not animated — a page that just loaded shouldn't also
// visibly animate before the user has seen it settle.
export function restoreSectionFromHash(setActiveSectionId) {
  if (typeof window === "undefined") return;
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return;
  const category = CASINO_CATEGORIES.find((c) => c.sectionId && c.id.toLowerCase().replace(/\s+/g, "-") === raw);
  if (!category) return;
  const container = document.querySelector("main");
  const target = document.getElementById(category.sectionId);
  if (!container || !target) return;
  suppressScrollSpyUntil = Date.now() + SCROLL_SPY_SUPPRESS_MS;
  container.scrollTo({ top: scrollTargetFor(container, target), behavior: "auto" });
  setActiveSectionId(category.id);
}

// Tracks which pill-eligible section has most recently scrolled past the
// trigger line, so the pill bar's active state stays synchronized with
// manual scrolling (see ACTIVE STATE: "update the active pill according to
// the visible section... avoid flickering between adjacent sections").
// Returns both the value and its setter so activateLobbyPill can set it
// optimistically the instant a pill is clicked, before the scroll animation
// even starts
// (see ACTIVE STATE: "immediately set it as active").
// A fixed trigger line a little below the same offset the click-scroll
// itself aligns headings to. "Active" is simply "the last section (in
// Lobby order) whose heading has scrolled up past this line" — a direct
// geometric comparison, not an IntersectionObserver area-overlap heuristic.
// An earlier version used IntersectionObserver with a percentage-based
// rootMargin band; with ~250px-tall sections that band was wide enough for
// two adjacent sections to overlap it at once, and picking "whichever also
// intersects, furthest down" consistently activated the WRONG (next)
// section — confirmed via Playwright (clicking Live Casino settled on
// Game Shows as active). A direct top-edge comparison has no such ambiguity
// (see ACTIVE STATE: "avoid flickering between adjacent sections").
const ACTIVE_SECTION_TRIGGER_LINE = LOBBY_SECTION_SCROLL_OFFSET + 40;

export function useLobbyActiveSection(enabled) {
  const [activeSectionId, setActiveSectionId] = useState(null);

  useEffect(() => {
    if (!enabled) { setActiveSectionId(null); return undefined; }
    const container = document.querySelector("main");
    if (!container || PILL_SECTIONS.length === 0) return undefined;

    let frame = null;
    const compute = () => {
      frame = null;
      // A click-triggered scroll is still animating toward its target —
      // recomputing from this in-between position would fight the click's
      // own optimistic setActiveSectionId (see SCROLL_SPY_SUPPRESS_MS's own
      // comment). The suppressed value IS already the correct destination,
      // so skipping recomputation here loses nothing once it expires.
      if (Date.now() < suppressScrollSpyUntil) return;
      // Returning to the very top (above every registered section, e.g.
      // still inside Promotions/Search/personalized rows) always means
      // Lobby itself is active — nothing above the first section to
      // compare against there (see ACTIVE STATE: "Lobby becomes active
      // when the user returns to the top area").
      if (container.scrollTop < 32) { setActiveSectionId(null); return; }
      const containerTop = container.getBoundingClientRect().top;
      let current = null;
      for (const section of PILL_SECTIONS) {
        const el = document.getElementById(section.sectionId);
        if (!el) continue;
        const top = el.getBoundingClientRect().top - containerTop;
        if (top <= ACTIVE_SECTION_TRIGGER_LINE) current = section;
      }
      setActiveSectionId(current ? current.categoryId : null);
    };
    // rAF-throttled — cheap (a handful of getBoundingClientRect reads) but
    // no need to run more than once per frame during a smooth scroll.
    const onScroll = () => { if (frame === null) frame = requestAnimationFrame(compute); };

    compute();
    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return [activeSectionId, setActiveSectionId];
}
