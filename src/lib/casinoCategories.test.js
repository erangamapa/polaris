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
//  2.  Only real catalog/route content is shown          -> unit test (CASINO_CATEGORIES shape, `enabled` flags); Slots/Table Games are live now that a third-party studio catalogue fills them (see lib/catalog)
//  3.  Each category has one clear route/filter behavior  -> unit test (activateCasinoCategory)
//  4.  Providers is real provider browsing, not a mixed rail -> unit test (CASINO_PROVIDERS shape) + code review (see CasinoCatalog.jsx's ProviderTiles)
//  5.  Tribet Originals naming is consistent everywhere      -> unit test (CATEGORY_LABEL.Originals)
//  6.  Personal destinations are modeled separately from Casino content categories -> unit test (CASINO_PERSONAL_DESTINATIONS shape)
//  7.  A disabled category's route still resolves its real label            -> unit test (CATEGORY_LABEL.Slots)

describe("CASINO_CATEGORIES", () => {
  // CASINO CONTENT MODE — the process env in this test file has no
  // VITE_CASINO_CONTENT_MODE set, so the static import above resolves under
  // the real default: 'betswirl'. Providers carries zero content in that
  // mode (it's exclusively vendored local games — see casinoCategories.js's
  // own comment on the entry) and is hidden from nav accordingly; six
  // entries, not seven. The 'mixed'-mode case (Providers re-enabled) is
  // covered separately below via a fresh module load with the env stubbed,
  // mirroring packages/shared/chains.test.js's pattern.
  it("lists every nav-visible entry in the target sidebar/pill order", () => {
    expect(CASINO_CATEGORIES.map((c) => c.id)).toEqual([
      "Lobby",
      "Originals",
      "Popular",
      "New",
      "Slots",
      "Live Casino",
      "Game Shows",
      "Table Games",
    ]);
  });

  // Both were dark for one reason only: nothing could fill them. A studio
  // catalogue does now (lib/catalog), so the rule they encode is no longer
  // "never show these" but "only show a category something can actually
  // fill" — which is why each must keep a CATEGORY_META tag to filter on.
  it("enables Slots and Table Games, each with a real tag to filter on", () => {
    for (const id of ["Slots", "Table Games"]) {
      const entry = CASINO_CATEGORIES.find((c) => c.id === id);
      expect(entry, `${id} should be nav-visible`).toBeTruthy();
      expect(ROUTED_CATEGORIES).toContain(id);
    }
  });

  it("disables Providers by default (betswirl content mode has zero provider-game inventory)", () => {
    expect(CASINO_CATEGORIES.some((c) => c.id === "Providers")).toBe(false);
  });

  it("resolves real labels for the newly filled categories", () => {
    expect(CATEGORY_LABEL.Slots).toBe("Slots");
    expect(CATEGORY_LABEL["Table Games"]).toBe("Table Games");
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

  // The "Originals" id is a legacy internal key holding the on-chain games,
  // which are BetSwirl's. Labelling them as Tribet content misattributed a
  // third party's games as first-party, so every player-facing surface reads
  // "BetSwirl" and no surface may reintroduce the old wording.
  it("labels the on-chain category as On-chain everywhere a player sees it", () => {
    // The internal id stays "Originals" (routing key, test selector); the
    // player-visible label must never assert who authored the games - not
    // Tribet, which did not build them, and no vendor name either.
    expect(CATEGORY_LABEL.Originals).toBe("On-chain");
    expect(CASINO_CATEGORIES.find((c) => c.id === "Originals").label).toBe("On-chain");
  });

  it("never presents the on-chain games as Tribet-authored", () => {
    const entry = CASINO_CATEGORIES.find((c) => c.id === "Originals");
    expect(entry.label).not.toMatch(/tribet/i);
    expect(CATEGORY_LABEL.Originals).not.toMatch(/original/i);
  });

  it("gives every rail-kind entry a railTarget, and no other kind one", () => {
    for (const c of CASINO_CATEGORIES) {
      if (c.kind === "rail") expect(c.railTarget).toBeTruthy();
      else expect(c.railTarget).toBeUndefined();
    }
  });

  it("keeps ROUTED_CATEGORIES as every category with a real CATEGORY_META page, independent of `enabled`", () => {
    // ROUTED_CATEGORIES is every category with a CATEGORY_META page, which
    // is deliberately NOT filtered by `enabled` — a category can be hidden
    // from nav and still answer a direct or bookmarked link.
    expect(ROUTED_CATEGORIES).toEqual(["Popular", "New", "Live Casino", "Game Shows", "Slots", "Table Games"]);
  });
});

// Fresh module load with VITE_CASINO_CONTENT_MODE stubbed to 'mixed' — the
// only way to exercise the combined-catalog branch, since CASINO_CATEGORIES
// above resolves the content mode once at module load (see chains.js).
describe("CASINO_CATEGORIES in mixed content mode", () => {
  async function loadCasinoCategories(contentMode) {
    vi.resetModules();
    vi.stubEnv("VITE_CASINO_CONTENT_MODE", contentMode);
    return import("./casinoCategories");
  }

  it("re-enables Providers now that three real providers exist (supersedes the prior FINAL QA disable)", async () => {
    const m = await loadCasinoCategories("mixed");
    const providers = m.CASINO_CATEGORIES.find((c) => c.id === "Providers");
    expect(providers).toBeTruthy();
    expect(providers.enabled).toBe(true);
    expect(providers.showInSidebar).toBe(true);
    expect(providers.showInTopNav).toBe(true);
    expect(providers.showAsLobbyRow).toBe(true);
    expect(m.CASINO_CATEGORIES).toHaveLength(9);
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("CASINO_PERSONAL_DESTINATIONS", () => {
  // HEART REDESIGN — the prior "Following" (followed providers) destination
  // has been removed entirely (not just hidden): Personal now contains only
  // Favorites and Recently Played, never a Casino content category.
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
  // NAV SPEC §6.6 — Tribet Originals (the onchain/BetSwirl catalog) is
  // first-party content and a category, never a provider; it must never
  // appear in the Providers rail/directory. Three real providers exist in
  // this catalog now (superseding the prior "exactly one" FINAL QA state).
  it("lists exactly the three real providers, excluding Tribet Originals", () => {
    expect(CASINO_PROVIDERS).toHaveLength(3);
    expect(CASINO_PROVIDERS.map((p) => p.id)).toEqual(["provider-1", "provider-2", "provider-3"]);
    expect(CASINO_PROVIDERS.some((p) => p.id === "tribet-studio")).toBe(false);
    expect(CASINO_PROVIDERS.some((p) => p.id.includes("original"))).toBe(false);
  });

  it("maps each provider to a distinct real rail destination", () => {
    const targets = CASINO_PROVIDERS.map((p) => p.railTarget);
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
    // "Originals" is a "rail"-kind category (same as "Providers"), so it
    // exercises the identical redirect-to-Lobby branch.
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
