// Casino-only search: a normalized, static index over the same catalog the
// Lobby rails already render (see CasinoCatalog.jsx), plus deterministic
// ranking and grouping. No network, no fuzzy-search dependency — the whole
// catalog is small and already in memory, so a plain tiered string match is
// both correct and fast enough to run on every keystroke.
import { ALL_GAMES } from "@/components/casino/CasinoCatalog";
import { CASINO_CATEGORIES, CASINO_PROVIDERS } from "@/lib/casinoCategories";

// Exactly CASINO_PROVIDERS (the shared provider taxonomy — see
// lib/casinoCategories.js, which no longer includes Tribet Originals per
// nav spec §6.6) plus a live count computed against ALL_GAMES via the real
// `providerId` FK (not a `kind` match), not a second hand-maintained
// provider list.
export const SEARCH_PROVIDERS = CASINO_PROVIDERS.map((p) => ({
  ...p,
  count: ALL_GAMES.filter((g) => g.providerId === p.id).length,
}));

// Exactly CASINO_CATEGORIES minus Lobby — the same shared config the
// in-page CategoryNav bar renders from (see CasinoCatalog.jsx), not a
// second category list. Lobby is excluded because searching "lobby" and
// being offered a "Lobby" result adds nothing — it's the default view, not
// a distinct destination. Selecting any of these goes through
// activateCasinoCategory (see CasinoSearch.jsx), the same route-vs-rail-
// scroll behavior the nav bar uses.
export const SEARCH_CATEGORIES = CASINO_CATEGORIES.filter((c) => c.id !== "Lobby");

// Tiered match, lowest is best: 0 exact, 1 prefix, 2 partial (substring),
// null no match. `q` must already be trimmed/lowercased by the caller.
export function matchTier(text, q) {
  if (!text || !q) return null;
  const t = text.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  return null;
}

const bestTier = (...tiers) => {
  const real = tiers.filter((t) => t !== null);
  return real.length ? Math.min(...real) : null;
};

const rankAndTrim = (entries, limit) =>
  entries
    .filter((e) => e.tier !== null)
    .sort((a, b) => a.tier - b.tier || a.index - b.index) // tier first, then stable catalog order
    .slice(0, limit)
    .map((e) => e.item);

const DEFAULT_LIMITS = { gameLimit: 6, providerLimit: 4, categoryLimit: 6 };

// Groups: Games (title match only), Categories (label or id match, so "new"
// still finds "New Releases"). No Providers group — see FINAL QA's
// PROVIDERS section: "no provider grouping in search... preserve future
// provider architecture privately". `providers` is always returned empty
// (shape-compatible with every existing consumer/`hasAnyResults` check)
// rather than removed from the return value, so nothing downstream needs
// an "is this field present" branch; SEARCH_PROVIDERS itself, and the
// matching logic below, stay intact and unused for when real provider
// inventory exists — see the disabled "Providers" category entry in
// lib/casinoCategories.js for the matching Lobby-side decision. Each list
// is independently tiered and trimmed — there is no cross-group
// interleaving (see the task's own grouped-display requirement). Dedup is
// structural: each source list (ALL_GAMES, SEARCH_CATEGORIES) already has
// unique keys, so no explicit de-duplication pass is needed.
export function searchCasino(rawQuery, limits = {}) {
  const { gameLimit, categoryLimit } = { ...DEFAULT_LIMITS, ...limits };
  const q = (rawQuery ?? "").trim().toLowerCase();
  if (!q) return { games: [], providers: [], categories: [], query: "" };

  const games = rankAndTrim(
    ALL_GAMES.map((item, index) => ({ item, index, tier: matchTier(item.title, q) })),
    gameLimit
  );
  const categories = rankAndTrim(
    SEARCH_CATEGORIES.map((item, index) => ({ item, index, tier: bestTier(matchTier(item.label, q), matchTier(item.id, q)) })),
    categoryLimit
  );

  return { games, providers: [], categories, query: q };
}

export const hasAnyResults = (groups) => groups.games.length > 0 || groups.providers.length > 0 || groups.categories.length > 0;
