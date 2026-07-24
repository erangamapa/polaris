import { describe, it, expect, vi } from "vitest";
import { CASINO_CATEGORIES, CATEGORY_LABEL, ROUTED_CATEGORIES, CASINO_PROVIDERS, CASINO_PERSONAL_DESTINATIONS, activateCasinoCategory } from "./casinoCategories";

// CASINO TAXONOMY — scenario coverage. This module is pure data plus two
// small pure functions (scrollToRail's own DOM side effect is exercised
// indirectly through activateCasinoCategory's rail branch below, stubbing
// the DOM globals this no-jsdom test environment doesn't provide).
// Everything that consumes this taxonomy (CategoryNav, the Sidebar/mobile
// menu, Casino search, the Lobby's provider tiles) is presentational/DOM
// behavior, verified manually via Playwright against the running dev
// server — see CasinoCatalog.test.js's own scenario-coverage blocks for
// those:
//
//  1.  One shared config drives every nav surface       -> code review (CategoryNav, Sidebar/mobile menu, casinoSearch.js's SEARCH_CATEGORIES/SEARCH_PROVIDERS, App.jsx's Casino sidebar builder all import from this module — no second hand-rolled list)
//  2.  Only real catalog/route content is shown          -> unit test (CASINO_CATEGORIES shape, `enabled` flags) + code review (Slots/Table Games excluded — zero real games/tags for either)
//  3.  Each category has one clear route/filter behavior  -> unit test (activateCasinoCategory)
//  4.  Providers is real provider browsing, not a mixed rail -> unit test (CASINO_PROVIDERS shape) + code review (see CasinoCatalog.jsx's ProviderTiles/tribet-studio-rail)
//  5.  Tribet Originals naming is consistent everywhere      -> unit test (CATEGORY_LABEL.Originals)
//  6.  Personal destinations are modeled separately from Casino content categories -> unit test (CASINO_PERSONAL_DESTINATIONS shape)
//  7.  A disabled category's route still resolves its real label            -> unit test (CATEGORY_LABEL.Slots)

describe("CASINO_CATEGORIES", () => {
  it("has exactly six nav-visible entries, in the target sidebar/pill order", () => {
    expect(CASINO_CATEGORIES).toHaveLength(6);
    expect(CASINO_CATEGORIES.map((c) => c.id)).toEqual([
      "Lobby",
      "Originals",
      "Popular",
      "New",
      "Live Casino",
      "Game Shows",
    ]);
  });

  it("never includes Slots, Table Games, or Providers (no supported inventory/real provider data for any)", () => {
    // Providers: this app has no real, multi-provider inventory yet — its
    // "two providers" are really just its own onchain vs. vendored demo
    // games, not distinct third parties worth a browsing destination (see
    // FINAL QA's PROVIDERS section). Disabled the same way as Slots/Table
    // Games — code (ProviderTiles, CASINO_PROVIDERS) is preserved, unused.
    expect(CASINO_CATEGORIES.some((c) => c.id === "Slots")).toBe(false);
    expect(CASINO_CATEGORIES.some((c) => c.id === "Table Games")).toBe(false);
    expect(CASINO_CATEGORIES.some((c) => c.id === "Providers")).toBe(false);
  });

  it("still resolves a disabled category's real label (Slots stays a working direct link)", () => {
    expect(CATEGORY_LABEL.Slots).toBe("Slots");
  });

  it("gives every entry a non-empty label, icon, and every field the shared config promises", () => {
    for (const c of CASINO_CATEGORIES) {
      expect(c.label).toBeTruthy();
      expect(c.icon).toBeTruthy();
      expect(typeof c.enabled).toBe("boolean");
      expect(typeof c.showInSidebar).toBe("boolean");
      expect(typeof c.showInTopNav).toBe("boolean");
      expect(typeof c.showAsLobbyRow).toBe("boolean");
      expect(typeof c.order).toBe("number");
    }
  });

  it("only ever contains enabled categories", () => {
    for (const c of CASINO_CATEGORIES) expect(c.enabled).toBe(true);
  });

  it("labels Originals as the customer-facing Tribet Originals everywhere", () => {
    expect(CATEGORY_LABEL.Originals).toBe("Tribet Originals");
    expect(CASINO_CATEGORIES.find((c) => c.id === "Originals").label).toBe("Tribet Originals");
  });

  it("gives every rail-kind entry a railTarget, and no other kind one", () => {
    for (const c of CASINO_CATEGORIES) {
      if (c.kind === "rail") expect(c.railTarget).toBeTruthy();
      else expect(c.railTarget).toBeUndefined();
    }
  });

  it("keeps ROUTED_CATEGORIES as every category with a real CATEGORY_META page, independent of `enabled`", () => {
    // Slots is disabled (not offered as a destination anywhere) but its
    // route must keep working for a direct/bookmarked link — see the
    // module's own comment on why this is NOT filtered by `enabled`.
    expect(ROUTED_CATEGORIES).toContain("Slots");
    expect(ROUTED_CATEGORIES).toEqual(["Popular", "New", "Live Casino", "Game Shows", "Slots"]);
  });
});

describe("CASINO_PERSONAL_DESTINATIONS", () => {
  it("lists exactly Favorites, Recently Played, and My Bets — never a Casino content category", () => {
    expect(CASINO_PERSONAL_DESTINATIONS.map((d) => d.id)).toEqual(["Favorites", "Recently Played", "My Bets"]);
  });

  it("marks My Bets as an action (opens a dialog) and the other two as routes", () => {
    const byId = Object.fromEntries(CASINO_PERSONAL_DESTINATIONS.map((d) => [d.id, d.kind]));
    expect(byId.Favorites).toBe("route");
    expect(byId["Recently Played"]).toBe("route");
    expect(byId["My Bets"]).toBe("action");
  });

  it("gives every entry a non-empty label and icon", () => {
    for (const d of CASINO_PERSONAL_DESTINATIONS) {
      expect(d.label).toBeTruthy();
      expect(d.icon).toBeTruthy();
    }
  });

  it("never overlaps with CASINO_CATEGORIES ids (personal destinations are not content categories)", () => {
    const categoryIds = new Set(CASINO_CATEGORIES.map((c) => c.id));
    for (const d of CASINO_PERSONAL_DESTINATIONS) expect(categoryIds.has(d.id)).toBe(false);
  });
});

describe("CASINO_PROVIDERS", () => {
  it("lists exactly the two real studios behind this catalog, not an invented directory", () => {
    expect(CASINO_PROVIDERS).toHaveLength(2);
    expect(CASINO_PROVIDERS.map((p) => p.id)).toEqual(["betswirl", "tribet-studio"]);
  });

  it("maps each provider to a distinct game kind and a distinct real rail destination", () => {
    const kinds = CASINO_PROVIDERS.map((p) => p.kind);
    const targets = CASINO_PROVIDERS.map((p) => p.railTarget);
    expect(new Set(kinds).size).toBe(CASINO_PROVIDERS.length);
    expect(new Set(targets).size).toBe(CASINO_PROVIDERS.length);
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
    // "Providers" itself is disabled (see FINAL QA fix) and no longer in
    // CASINO_CATEGORIES, but this test is really about "rail"-kind
    // categories in general redirecting to Lobby — "Originals" is the
    // same kind and still enabled, so it exercises the identical branch.
    const originals = CASINO_CATEGORIES.find((c) => c.id === "Originals");
    activateCasinoCategory(originals, onSelectCategory);
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
