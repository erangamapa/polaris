import { describe, it, expect } from "vitest";
import { takeUnclaimed } from "./casinoDedup";

// Casino Home Hierarchy and Composition — scenario coverage. Everything
// else was verified manually via Playwright against the running dev
// server (chromium, Developer Panel presets driving auth/wallet/
// favorites/recently-played state); no DOM harness exists in this repo yet.
//
//  1.  Favorites/Recently Played split, not a "Your games" umbrella  -> Playwright (Casino Lobby, populated presets, two separate rails)
//  2.  Favorites rail hides when empty                                -> Playwright (default preset, no "Favorites" section rendered)
//  3.  Recently Played rail shows a teaching empty state when empty   -> Playwright (default preset, "No recently played games yet")
//  4.  Recently Played hides its empty state while actively searching -> code review (Rail emptyState only passed when !q)
//  5.  Originals (on-chain) always shown, never search-dropped below zero -> Rail's own hide-if-empty applies uniformly (documented behavior change)
//  6.  Discovery rails dedup sequentially against Originals            -> unit test (takeUnclaimed) + Playwright (Popular no longer repeats Dice/Coin Toss/Roulette)
//  7.  Discovery rails dedup against each other in render order        -> unit test (takeUnclaimed claims across calls)
//  8.  Providers stays a complete, undeduped catch-all                 -> Playwright (Providers rail shows all 11 games despite tag overlap)
//  9.  Favorites/Recently Played allowed to overlap with discovery     -> code review (favorites/recentGames never pass through takeUnclaimed)
//  10. Category nav shows only categories with real data (no Slots)    -> Playwright (nav pills: Lobby, Popular, New Releases, Live Casino, Game Shows)
//  11. Category nav selected state exposed                             -> Playwright (aria-current="page" on active pill)
//  12. Category nav does not duplicate inside the page body            -> code review (single CategoryNav instance in CasinoLobby)
//  13. Rail "See all" navigates to the matching category page          -> Playwright (Popular rail See-all -> /casino/popular, h1 "Popular")
//  14. Rail arrows disabled at scroll boundaries                       -> Playwright (Providers rail: left disabled at start, right disabled after scrolling right)
//  15. Rail self-hides with no emptyState and no games                 -> code review (Rail returns null)
//  16. "New" category renamed to "New Releases" everywhere it's shown  -> Playwright (rail title, nav pill, sidebar, category page h1 all read "New Releases"); URL slug stays /casino/new
//  17. Search has a visible clear action                               -> Playwright (X button appears once query is non-empty, clears and refocuses input)
//  18. Category page empty state uses the shared EmptyState component  -> code review (CategoryPage renders <EmptyState>, not a hand-rolled block)
//  19. No horizontal page overflow at 320/390/768px                    -> Playwright (document.documentElement.scrollWidth === clientWidth)
//  20. Casino Lobby has exactly one <h1> (screen-reader only)          -> code review (sr-only h1 only for category === "Lobby"; Favorites/category pages render their own)


const g = (favId) => ({ favId, title: favId });

describe("takeUnclaimed", () => {
  it("returns every game unchanged when seen is empty", () => {
    const seen = new Set();
    const games = [g("a"), g("b")];
    expect(takeUnclaimed(games, seen)).toEqual(games);
  });

  it("excludes games already in seen", () => {
    const seen = new Set(["a"]);
    expect(takeUnclaimed([g("a"), g("b")], seen)).toEqual([g("b")]);
  });

  it("claims its own kept games into seen for the next call", () => {
    const seen = new Set();
    takeUnclaimed([g("a"), g("b")], seen);
    expect(takeUnclaimed([g("a"), g("b"), g("c")], seen)).toEqual([g("c")]);
  });

  it("does not mutate the input games array", () => {
    const seen = new Set(["a"]);
    const games = [g("a"), g("b")];
    takeUnclaimed(games, seen);
    expect(games).toEqual([g("a"), g("b")]);
  });

  it("returns an empty array once every game has been claimed", () => {
    const seen = new Set();
    takeUnclaimed([g("a")], seen);
    expect(takeUnclaimed([g("a")], seen)).toEqual([]);
  });
});
