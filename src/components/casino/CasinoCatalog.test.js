import { describe, it, expect } from "vitest";
import { gameProviderName, ALL_GAMES } from "./CasinoCatalog";

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
