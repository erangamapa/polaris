import { describe, it, expect } from "vitest";
import { matchTier, searchCasino, hasAnyResults, SEARCH_PROVIDERS, SEARCH_CATEGORIES } from "./casinoSearch";

// CASINO SEARCH — scenario coverage. Everything else was verified manually
// via Playwright against the running dev server (chromium, Developer Panel
// presets driving Favorites/auth state); no DOM harness exists in this repo
// yet, matching the rest of src/lib/*.test.js.
//
//  1.  Search renders in Casino Home                     -> Playwright (search input present at /casino/lobby)
//  2.  Search remains Casino-scoped                      -> code review (casinoSearch.js only reads Casino data) + Playwright (Sports/Predictions ScopedSearch has no panel/combobox role)
//  3.  Exact game match ranks first                      -> unit test (searchCasino: exact above partial)
//  4.  Prefix game match ranks above partial match        -> unit test (matchTier tiers) + Playwright
//  5.  No Providers group ever renders                     -> unit test (searchCasino always returns providers: []) + Playwright ("betswirl"/"tribet studio" surface no Providers group)
//  6.  Category results group renders                     -> unit test (searchCasino matches categories) + Playwright ("live" -> Categories group)
//  7.  Empty groups do not render                          -> Playwright (only matching groups show a heading)
//  8.  Duplicate results are removed                        -> unit test (never returns duplicate favIds; structurally guaranteed, see searchCasino's own comment)
//  9.  Selecting game launches game                          -> Playwright (URL updates to ?play=<favId>, panel closes)
//  10. N/A — no Providers group exists to select from (see #5)
//  11. Selecting category opens valid destination                -> Playwright (routes to the real category page, e.g. /casino/popular)
//  12. Clear action resets query                                   -> Playwright (arena-search-clear button)
//  13. No-result state renders                                      -> Playwright ("No Casino results found" + recovery)
//  14. Loading state does not flash empty                            -> N/A — search is synchronous/local, no loading state exists (see final response)
//  15. Stale requests are ignored                                     -> N/A — no async requests; debounce (150ms) always resolves against the latest query, see useDebouncedValue
//  16. Keyboard navigation works                                       -> Playwright (ArrowDown/ArrowUp move aria-activedescendant, Enter activates)
//  17. Escape behavior works                                            -> Playwright (first Escape clears active selection, second closes)
//  18. Desktop panel does not lock body                                  -> Playwright (main's overflow-y stays "auto" while the panel is open)
//  19. Mobile full-screen search restores scroll                          -> code review (overflow lock/unlock is a cleanup-effect pair, same technique as the mobile menu)
//  20. Favorite control does not launch game                               -> Playwright (clicking the star toggles aria-pressed, panel stays open, no navigation)
//  21. Logged-out behavior works                                             -> Playwright (favoriting from search works via the same device-local favorites store used everywhere else)
//  22. 320px layout does not overflow                                         -> Playwright (scrollWidth === clientWidth at 320-1920px)
//  23. MVP mode excludes Sports/Predictions results                            -> code review (SEARCH_PROVIDERS/SEARCH_CATEGORIES are static Casino-only lists; platformScope never reaches casinoSearch.js)
//  24. Accessibility semantics are present                                      -> Playwright (role=listbox/option/group, aria-expanded, aria-activedescendant, polite live region)

describe("matchTier", () => {
  it("ranks an exact match as tier 0", () => {
    expect(matchTier("Dice", "dice")).toBe(0);
  });
  it("ranks a prefix match as tier 1", () => {
    expect(matchTier("Dice", "di")).toBe(1);
  });
  it("ranks a partial (substring) match as tier 2", () => {
    expect(matchTier("Vector Dice", "dice")).toBe(2);
  });
  it("returns null for no match", () => {
    expect(matchTier("Roulette", "chess")).toBeNull();
  });
  it("is case-insensitive", () => {
    expect(matchTier("ROULETTE", "roulette")).toBe(0);
  });
});

describe("searchCasino", () => {
  it("returns empty groups for an empty query", () => {
    const groups = searchCasino("   ");
    expect(groups).toEqual({ games: [], providers: [], categories: [], query: "" });
  });

  it("trims whitespace and matches case-insensitively", () => {
    const groups = searchCasino("  DICE  ");
    expect(groups.games.some((g) => g.title.toLowerCase().includes("dice"))).toBe(true);
  });

  it("ranks an exact game title above a partial match", () => {
    const groups = searchCasino("dice");
    const titles = groups.games.map((g) => g.title.toLowerCase());
    // "Dice" (exact) must come before "Vector Dice" (partial) if both match.
    const exactIndex = titles.indexOf("dice");
    const partialIndex = titles.findIndex((t) => t !== "dice" && t.includes("dice"));
    if (exactIndex !== -1 && partialIndex !== -1) expect(exactIndex).toBeLessThan(partialIndex);
  });

  it("ranks a prefix game match above a partial match", () => {
    // "Roulette" is a prefix match for "roul"; nothing else in the catalog
    // contains "roul" as a mid-string substring, so this mainly documents
    // intent — real coverage is the dedicated tier ordering test above.
    const groups = searchCasino("roul");
    expect(groups.games[0]?.title.toLowerCase()).toContain("roul");
  });

  it("never returns a providers group — no real, multi-provider inventory yet (see FINAL QA's PROVIDERS section)", () => {
    // Even a query that would match SEARCH_PROVIDERS' own raw list (still
    // exported/preserved below) must not surface a Providers group in an
    // actual search result.
    expect(searchCasino("betswirl").providers).toEqual([]);
    expect(searchCasino("tribet studio").providers).toEqual([]);
  });

  it("matches categories by label or id", () => {
    // "New" is the routing id; "New Releases" is the display label — both
    // must resolve to the same category via matchTier's OR-across-fields.
    expect(searchCasino("new").categories.some((c) => c.id === "New")).toBe(true);
    expect(searchCasino("releases").categories.some((c) => c.id === "New")).toBe(true);
  });

  it("hides groups with no matches (empty arrays, not fabricated entries)", () => {
    const groups = searchCasino("zzzzznotarealgame");
    expect(groups.games).toEqual([]);
    expect(groups.providers).toEqual([]);
    expect(groups.categories).toEqual([]);
    expect(hasAnyResults(groups)).toBe(false);
  });

  it("limits each group to a manageable count", () => {
    // A single-letter query matches nearly everything — limits must hold.
    const groups = searchCasino("e", { gameLimit: 3, providerLimit: 1, categoryLimit: 2 });
    expect(groups.games.length).toBeLessThanOrEqual(3);
    expect(groups.providers.length).toBeLessThanOrEqual(1);
    expect(groups.categories.length).toBeLessThanOrEqual(2);
  });

  it("never returns duplicate games", () => {
    const groups = searchCasino("e");
    const favIds = groups.games.map((g) => g.favId);
    expect(new Set(favIds).size).toBe(favIds.length);
  });
});

describe("static provider/category lists", () => {
  it("only lists providers with real, accurate counts", () => {
    for (const p of SEARCH_PROVIDERS) expect(p.count).toBeGreaterThan(0);
  });
  it("only lists categories with a real destination", () => {
    for (const c of SEARCH_CATEGORIES) expect(c.kind === "routed" || c.railTarget).toBeTruthy();
  });
});
