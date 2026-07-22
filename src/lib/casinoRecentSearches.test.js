import { describe, it, expect, beforeEach } from "vitest";
import { loadRecentSearches, addRecentSearch, clearRecentSearches } from "./casinoRecentSearches";

// This suite runs under vitest's default "node" environment (see the rest of
// src/lib/*.test.js — none of them need a DOM, so nothing here pulls in
// jsdom/happy-dom just for one module). A minimal in-memory shim is enough:
// casinoRecentSearches.js only ever calls getItem/setItem.
beforeEach(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    clear: () => store.clear(),
  };
});

describe("casinoRecentSearches", () => {
  it("starts empty", () => {
    expect(loadRecentSearches()).toEqual([]);
  });

  it("adds a query newest-first", () => {
    let list = addRecentSearch([], "dice");
    list = addRecentSearch(list, "roulette");
    expect(list).toEqual(["roulette", "dice"]);
  });

  it("moves a re-run query to the front instead of duplicating it", () => {
    let list = addRecentSearch([], "dice");
    list = addRecentSearch(list, "roulette");
    list = addRecentSearch(list, "dice");
    expect(list).toEqual(["dice", "roulette"]);
  });

  it("de-duplicates case-insensitively", () => {
    let list = addRecentSearch([], "Dice");
    list = addRecentSearch(list, "dice");
    expect(list).toEqual(["dice"]);
  });

  it("caps at 5 entries", () => {
    let list = [];
    for (const q of ["a", "b", "c", "d", "e", "f"]) list = addRecentSearch(list, q);
    expect(list).toHaveLength(5);
    expect(list).toEqual(["f", "e", "d", "c", "b"]);
  });

  it("ignores an empty/whitespace-only query", () => {
    expect(addRecentSearch(["dice"], "   ")).toEqual(["dice"]);
  });

  it("persists across loadRecentSearches calls", () => {
    addRecentSearch([], "keno");
    expect(loadRecentSearches()).toEqual(["keno"]);
  });

  it("clearRecentSearches empties storage", () => {
    addRecentSearch([], "keno");
    clearRecentSearches();
    expect(loadRecentSearches()).toEqual([]);
  });
});
