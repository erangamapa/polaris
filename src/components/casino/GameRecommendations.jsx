import { ALL_GAMES, CasinoGameRail, gameProviderName } from "./CasinoCatalog";

// Pure curation — unit-testable without rendering. Every list excludes the
// game currently being played and is capped so a rail never renders a
// near-duplicate of the full catalog.
const RAIL_LIMIT = 10;

export function recentlyPlayedGames(recentIds, currentFavId) {
  const seen = new Set();
  const games = [];
  for (const favId of recentIds ?? []) {
    if (favId === currentFavId || seen.has(favId)) continue;
    const game = ALL_GAMES.find((g) => g.favId === favId);
    if (game) { seen.add(favId); games.push(game); }
    if (games.length >= RAIL_LIMIT) break;
  }
  return games;
}

export function similarGames(game) {
  if (!game?.tags?.length) return [];
  const tagSet = new Set(game.tags);
  return ALL_GAMES
    .filter((g) => g.favId !== game.favId && g.tags?.some((t) => tagSet.has(t)))
    .slice(0, RAIL_LIMIT);
}

export function sameProviderGames(game) {
  if (!game) return [];
  const provider = gameProviderName(game);
  return ALL_GAMES
    .filter((g) => g.favId !== game.favId && gameProviderName(g) === provider)
    .slice(0, RAIL_LIMIT);
}

export function trendingGames(currentFavId) {
  return ALL_GAMES
    .filter((g) => g.favId !== currentFavId && g.tags?.includes("popular"))
    .slice(0, RAIL_LIMIT);
}

// Below the toolbar, never beside the stage (see spec's own "do not show
// recommendations beside the iframe"). Reuses the exact same
// CasinoGameRail/CasinoGameCard machinery every other Casino surface
// already renders through — no second rail implementation.
export function GameRecommendations({ game, recentIds, tileProps }) {
  const recent = recentlyPlayedGames(recentIds, game?.favId);
  const similar = similarGames(game);
  const sameProvider = sameProviderGames(game);
  const trending = trendingGames(game?.favId);

  const sections = [
    { id: "recently-played", title: "Recently Played", games: recent },
    { id: "similar-games", title: "Similar Games", games: similar },
    { id: "same-provider", title: game ? `More from ${gameProviderName(game)}` : "Same Provider", games: sameProvider },
    { id: "trending", title: "Trending", games: trending },
  ].filter((s) => s.games.length > 0);

  if (sections.length === 0) return null;

  return (
    <div data-test-id="game-recommendations" className="space-y-6 pt-4">
      {sections.map((s) => (
        <CasinoGameRail
          key={s.id}
          sectionId={`game-recommendations-${s.id}`}
          testId={`recommendations-${s.id}`}
          title={s.title}
          games={s.games}
          tileProps={tileProps}
          context="recommended"
        />
      ))}
    </div>
  );
}
