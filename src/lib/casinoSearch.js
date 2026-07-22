// Casino-only search: a normalized, static index over the same catalog the
// Lobby rails already render (see CasinoCatalog.jsx), plus deterministic
// ranking and grouping. No network, no fuzzy-search dependency — the whole
// catalog is small and already in memory, so a plain tiered string match is
// both correct and fast enough to run on every keystroke.
import { ALL_GAMES, CASINO_CATEGORIES } from "@/components/casino/CasinoCatalog";

// `railTarget` is a Lobby rail's data-test-id — there's no dedicated
// provider page (see ProviderGame.jsx / CasinoCatalog.jsx), so selecting a
// provider result is a real, working destination (scroll the Lobby to that
// rail) rather than a dead link or an invented page.
export const SEARCH_PROVIDERS = [
  { id: "betswirl", name: "BetSwirl", count: ALL_GAMES.filter((g) => g.kind === "onchain").length, railTarget: "originals-rail" },
  { id: "tribet-studio", name: "TriBet Studio", count: ALL_GAMES.filter((g) => g.kind === "provider").length, railTarget: "providers-rail" },
];

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

// Groups: Games (title match only — a game doesn't surface here just
// because its provider matches; that's what the Providers group is for),
// Providers (name match), Categories (label or id match, so "new" still
// finds "New Releases"). Each list is independently tiered and trimmed —
// there is no cross-group interleaving (see the task's own grouped-display
// requirement). Dedup is structural: each source list (ALL_GAMES,
// SEARCH_PROVIDERS, SEARCH_CATEGORIES) already has unique keys, so no
// explicit de-duplication pass is needed.
export function searchCasino(rawQuery, limits = {}) {
  const { gameLimit, providerLimit, categoryLimit } = { ...DEFAULT_LIMITS, ...limits };
  const q = (rawQuery ?? "").trim().toLowerCase();
  if (!q) return { games: [], providers: [], categories: [], query: "" };

  const games = rankAndTrim(
    ALL_GAMES.map((item, index) => ({ item, index, tier: matchTier(item.title, q) })),
    gameLimit
  );
  const providers = rankAndTrim(
    SEARCH_PROVIDERS.map((item, index) => ({ item, index, tier: matchTier(item.name, q) })),
    providerLimit
  );
  const categories = rankAndTrim(
    SEARCH_CATEGORIES.map((item, index) => ({ item, index, tier: bestTier(matchTier(item.label, q), matchTier(item.id, q)) })),
    categoryLimit
  );

  return { games, providers, categories, query: q };
}

export const hasAnyResults = (groups) => groups.games.length > 0 || groups.providers.length > 0 || groups.categories.length > 0;
