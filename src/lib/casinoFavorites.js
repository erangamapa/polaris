// Casino Favorites — the pure Set transforms App.jsx's `favs` state (the one
// shared source of truth every surface reads from: game cards, search
// results, the Favorites rail, the Favorites page, and both sidebar/mobile
// navigation entries) is built from. Kept here, not inline in App.jsx, so
// the actual mutation logic is unit-testable without a DOM — App.jsx still
// owns the stateful wiring (useState, wallet/account persistence, toasts),
// this only owns "given a Set and a game id, what's the next Set".
//
// Preferred API from the task spec (isFavorite/addFavorite/removeFavorite/
// toggleFavorite/getFavoriteGames) maps onto this module + App.jsx as:
//   isFavorite(id)    -> favs.has(id)                (App.jsx's `isFav`)
//   addFavorite(id)   -> withFavorite(favs, id, true)
//   removeFavorite(id)-> withFavorite(favs, id, false)
//   toggleFavorite(id)-> toggleFavorite(favs, id)      (below)
//   getFavoriteGames()-> ALL_GAMES.filter(isFav)        (CasinoCatalog.jsx)
// There is deliberately no separate store for any of these — every surface
// passes the same `favs`/`isFav`/`onFav` down from App.jsx.

// Returns a NEW Set with `id` added or removed — never mutates `set`, so
// callers (React state setters) always get a genuinely new reference.
export function withFavorite(set, id, present) {
  const next = new Set(set);
  if (present) next.add(id);
  else next.delete(id);
  return next;
}

// The actual toggle a favorite button performs: flips membership and
// reports which direction it went, so the caller can drive telemetry/toast
// copy ("Added to Favorites" vs "Removed from Favorites") without
// re-deriving it from a before/after diff.
export function toggleFavorite(set, id) {
  const adding = !set.has(id);
  return { next: withFavorite(set, id, adding), adding };
}

// Account-connect merge: baseline (favorites picked before any wallet was
// ever connected on this device) union that address's own saved bucket.
// Always recomputed from the fixed baseline, never from whatever `favs`
// currently holds — see App.jsx's deviceBaselineRef comment for why
// (switching from account A to account B must never carry A's picks into
// B). Returns the merged set plus how many new ids the account bucket
// actually contributed, so the caller can decide whether a "Synced N
// favorites" toast is worth showing (0 added = nothing to announce).
export function mergeAccountFavorites(baseline, accountFavorites) {
  const merged = new Set([...baseline, ...accountFavorites]);
  return { merged, added: merged.size - baseline.size };
}
