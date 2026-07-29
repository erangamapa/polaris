// CASINO PLACEHOLDER FIXTURES — a dev-only UI-testing layer for exercising
// rail overflow, scroll controls, card spacing, and grid density at real
// desktop widths. Deliberately decoupled from ALL_GAMES/casinoFavorites/
// casinoSearch/routing: a placeholder is never added to the real game
// registry, so it can never be favorited, never enter Recently Played,
// never resolve via findGameByFavId, and never appear in search — those
// guarantees hold by construction (this module has no dependency on any of
// those systems), not because of scattered `isPlaceholder` checks inside
// each of them. See CasinoCatalog.jsx's LobbyDashboard/CategoryPage for
// where the arrays this module returns get appended to the real `games`
// array actually passed to CasinoGameRail/the category grid — Recently
// Played and Favorites simply never call this module, which is what keeps
// them genuinely untouched rather than needing an exclusion list.

export const PLACEHOLDER_TITLE = "PLACEHOLDER GAME";
export const PLACEHOLDER_BADGE = "UI Test Fixture";

// One centralised target rather than per-category magic numbers scattered
// across components. Verified against RAIL_TILE (136px) + the rail's own
// 12px gap at the widest content width this shell ever reaches
// (--content-max-w: 1920px, see ArenaPageColumn.jsx) — at most ~12 tiles
// fit in one viewport-width segment there, so 14 guarantees at least 2
// stay off-screen at every supported desktop width down to 1280px
// (confirmed by hand at 1280/1440/1728/1920), without padding any rail
// with dozens of unnecessary tiles.
export const PLACEHOLDER_TARGET_TOTAL = 14;

// Six restrained, dark, desaturated gradient pairs (tokens defined in
// index.css's "COMPONENT: placeholder game card" section) — deliberately
// NOT the app's semantic --success/--warning/--danger/--info tokens (those
// carry real UI meaning elsewhere) and deliberately not saturated/bright.
const GRADIENT_VARS = [
  "--placeholder-gradient-1", // navy -> cobalt
  "--placeholder-gradient-2", // deep violet -> indigo
  "--placeholder-gradient-3", // muted teal -> dark cyan
  "--placeholder-gradient-4", // dark green -> forest
  "--placeholder-gradient-5", // burgundy -> muted magenta
  "--placeholder-gradient-6", // dark amber -> burnt orange
];

const pad = (n) => String(n).padStart(2, "0");

// `category` namespaces ids per Casino section ("popular", "originals",
// etc.); `surface` namespaces them again between a Lobby rail and that same
// category's standalone "See all" page — both call this independently with
// a different `existingCount`, so their placeholder sets are never the same
// length. Ids are fully deterministic (no Math.random/Date.now) so repeated
// renders and screenshots stay stable, and namespaced so they can never
// collide with a real `casino:*`/`provider:*` favId.
export function createPlaceholderGames({ category, surface = "rail", existingCount, targetTotal = PLACEHOLDER_TARGET_TOTAL }) {
  const needed = Math.max(0, targetTotal - existingCount);
  return Array.from({ length: needed }, (_, i) => {
    const id = `placeholder:${category}:${surface}:${pad(i + 1)}`;
    return {
      id,
      favId: id,
      kind: "placeholder",
      title: PLACEHOLDER_TITLE,
      category,
      isPlaceholder: true,
      playable: false,
      badge: PLACEHOLDER_BADGE,
      gradientVar: GRADIENT_VARS[i % GRADIENT_VARS.length],
    };
  });
}
