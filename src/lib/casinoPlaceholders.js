import { toast } from "@/lib/toast";

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
export const PLACEHOLDER_CLICK_MESSAGE = "It's not a real game, you fool!";
export const PLACEHOLDER_ARIA_LABEL = "Placeholder game. UI testing only.";

// SCROLL/OVERFLOW TESTING PASS — one centralised target rather than
// per-category magic numbers scattered across components. Every rail is
// capped at an 8-item page (see CasinoCatalog.jsx's RAIL_PAGE_SIZE) with
// Load More revealing the next page — so "enough to overflow" now means
// "comfortably more than 8," not a viewport-width pixel calculation like
// this constant used before the rails became a fixed grid. 24 gives every
// applicable rail at least two full Load More clicks to exercise (8 -> 16
// -> 24) regardless of how few real games that category actually has, and
// this flag is dev/testing-only (off by default, opt-in via the Dev
// Panel — see devMock.js) — a deliberately generous wall of fake cards is
// exactly the point here, not something a real visitor ever sees.
export const PLACEHOLDER_TARGET_TOTAL = 24;

// Same purpose as PLACEHOLDER_TITLE/BADGE above, for the Providers rail's
// own overflow testing (see CasinoCatalog.jsx's ProviderTiles) — realistic,
// recognizable studio names rather than a generic "PLACEHOLDER PROVIDER"
// label, since the whole point is to see how a long, real-looking provider
// list scrolls/wraps. Order is fixed (not shuffled) so repeated renders and
// screenshots stay stable, matching this module's existing determinism
// rule for games.
export const PLACEHOLDER_PROVIDER_NAMES = [
  "Pragmatic Play", "Evolution", "Hacksaw Gaming", "Nolimit City", "Push Gaming",
  "Play'n GO", "Relax Gaming", "ELK Studios", "Thunderkick", "BGaming",
  "Spribe", "NetEnt", "Red Tiger", "Microgaming", "Quickspin",
  "Yggdrasil", "Blueprint", "AvatarUX", "Spinomenal", "RubyPlay",
  "Endorphina", "Amusnet", "Games Global", "Playtech",
];
export const PLACEHOLDER_PROVIDER_CLICK_MESSAGE = "It's not a real provider, you fool!";

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

// Slugifies a realistic studio name into a stable id fragment ("Play'n GO"
// -> "play-n-go") — good enough for a dev-only fixture id, not a general
// slugify utility.
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Placeholder PROVIDERS for the Providers rail's own overflow/scroll test
// (see ProviderTiles in CasinoCatalog.jsx) — deliberately separate from
// createPlaceholderGames above: these never join CASINO_PROVIDERS, never
// get a real `/casino/provider/{slug}` page, and never carry real games —
// clicking one shows a toast (see notifyPlaceholderProviderClicked below),
// the same "never navigates" contract PlaceholderGameCard already
// established. No existingCount/targetTotal knobs (unlike
// createPlaceholderGames) — there's no "real provider count" to top up
// against here, the caller always appends this whole fixed list after the
// real providers.
export function createPlaceholderProviders() {
  return PLACEHOLDER_PROVIDER_NAMES.map((name) => ({
    id: `placeholder-provider:${slug(name)}`,
    name,
    isPlaceholder: true,
  }));
}

// Shared across every placeholder tile on the page (not per-card state) so
// rapid clicks — even across different cards — never stack more than one
// of this exact message at once: dismissing whichever instance is still
// showing before adding the next one, rather than relying on the toast
// store's own MAX cap to silently absorb duplicates. Never calls track() —
// placeholder interactions are intentionally excluded from production
// analytics, not reported as a real game launch under a dev-only label.
let activeToastId = null;
export function notifyPlaceholderClicked() {
  if (activeToastId != null) toast.dismiss(activeToastId);
  activeToastId = toast.info(PLACEHOLDER_CLICK_MESSAGE);
}

// Same coalescing behavior as notifyPlaceholderClicked above, for a
// placeholder PROVIDER tile — shares the one activeToastId so a stray
// game-placeholder toast and a provider-placeholder toast can never stack
// either.
export function notifyPlaceholderProviderClicked() {
  if (activeToastId != null) toast.dismiss(activeToastId);
  activeToastId = toast.info(PLACEHOLDER_PROVIDER_CLICK_MESSAGE);
}
