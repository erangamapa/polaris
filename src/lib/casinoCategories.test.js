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
// those.
//
// BGAMING-ONLY REWORK — this taxonomy is no longer gated on build-time
// content-mode flags; BGaming is the only source, always on. Every
// category below has real inventory (see lib/catalog's genre-based
// tagging) except Providers, which is `enabled: false` until a second
// real provider is integrated (BGaming carries no `providerId`).

describe("CASINO_CATEGORIES", () => {
  it("lists every nav-visible entry in the target sidebar/pill order", () => {
    expect(CASINO_CATEGORIES.map((c) => c.id)).toEqual([
      "Lobby",
      "Popular",
      "New",
      "Slots",
      "Casual",
      "Table Games",
      "Scratch",
      "Exclusive",
    ]);
  });

  it("disables Providers — BGaming carries no providerId, so it has nothing to show today", () => {
    expect(CASINO_CATEGORIES.some((c) => c.id === "Providers")).toBe(false);
  });

  it("keeps Providers' route working regardless, for a bookmarked link, and keeps it fully modeled", () => {
    expect(CATEGORY_LABEL.Providers).toBe("Providers");
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

  it("uses the display label override only where one is defined ('New' -> 'New Releases')", () => {
    expect(CATEGORY_LABEL.New).toBe("New Releases");
    expect(CATEGORY_LABEL.Slots).toBe("Slots");
    expect(CATEGORY_LABEL["Table Games"]).toBe("Table Games");
  });

  it("gives every rail-kind entry a railTarget, and no other kind one", () => {
    for (const c of CASINO_CATEGORIES) {
      if (c.kind === "rail") expect(c.railTarget).toBeTruthy();
      else expect(c.railTarget).toBeUndefined();
    }
  });

  it("gives every showAsLobbyRow entry a sectionId to scroll to", () => {
    for (const c of CASINO_CATEGORIES) {
      if (c.showAsLobbyRow) expect(c.sectionId).toBeTruthy();
    }
  });

  it("keeps ROUTED_CATEGORIES as every category with a real CATEGORY_META page, independent of `enabled`", () => {
    // ROUTED_CATEGORIES is every category with a CATEGORY_META page, which
    // is deliberately NOT filtered by `enabled`.
    expect(ROUTED_CATEGORIES).toEqual(["Popular", "New", "Slots", "Casual", "Table Games", "Scratch", "Exclusive"]);
  });
});

describe("CASINO_PERSONAL_DESTINATIONS", () => {
  it("lists exactly Favorites and Recently Played — never a Casino content category", () => {
    expect(CASINO_PERSONAL_DESTINATIONS.map((d) => d.id)).toEqual(["Favorites", "Recently Played"]);
  });

  it("marks every entry as a route", () => {
    const byId = Object.fromEntries(CASINO_PERSONAL_DESTINATIONS.map((d) => [d.id, d.kind]));
    expect(byId.Favorites).toBe("route");
    expect(byId["Recently Played"]).toBe("route");
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
  // The 12 placeholder provider games (provider-1/2/3) are gone. BGaming is
  // the only real source and sets no `providerId` (see ProviderGame.jsx),
  // so there is nothing real to list here — kept empty, not deleted, since
  // downstream code structurally depends on the export existing.
  it("is empty — no real provider has a providerId to browse by today", () => {
    expect(CASINO_PROVIDERS).toEqual([]);
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
    // Providers is the one rail-kind category (currently disabled in nav,
    // but the function itself is generic and doesn't care about `enabled`).
    vi.stubGlobal("requestAnimationFrame", (cb) => cb());
    vi.stubGlobal("document", { querySelector: () => null });
    const onSelectCategory = vi.fn();
    const providers = { id: "Providers", kind: "rail", railTarget: "providers-rail" };
    activateCasinoCategory(providers, onSelectCategory);
    expect(onSelectCategory).toHaveBeenCalledWith("Lobby");
    expect(onSelectCategory).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("does not throw when onSelectCategory is omitted", () => {
    vi.stubGlobal("requestAnimationFrame", (cb) => cb());
    vi.stubGlobal("document", { querySelector: () => null });
    const providers = { id: "Providers", kind: "rail", railTarget: "providers-rail" };
    expect(() => activateCasinoCategory(providers, undefined)).not.toThrow();
    vi.unstubAllGlobals();
  });
});
