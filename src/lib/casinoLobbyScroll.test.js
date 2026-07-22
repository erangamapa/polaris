import { describe, it, expect, vi } from "vitest";
import { scrollTargetFor, categoryIdForSection, LOBBY_SECTION_SCROLL_OFFSET, activateLobbyPill } from "./casinoLobbyScroll";
import { CASINO_CATEGORIES } from "./casinoCategories";

// PILL NAVIGATION CONSISTENCY — scenario coverage. The genuinely pure logic
// this task introduces is scrollTargetFor (the offset geometry) and
// categoryIdForSection (the section-registry lookup); activateLobbyPill's
// own DOM/history side effects are exercised here against plain
// getBoundingClientRect/scrollTo doubles rather than a real browser.
// Everything else (the IntersectionObserver-driven scroll-spy itself,
// smooth-scroll motion, sticky-header layout, mobile parity) is
// presentational/DOM behavior, verified manually via Playwright against the
// running dev server:
//
//  1.  Popular pill scrolls to Popular section          -> Playwright (casino-section-popular scrolled into view, offset applied)
//  2.  New Releases pill scrolls to New Releases          -> Playwright
//  3.  Live Casino pill scrolls to Live Casino             -> Playwright
//  4.  Slots pill scrolls to Slots                          -> N/A — Slots has no supported inventory (see lib/casinoCategories.js), so it has no sectionId and never renders as a pill; the underlying mechanism is unit-tested generically below (categoryIdForSection/scrollTargetFor), ready the moment Slots is re-enabled
//  5.  Game Shows pill scrolls to Game Shows                 -> Playwright
//  6.  Tribet Originals pill scrolls to Originals             -> Playwright
//  7.  Providers scrolls only when its section exists          -> Playwright (providers-rail/casino-section-providers always renders on Lobby; unit test below covers the "no sectionId" no-op path generically)
//  8.  Lobby pill scrolls to top                                 -> Playwright (scrollTo({top:0}))
//  9.  Pill clicks do not open standalone category pages           -> Playwright (casinoCategory/route stays "Lobby" after every pill click) + unit test (activateLobbyPill never calls onNavigateToLobby when already on Lobby)
//  10. Active pill updates after click                               -> unit test (setActiveSectionId called synchronously) + Playwright
//  11. Active pill updates during manual scrolling                     -> Playwright (IntersectionObserver-driven, no jsdom in this stack)
//  12. Sticky-header offset is applied                                  -> unit test (scrollTargetFor math) + Playwright (visual gap above heading)
//  13. Missing sections do not cause broken navigation                   -> unit test (activateLobbyPill no-ops when category.sectionId is absent)
//  14. Reduced-motion behavior works                                      -> Playwright (matchMedia mock, behavior:"auto")
//  15. Mobile behavior matches desktop                                     -> Playwright (same offset/scroll-spy mechanism, no separate mobile path)
//  16. Sidebar and See all navigation remain unchanged                      -> code review (activateCasinoCategory/seeAll untouched by this task; only CategoryNav's own click handler changed)

describe("scrollTargetFor", () => {
  const makeEl = (top, scrollTop = 0) => ({
    getBoundingClientRect: () => ({ top }),
    scrollTop,
  });

  it("lands the target's top edge exactly `offset`px below the container's top", () => {
    const container = makeEl(0, 500);
    const target = makeEl(600); // 600px below the container's own top edge, in viewport terms
    expect(scrollTargetFor(container, target, 24)).toBe(500 + 600 - 24);
  });

  it("uses LOBBY_SECTION_SCROLL_OFFSET (16-32px range) as the default offset", () => {
    expect(LOBBY_SECTION_SCROLL_OFFSET).toBeGreaterThanOrEqual(16);
    expect(LOBBY_SECTION_SCROLL_OFFSET).toBeLessThanOrEqual(32);
  });

  it("never returns a negative scrollTop (clamped to 0)", () => {
    const container = makeEl(100, 0);
    const target = makeEl(105); // already just below the container's top, offset would push it negative
    expect(scrollTargetFor(container, target, 24)).toBe(0);
  });

  it("accounts for the container's own current scroll position, not just element geometry", () => {
    const containerA = makeEl(0, 0);
    const containerB = makeEl(0, 1000);
    const target = makeEl(300);
    expect(scrollTargetFor(containerB, target)).toBe(scrollTargetFor(containerA, target) + 1000);
  });
});

describe("categoryIdForSection", () => {
  it("resolves every enabled Games-taxonomy sectionId back to its category id", () => {
    for (const c of CASINO_CATEGORIES) {
      if (!c.sectionId) continue;
      expect(categoryIdForSection(c.sectionId)).toBe(c.id);
    }
  });

  it("returns null for an unknown or missing section id", () => {
    expect(categoryIdForSection("not-a-real-section")).toBeNull();
    expect(categoryIdForSection(undefined)).toBeNull();
  });
});

describe("activateLobbyPill", () => {
  it("scrolls to the top and does not navigate when the Lobby pill is clicked while already on Lobby", () => {
    const onNavigateToLobby = vi.fn();
    const setActiveSectionId = vi.fn();
    const scrollTo = vi.fn();
    vi.stubGlobal("document", { querySelector: () => ({ scrollTo }) });
    const lobby = CASINO_CATEGORIES.find((c) => c.id === "Lobby");
    activateLobbyPill(lobby, { currentCategory: "Lobby", onNavigateToLobby, setActiveSectionId });
    expect(onNavigateToLobby).not.toHaveBeenCalled();
    expect(setActiveSectionId).toHaveBeenCalledWith(null);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
    vi.unstubAllGlobals();
  });

  it("navigates to Lobby first when a pill is clicked from a different Casino page (Favorites)", () => {
    const onNavigateToLobby = vi.fn();
    const setActiveSectionId = vi.fn();
    vi.stubGlobal("document", { querySelector: () => null, getElementById: () => null });
    vi.stubGlobal("requestAnimationFrame", (cb) => cb());
    const popular = CASINO_CATEGORIES.find((c) => c.id === "Popular");
    activateLobbyPill(popular, { currentCategory: "Favorites", onNavigateToLobby, setActiveSectionId });
    expect(onNavigateToLobby).toHaveBeenCalledTimes(1);
    expect(setActiveSectionId).toHaveBeenCalledWith("Popular");
    vi.unstubAllGlobals();
  });

  it("never navigates away when the pill is clicked while already on the Lobby (stays on Lobby, only scrolls)", () => {
    const onNavigateToLobby = vi.fn();
    const setActiveSectionId = vi.fn();
    const scrollTo = vi.fn();
    vi.stubGlobal("document", {
      querySelector: () => ({ scrollTo, getBoundingClientRect: () => ({ top: 0 }), scrollTop: 0 }),
      getElementById: () => ({ getBoundingClientRect: () => ({ top: 400 }) }),
    });
    const liveCasino = CASINO_CATEGORIES.find((c) => c.id === "Live Casino");
    activateLobbyPill(liveCasino, { currentCategory: "Lobby", onNavigateToLobby, setActiveSectionId });
    expect(onNavigateToLobby).not.toHaveBeenCalled();
    expect(scrollTo).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("safely no-ops (does not crash, does not navigate) for a category with no real Lobby section", () => {
    const onNavigateToLobby = vi.fn();
    const setActiveSectionId = vi.fn();
    vi.stubGlobal("document", { querySelector: () => null });
    const fakeDisabledCategory = { id: "Slots", kind: "routed" }; // no sectionId — mirrors Slots today
    expect(() => activateLobbyPill(fakeDisabledCategory, { currentCategory: "Lobby", onNavigateToLobby, setActiveSectionId })).not.toThrow();
    expect(onNavigateToLobby).not.toHaveBeenCalled();
    expect(setActiveSectionId).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
