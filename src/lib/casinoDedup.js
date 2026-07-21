// Sequential dedup for Casino Lobby discovery rails: each rail in render
// order excludes games already claimed by an earlier rail in the same pass,
// so the same game never appears twice across adjacent "what's hot" rows
// (e.g. a game tagged both "popular" and "live-casino" only shows once,
// wherever it renders first). `seen` is a mutable Set the caller owns across
// the whole sequence — seed it before the first call with ids that should
// never appear in a deduped rail (e.g. the always-shown Originals row).
export function takeUnclaimed(games, seen) {
  const kept = games.filter((g) => !seen.has(g.favId));
  for (const g of kept) seen.add(g.favId);
  return kept;
}
