import { describe, it, expect } from "vitest";
import { tagsFor } from "./normalize.js";
import { bgaming, demoUrl } from "./adapters/bgaming.js";
import { externalGames } from "./index.js";
import { LAUNCH_EXTERNAL } from "./game.js";
import { CATEGORY_META } from "@/lib/casinoCategories";
import { POPULAR_SLUGS } from "./adapters/bgaming.popular.js";
import { BGAMING_GAMES } from "./adapters/bgaming.games.js";

// The lobby only understands the tags in CATEGORY_META. An adapter emitting
// anything else produces a game that renders nowhere, which is invisible in
// review and obvious only to a player who cannot find a game — so the tag
// vocabulary is pinned here rather than trusted.
const SHELF_TAGS = new Set(Object.values(CATEGORY_META).map((c) => c.tag));

describe("tagsFor", () => {
  it.each([
    ["Roulette", "table-games"],
    ["Cards", "table-games"],
    ["Dice", "table-games"],
    ["Scratch", "scratch"],
    ["Lottery", "scratch"],
    ["Casual", "casual"],
    ["Casual Exclusive", "casual"],
    ["Slots", "slots"],
    ["Exclusive Slots", "exclusive"],
    ["Slots Exclusive", "exclusive"],
  ])("maps the studio genre %s to %s", (genre, tag) => {
    expect(tagsFor({ genre })).toContain(tag);
  });

  it("normalizes both spellings of the Exclusive shelf to one tag", () => {
    expect(tagsFor({ genre: "Exclusive Slots" })).toEqual(tagsFor({ genre: "Slots Exclusive" }));
  });

  it("falls back to slug/title keywords only when genre is missing or unrecognized", () => {
    expect(tagsFor({ genre: null, slug: "american-roulette" })).toContain("table-games");
  });

  it("never leaves a game with no shelf", () => {
    // A game tagged with nothing renders in the catalogue but under no
    // category at all — the one outcome this function must not produce.
    expect(tagsFor({ genre: null, slug: "something-unrecognisable", title: "?" })).not.toHaveLength(0);
  });
});

describe("bgaming.popular", () => {
  it("is a real, curated subset of the actual catalog", () => {
    const realSlugs = new Set(BGAMING_GAMES.map((g) => g.slug));
    for (const slug of POPULAR_SLUGS) expect(realSlugs.has(slug), `${slug} is not a real slug`).toBe(true);
  });

  it("clears the minimum a nav category needs to show", () => {
    expect(POPULAR_SLUGS.size).toBeGreaterThanOrEqual(12);
  });
});

describe("bgaming adapter", () => {
  const games = bgaming.games();

  it("produces a non-trivial catalogue", () => {
    expect(games.length).toBeGreaterThan(100);
  });

  it("builds demo-mode URLs against the public demo host", () => {
    expect(demoUrl("AmericanRoulette")).toBe("https://demo.bgaming-network.com/play/AmericanRoulette/FUN?server=demo");
    // /FUN is what makes it play money. A real-money path must never appear.
    for (const g of games) expect(g.launch.src).toContain("/FUN");
  });

  it("marks every game external so no balance bridge is attached", () => {
    // Attaching our mock host to a studio demo would show a TBET figure over
    // a game running its own credits.
    for (const g of games) expect(g.launch.kind).toBe(LAUNCH_EXTERNAL);
  });

  it("namespaces favourites so a studio game cannot collide with ours", () => {
    for (const g of games) expect(g.favId.startsWith("bgaming:")).toBe(true);
  });

  it("only ever emits tags the lobby has a shelf for", () => {
    const extra = new Set();
    for (const g of games) for (const t of g.tags) if (!SHELF_TAGS.has(t)) extra.add(t);
    expect([...extra]).toEqual([]);
  });

  it("gives every game the fields the lobby renders", () => {
    for (const g of games) {
      expect(g.key).toBeTruthy();
      expect(g.title).toBeTruthy();
      expect(g.studio).toBe("BGaming");
      expect(g.kind).toBe("provider");
      expect(g.tags.length).toBeGreaterThan(0);
    }
  });

  it("puts recent releases on the New Releases shelf, and only recent ones", () => {
    const tagged = games.filter((g) => g.tags.includes("new"));
    expect(tagged.length).toBeGreaterThan(0);
    // The shelf is driven by the studio's real release date, so nothing old
    // can sit on it however the catalogue is regenerated.
    const yearAgo = Date.now() - 365 * 86_400_000;
    for (const g of tagged) expect(Date.parse(g.released)).toBeGreaterThan(yearAgo);
    // ...and it must not simply be the whole catalogue.
    expect(tagged.length).toBeLessThan(games.length);
  });

  it("populates every real category", () => {
    for (const tag of ["slots", "casual", "table-games", "scratch", "exclusive", "popular"]) {
      expect(games.some((g) => g.tags.includes(tag)), `nothing tagged ${tag}`).toBe(true);
    }
  });
});

describe("registry", () => {
  it("de-duplicates by favId", () => {
    const all = externalGames();
    expect(new Set(all.map((g) => g.favId)).size).toBe(all.length);
  });
});
