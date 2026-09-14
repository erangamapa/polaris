// Sequential dedup for Casino Lobby discovery rails: each rail in render
// order excludes games already claimed by an earlier rail in the same pass,
// so the same game never appears twice across adjacent "what's hot" rows
// (e.g. a game tagged both "popular" and "new" only shows once, wherever it
// renders first). `seen` is a mutable Set the caller owns across the whole
// sequence. NOT used for genre-based rows (Slots/Casual/Table Games/
// Scratch/Exclusive) — those are meant to be complete, browsable listings
// of their own genre, so overlapping with Popular/New is expected, not a
// bug (see CasinoCatalog.jsx's LobbyDashboard, follow-up fix for why a
// 13-title genre row silently losing 6 of them to earlier-claiming rails
// is a real problem a 255-title one never surfaces).
export function takeUnclaimed(games, seen) {
  const kept = games.filter((g) => !seen.has(g.favId));
  for (const g of kept) seen.add(g.favId);
  return kept;
}
