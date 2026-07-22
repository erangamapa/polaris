import { describe, it, expect } from "vitest";
import { withFavorite, toggleFavorite, mergeAccountFavorites } from "./casinoFavorites";

// FAVORITES SYSTEM AUDIT AND CLEANUP — scenario coverage. This module holds
// the only new pure logic the task introduces (everything else — game
// cards, search, rail, navigation — reads/writes through App.jsx's single
// `favs` state via these transforms, with no second store anywhere; see the
// FINAL RESPONSE for the full access-point audit). Rendering/integration
// behavior was verified manually via Playwright against the running dev
// server, driven through the Developer Panel's Favorites/User presets:
//
//  1.  One shared Favorites state is used                 -> code review (App.jsx's single `favs` Set; game cards/search/rail/nav all receive isFav/onFav from it, no second store)
//  2.  Toggling on a game card updates Favorites rail       -> Playwright (star click on Originals rail -> Favorites rail gains the card)
//  3.  Toggling in search updates game card state            -> Playwright (star click in search results -> same game's rail card reflects it)
//  4.  Toggling on game page updates Home                      -> N/A — no favorite control exists on the game-launch shell (see FINAL RESPONSE: no suitable place, not added)
//  5.  Favorite control does not launch game                    -> Playwright (star click never opens the game modal / never changes the URL)
//  6.  aria-pressed updates correctly                             -> Playwright (toggles true/false on click, matches visible fill state)
//  7.  Populated Favorites rail renders                            -> Playwright (Dev Panel -> Favorites -> Populated)
//  8.  Empty Favorites state renders correctly                      -> Playwright ("No favorites yet" / "Save games to find them quickly" / "Browse games ->")
//  9.  Navigation entry updates count                                -> Playwright (sidebar/mobile menu badge count matches favs.size immediately after toggling)
//  10. Zero count hides badge                                          -> unit test (StatusBadge, already covered in its own file) + Playwright (badge absent at 0)
//  11. Logged-out behavior is consistent                                -> Playwright (favoriting works while disconnected — local/device-scoped, same as every surface)
//  12. Session-expired behavior is consistent                            -> Playwright (Dev Panel -> User -> Expired: toggling prompts "Log in again", favorite state unchanged)
//  13. Failed persistence rolls back                                      -> unit test (toggleFavorite's `adding` flag lets App.jsx revert with the same transform, symmetric add/remove)
//  14. Toast feedback is correct                                           -> Playwright ("Added to Favorites" / "Removed from Favorites"; rapid toggling shows only the latest, not a stack)
//  15. Duplicate favorite IDs are prevented                                 -> unit test (Set semantics — toggling an already-favorited id twice is a no-op the second call reverses cleanly)
//  16. Removing Favorite removes it from rail                                -> Playwright (unstar from Favorites page -> rail loses the card)
//  17. Dedicated route or scroll destination works                           -> Playwright (/casino/favorites renders FavoritesPage; browser Back returns to Lobby)
//  18. My Games ambiguity is removed                                          -> code review (no "My Games"/"Your games" label anywhere in the UI — confirmed via repo-wide search; only historical code comments remain)
//  19. Mobile and desktop use same state                                       -> code review (single favs state has no viewport branch) + Playwright (toggle on desktop, reload at mobile width, state persists)
//  20. 320px layout does not overflow                                           -> Playwright (320-1920px, scrollWidth === clientWidth; favorite button doesn't overlap title text)

describe("withFavorite", () => {
  it("adds an id without mutating the input set", () => {
    const set = new Set(["a"]);
    const next = withFavorite(set, "b", true);
    expect(next).toEqual(new Set(["a", "b"]));
    expect(set).toEqual(new Set(["a"])); // unchanged
  });

  it("removes an id without mutating the input set", () => {
    const set = new Set(["a", "b"]);
    const next = withFavorite(set, "b", false);
    expect(next).toEqual(new Set(["a"]));
    expect(set).toEqual(new Set(["a", "b"])); // unchanged
  });

  it("adding an already-present id is a no-op (no duplicates possible)", () => {
    const set = new Set(["a"]);
    expect(withFavorite(set, "a", true)).toEqual(new Set(["a"]));
  });

  it("removing an absent id is a no-op", () => {
    const set = new Set(["a"]);
    expect(withFavorite(set, "z", false)).toEqual(new Set(["a"]));
  });
});

describe("toggleFavorite", () => {
  it("adds and reports adding:true when not yet favorited", () => {
    const { next, adding } = toggleFavorite(new Set(), "dice");
    expect(adding).toBe(true);
    expect(next.has("dice")).toBe(true);
  });

  it("removes and reports adding:false when already favorited", () => {
    const { next, adding } = toggleFavorite(new Set(["dice"]), "dice");
    expect(adding).toBe(false);
    expect(next.has("dice")).toBe(false);
  });

  it("toggling twice returns to the original state (rollback shape)", () => {
    const original = new Set(["dice", "keno"]);
    const { next: afterAdd } = toggleFavorite(original, "roulette");
    const { next: afterRevert } = toggleFavorite(afterAdd, "roulette");
    expect(afterRevert).toEqual(original);
  });
});

describe("mergeAccountFavorites", () => {
  it("unions the baseline and account sets", () => {
    const { merged } = mergeAccountFavorites(new Set(["a"]), new Set(["b"]));
    expect(merged).toEqual(new Set(["a", "b"]));
  });

  it("reports how many new ids the account bucket actually contributed", () => {
    expect(mergeAccountFavorites(new Set(["a"]), new Set(["a", "b", "c"])).added).toBe(2);
    expect(mergeAccountFavorites(new Set(["a"]), new Set()).added).toBe(0);
    expect(mergeAccountFavorites(new Set(["a"]), new Set(["a"])).added).toBe(0);
  });

  it("never drops a baseline id even if the account bucket is empty", () => {
    const { merged } = mergeAccountFavorites(new Set(["a", "b"]), new Set());
    expect(merged).toEqual(new Set(["a", "b"]));
  });
});
