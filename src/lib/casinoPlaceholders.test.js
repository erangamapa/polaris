import { describe, it, expect } from "vitest";
import { createPlaceholderGames, PLACEHOLDER_TITLE, PLACEHOLDER_BADGE, PLACEHOLDER_TARGET_TOTAL } from "./casinoPlaceholders";

describe("createPlaceholderGames", () => {
  it("returns exactly enough placeholders to reach the target total", () => {
    const games = createPlaceholderGames({ category: "popular", existingCount: 6 });
    expect(games).toHaveLength(PLACEHOLDER_TARGET_TOTAL - 6);
  });

  it("never returns a negative count when real games already meet or exceed the target", () => {
    expect(createPlaceholderGames({ category: "popular", existingCount: PLACEHOLDER_TARGET_TOTAL })).toHaveLength(0);
    expect(createPlaceholderGames({ category: "popular", existingCount: PLACEHOLDER_TARGET_TOTAL + 5 })).toHaveLength(0);
  });

  it("respects an explicit targetTotal override", () => {
    expect(createPlaceholderGames({ category: "popular", existingCount: 2, targetTotal: 5 })).toHaveLength(3);
  });

  it("gives every placeholder the exact required title, badge, kind and playable flag", () => {
    const games = createPlaceholderGames({ category: "popular", existingCount: 0, targetTotal: 3 });
    for (const g of games) {
      expect(g.title).toBe(PLACEHOLDER_TITLE);
      expect(g.badge).toBe(PLACEHOLDER_BADGE);
      expect(g.kind).toBe("placeholder");
      expect(g.isPlaceholder).toBe(true);
      expect(g.playable).toBe(false);
    }
  });

  it("produces stable, unique, namespaced ids that can never collide with real game favIds", () => {
    const games = createPlaceholderGames({ category: "popular", surface: "rail", existingCount: 0, targetTotal: 4 });
    const ids = games.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id.startsWith("placeholder:popular:rail:")).toBe(true);
      expect(id.startsWith("casino:")).toBe(false);
      expect(id.startsWith("provider:")).toBe(false);
    }
    // favId always mirrors id — some shared rendering code reads .favId generically.
    for (const g of games) expect(g.favId).toBe(g.id);
  });

  it("is fully deterministic across repeated calls (no Math.random/Date.now)", () => {
    const a = createPlaceholderGames({ category: "new", existingCount: 3, targetTotal: 10 });
    const b = createPlaceholderGames({ category: "new", existingCount: 3, targetTotal: 10 });
    expect(a).toEqual(b);
  });

  it("assigns gradients deterministically, cycling through the six token variants", () => {
    const games = createPlaceholderGames({ category: "live-casino", existingCount: 0, targetTotal: 8 });
    expect(games[0].gradientVar).toBe("--placeholder-gradient-1");
    expect(games[5].gradientVar).toBe("--placeholder-gradient-6");
    expect(games[6].gradientVar).toBe("--placeholder-gradient-1"); // wraps around
  });

  it("namespaces ids differently per surface even for the same category", () => {
    const railGames = createPlaceholderGames({ category: "popular", surface: "rail", existingCount: 0, targetTotal: 2 });
    const pageGames = createPlaceholderGames({ category: "popular", surface: "page", existingCount: 0, targetTotal: 2 });
    const railIds = new Set(railGames.map((g) => g.id));
    const pageIds = new Set(pageGames.map((g) => g.id));
    for (const id of pageIds) expect(railIds.has(id)).toBe(false);
  });

  it("assigns the requested category to every generated placeholder", () => {
    const games = createPlaceholderGames({ category: "game-shows", existingCount: 0, targetTotal: 3 });
    for (const g of games) expect(g.category).toBe("game-shows");
  });
});
