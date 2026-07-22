import { describe, it, expect, vi } from "vitest";
import {
  gameProviderName,
  ALL_GAMES,
  railCardsPerPage,
  CASINO_CATEGORIES,
  ROUTED_CATEGORIES,
  activateCasinoCategory,
} from "./CasinoCatalog";

// CASINO GAME-CARD SYSTEM AUDIT AND CLEANUP — scenario coverage. The only
// genuinely pure logic this task introduces is gameProviderName (relocated
// here from lib/casinoSearch.js, which already imports FROM this file — see
// that module's own comment on why the dependency only runs one direction).
// Everything else (CasinoGameCard, FavStar, useBrokenImage,
// CasinoGameCardSkeleton) is presentational/DOM behavior, verified manually
// via Playwright against the running dev server, matching this project's
// established testing stack (no jsdom/React Testing Library):
//
//  1.  One shared card component is used across core Casino rails  -> code review (Rail/CategoryPage/FavoritesPage all render CasinoGameCard; OnchainTile/ProviderTile/Tile deleted, not just deprecated)
//  2.  Standard dimensions are consistent                            -> Playwright (every card 136x181px in rails; grid cards fill their column at the same aspect-[3/4])
//  3.  Artwork does not distort                                        -> code review (object-cover, never object-fill/stretch)
//  4.  Missing image fallback renders                                    -> Playwright (aborted image request -> Gamepad2 icon, card size unchanged, title/provider/favorite all still present)
//  5.  Title clamps safely                                                -> code review (line-clamp-2 on the title)
//  6.  Provider clamps safely                                              -> code review (truncate on the provider line)
//  7.  Favorite state is shared                                             -> Playwright (toggling in search reflects on the same game's rail card and vice versa — see casinoFavorites.test.js for the underlying store)
//  8.  Favorite click does not launch game                                   -> Playwright (star click never opens the game modal)
//  9.  Main card launches game once                                           -> Playwright (single casino_game_opened event per click, structured payload inspected via CDP)
//  10. Keyboard launch works                                                    -> Playwright (Tab to a card, Enter opens the game)
//  11. Coming soon card does not launch                                          -> Playwright (aria-disabled card, click is a no-op)
//  12. Coming soon state is announced                                             -> Playwright (aria-label reads "<title> — Coming soon", not color-only)
//  13. Maintenance state does not launch                                           -> N/A — not currently backed by real data (see FINAL RESPONSE: only "coming-soon" exists in the catalog today; devMock's provider-error/maintenance/region-restricted are launch-time toast simulations, unrelated to the card's own visual state)
//  14. Loading skeleton matches dimensions                                          -> code review (CasinoGameCardSkeleton uses the identical aspect-[3/4] token; not wired to any live trigger since no async data source exists)
//  15. Favorites rail uses shared card                                               -> Playwright (favorites-rail renders CasinoGameCard instances, same data-test-id scheme as every other rail)
//  16. Recently Played populated state uses shared card                              -> Playwright (recently-played-rail renders CasinoGameCard once populated)
//  17. Search reuses shared logic                                                     -> code review (GameThumb/GameRow import gameProviderName, useBrokenImage, and FavStar from this file rather than reimplementing them)
//  18. Mobile width does not overflow                                                  -> Playwright (320-1920px, scrollWidth === clientWidth)
//  19. Focus ring is visible inside rail                                                -> code review (focus-visible:ring-2 on the card's own <a>, unclipped — rails scroll the body, not the ring)
//  20. Reduced motion is respected                                                      -> Playwright (motion-reduce:animate-none on the skeleton; computed animation-name is "none" under reduced-motion emulation)

describe("gameProviderName", () => {
  it("labels every onchain game BetSwirl", () => {
    for (const game of ALL_GAMES.filter((g) => g.kind === "onchain")) {
      expect(gameProviderName(game)).toBe("BetSwirl");
    }
  });

  it("labels every provider game with its real badge (TriBet Studio today)", () => {
    for (const game of ALL_GAMES.filter((g) => g.kind === "provider")) {
      expect(gameProviderName(game)).toBe(game.badge ?? "TriBet Studio");
    }
  });

  it("never returns a blank or undefined label for any game in the catalog", () => {
    for (const game of ALL_GAMES) {
      expect(gameProviderName(game)).toBeTruthy();
    }
  });
});

// CASINO GAME RAILS AND SECTION NAVIGATION — scenario coverage. The only
// genuinely pure logic this task introduces is railCardsPerPage (the arrow
// step math — see useRailScroll's own comment on why this needed pulling
// out: the previous "scroll by 90% of viewport width" formula didn't land
// on card boundaries, which this replaces). Everything else (CasinoGameRail
// itself, headers, See-all gating, snap/scrollbar/focus behavior) is
// presentational/DOM behavior, verified manually via Playwright against the
// running dev server, driven through the Developer Panel's Favorites/
// Recently Played presets:
//
//  1.  Shared rail is used by core Casino sections            -> code review (CasinoGameRail is the only rail component; every Lobby section — Favorites, Recently Played, Originals, Popular, New Releases, Live Casino, Game Shows, Providers — renders it, none hand-roll their own)
//  2.  Section headers align consistently                       -> Playwright (every header: title left, min-w-0/truncate on the badge, controls right, items-center)
//  3.  See all only renders with valid destination                -> Playwright (Originals/Providers never show it — no destination beyond the rail itself; Popular/New Releases/Live Casino/Game Shows show it only when dedup actually removed something, i.e. the category page reveals more)
//  4.  Previous arrow is disabled at start                          -> Playwright (disabled on initial render)
//  5.  Next arrow is disabled at end                                 -> Playwright (disabled after scrolling to the true end, verified via scrollWidth-clientWidth)
//  6.  Arrow navigation scrolls predictably                           -> unit test (railCardsPerPage) + Playwright (each click lands at a fixed offset from the current position — the baseline + N*cardStep — never a fractional card)
//  7.  Manual scroll updates arrow state                               -> code review (useRailScroll's own scroll listener re-measures canScrollLeft/canScrollRight on every native scroll event, not just arrow clicks)
//  8.  Final card is fully reachable                                    -> Playwright (repeated Next clicks until disabled; last card's right edge sits within the scroll container's own right edge)
//  9.  Mobile has no visible arrows where intended                       -> Playwright (arrows hidden below the sm: breakpoint at every mobile width tested)
//  10. Mobile swipe container is correctly configured                     -> code review (snap-x snap-proximity — not mandatory — native overflow-x-auto, no JS drag library)
//  11. Native scrollbar is visually hidden                                 -> code review ([scrollbar-width:none] for Firefox + [&::-webkit-scrollbar]:hidden for Chrome/Safari)
//  12. Page does not overflow horizontally                                  -> Playwright (320-1920px, scrollWidth === clientWidth)
//  13. Focused card scrolls into view                                        -> code review (native browser behavior for a focused element inside a scrollable ancestor; no custom override)
//  14. Focus ring is not clipped                                              -> Playwright (p-1 padding on the scroll container gives the ring room on every edge, confirmed via card-vs-container bounding boxes — was previously 0px)
//  15. Favorites rail updates when item removed                               -> Playwright (Dev Panel Favorites populated -> unfavorite -> rail count decreases immediately)
//  16. Recently Played empty state has no controls                            -> Playwright (0 arrows, 0 See-all while the compact placeholder shows)
//  17. Loading rail uses shared skeletons                                      -> code review (isLoading branch renders CasinoGameCardSkeleton at RAIL_TILE width; not wired to any live trigger — no async data source exists to ever set it true)
//  18. Empty generic rail does not render                                       -> code review (CasinoGameRail returns null when games.length === 0 and no emptyState was supplied)
//  19. Too-few-items rail hides arrows                                           -> Playwright (Live Casino/Game Shows, 1 card each — canScrollLeft/Right both false, arrows disabled)
//  20. 320px layout works                                                        -> Playwright (no overflow, arrows hidden, header single-line, See-all/cards all reachable)

// CASINO CATEGORY NAVIGATION — scenario coverage. The genuinely pure logic
// this task introduces is CASINO_CATEGORIES (the one shared config every nav
// surface derives from) and activateCasinoCategory (routed vs. rail-scroll
// behavior). CategoryNav itself, plus the sidebar/mobile-menu simplification
// and search integration built on top of these, are presentational/DOM
// behavior, verified manually via Playwright against the running dev server:
//
//  1.  One shared config drives every nav surface       -> code review (Casino Home CategoryNav, Sidebar/mobile menu, CasinoSearch's category results all import CASINO_CATEGORIES/derive from it — no second hand-rolled list)
//  2.  Only real catalog/route content is shown          -> unit test (CASINO_CATEGORIES shape) + code review ("Slots" excluded — zero real games; "Table Games" never existed in the tag system)
//  3.  Each category has one clear route/filter behavior  -> unit test (activateCasinoCategory)
//  4.  No dead destinations                                -> code review (routed kinds map 1:1 to CATEGORY_META entries with real CategoryPage renders; rail kinds scroll to a real, always-rendered rail)
//  5.  Browser Back works                                   -> Playwright (Popular -> Live Casino -> Back restores Popular's active state)
//  6.  Direct URLs resolve to the right active category      -> Playwright (loading /casino/live-casino directly highlights Live Casino)
//  7.  Refresh preserves active state                          -> Playwright (route-derived active state, not client-only state)
//  8.  Route and selected-state cannot disagree                -> code review (active state is derived from the route param, never a separate parallel field)
//  9.  One click does not create duplicate history entries      -> code review (activateCasinoCategory calls onSelectCategory once; no nested/duplicate navigate calls)
//  10. One consistent active-state visual treatment, not color-only -> code review (aria-current="page" + border/background/text change together, not color alone)
//  11. Desktop composition order is Promotions -> Search -> CategoryNav -> rails -> code review (CasinoLobby JSX order unchanged by this task except inserting CategoryNav in that slot)
//  12. Mobile bar scrolls horizontally, no clipped ends            -> Playwright (390px, zero page overflow, first/last pill fully reachable)
//  13. Active item scrolls into view on mobile                      -> Playwright (scrollIntoView effect keyed on `selected`)
//  14. 44px minimum touch targets                                     -> Playwright (pill height >= 44px at 390px)
//  15. Sticky behavior: explicitly non-sticky                          -> code review (CategoryNav has no sticky/fixed positioning; global header already consumes that space)
//  16. Providers has one clear role (rail-scroll, no duplicate route)   -> unit test (activateCasinoCategory rail branch) + code review (no /casino/providers route exists)
//  17. Search category results use the exact same shared config          -> code review (casinoSearch.js's SEARCH_CATEGORIES = CASINO_CATEGORIES.filter, no search-only ids)
//  18. Sidebar/mobile menu no longer duplicates the full category list    -> Playwright (desktop sidebar + mobile menu Casino section show only Lobby/Favorites, not all 7)
//  19. Keyboard: every category reachable, Enter/Space activates            -> Playwright (Tab traversal + Enter on a pill navigates)
//  20. Accessibility: nav has an accessible label, aria-current on active   -> code review (aria-label="Casino categories"; aria-current="page" only on the selected pill)

describe("CASINO_CATEGORIES", () => {
  it("has exactly seven entries, matching the catalog's real taxonomy", () => {
    expect(CASINO_CATEGORIES).toHaveLength(7);
    expect(CASINO_CATEGORIES.map((c) => c.id)).toEqual([
      "Lobby",
      "Popular",
      "New",
      "Live Casino",
      "Game Shows",
      "Originals",
      "Providers",
    ]);
  });

  it("never includes Slots (zero real games in the catalog)", () => {
    expect(CASINO_CATEGORIES.some((c) => c.id === "Slots")).toBe(false);
  });

  it("gives every entry a non-empty label", () => {
    for (const c of CASINO_CATEGORIES) expect(c.label).toBeTruthy();
  });

  it("gives every rail-kind entry a railTarget, and no other kind one", () => {
    for (const c of CASINO_CATEGORIES) {
      if (c.kind === "rail") expect(c.railTarget).toBeTruthy();
      else expect(c.railTarget).toBeUndefined();
    }
  });

  it("keeps ROUTED_CATEGORIES as the exact subset with kind: routed", () => {
    expect(ROUTED_CATEGORIES).toEqual(
      CASINO_CATEGORIES.filter((c) => c.kind === "routed").map((c) => c.id)
    );
  });
});

describe("activateCasinoCategory", () => {
  it("selects the category directly for lobby/routed kinds", () => {
    const onSelectCategory = vi.fn();
    const popular = CASINO_CATEGORIES.find((c) => c.id === "Popular");
    activateCasinoCategory(popular, onSelectCategory);
    expect(onSelectCategory).toHaveBeenCalledWith("Popular");
    expect(onSelectCategory).toHaveBeenCalledTimes(1);
  });

  it("routes rail-kind categories back to Lobby instead of a dead route", () => {
    // scrollToRail defers its DOM query via requestAnimationFrame, which this
    // no-jsdom test environment doesn't provide — stub it like the browser
    // would (immediate callback) since only activateCasinoCategory's own
    // synchronous behavior (the onSelectCategory call) is under test here.
    vi.stubGlobal("requestAnimationFrame", (cb) => cb());
    vi.stubGlobal("document", { querySelector: () => null });
    const onSelectCategory = vi.fn();
    const providers = CASINO_CATEGORIES.find((c) => c.id === "Providers");
    activateCasinoCategory(providers, onSelectCategory);
    expect(onSelectCategory).toHaveBeenCalledWith("Lobby");
    expect(onSelectCategory).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("does not throw when onSelectCategory is omitted", () => {
    vi.stubGlobal("requestAnimationFrame", (cb) => cb());
    vi.stubGlobal("document", { querySelector: () => null });
    const originals = CASINO_CATEGORIES.find((c) => c.id === "Originals");
    expect(() => activateCasinoCategory(originals, undefined)).not.toThrow();
    vi.unstubAllGlobals();
  });
});

describe("railCardsPerPage", () => {
  it("returns how many whole cards fit in the visible width", () => {
    expect(railCardsPerPage(932, 136, 12)).toBe(6); // 148px/card, 6*148=888 <= 932 < 7*148=1036
  });

  it("never returns a fractional card count", () => {
    expect(Number.isInteger(railCardsPerPage(1000, 136, 12))).toBe(true);
  });

  it("always returns at least 1, even when a single card is wider than the viewport", () => {
    expect(railCardsPerPage(100, 300, 12)).toBe(1);
  });

  it("is exact when the viewport is an exact multiple of the card step", () => {
    expect(railCardsPerPage(148 * 3, 136, 12)).toBe(3);
  });

  it("does not divide by zero or go negative for a degenerate card width", () => {
    expect(railCardsPerPage(500, 0, 0)).toBe(1);
  });
});
