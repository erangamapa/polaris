import { LayoutGrid, Sparkles, Flame, Rocket, Radio, Tv, Cherry, Spade, Building2, Star, History } from "lucide-react";

// Casino taxonomy — the one shared source every Casino navigation surface
// (in-page CategoryNav, Sidebar/mobile menu, Casino search's category and
// provider results, Casino Home row destinations, route parsing) derives
// from instead of keeping an independent list. Kept as plain data with no
// ALL_GAMES import — CasinoCatalog.jsx (which owns ALL_GAMES) imports FROM
// this file, so pulling live game data in here would create a cycle; any
// consumer that needs a live count (game totals, provider counts) computes
// it locally against ALL_GAMES using the ids/kinds defined here.

// Sidebar/CategoryNav entries that get their own tag-filtered page (title +
// chips + grid) instead of the multi-row Lobby dashboard. "Slots" has no
// games in this catalog yet — its route still works for a direct link, but
// it's deliberately excluded from CASINO_CATEGORIES below (see "Do not
// render unsupported or empty categories"). "Table Games" doesn't exist in
// this catalog's tag system at all — it has no CATEGORY_META entry, so it
// never gets a route (see the disabled placeholder in ALL_CASINO_CATEGORIES
// below, which documents it as a real-but-unsupported destination rather
// than omitting it silently).
export const CATEGORY_META = {
  Popular: { tag: "popular", description: "What players are choosing most right now." },
  New: { tag: "new", description: "Just added to the lobby." },
  "Live Casino": { tag: "live-casino", description: "Real-format, live-style games." },
  "Game Shows": { tag: "game-shows", description: "TV-style games with big multipliers." },
  Slots: { tag: "slots", description: "Reel games." },
};

// Display label for a category id where it differs from the routing/
// sidebar id ("New" stays the URL slug; every place that shows it as text
// reads "New Releases"). "Originals" reads as the customer-facing "Tribet
// Originals" everywhere (nav pill, sidebar item, search result, Lobby rail
// heading) — see CasinoCatalog.jsx's LobbyDashboard, which no longer
// hardcodes this text itself, so no surface can drift out of sync.
const CATEGORY_LABEL_OVERRIDE = { New: "New Releases", Originals: "Tribet Originals" };

// THE one shared Casino category-navigation config, now enriched with the
// fields every navigation surface needs (icon, visibility per-surface,
// order) so the Sidebar/mobile menu can derive its "Games" section from the
// exact same array the top category pills and search already use — no
// second hand-rolled list (see RESTORE AND REBUILD THE CASINO SIDEBAR:
// "Do not define category arrays independently in sidebar/mobile menu/
// category pills/search/routing/Lobby").
//
// `enabled` is the one flag that governs whether a category is offered as a
// destination ANYWHERE (top pills, sidebar, search, Lobby row) — Slots and
// Table Games are both `enabled: false` because neither has real inventory
// today (confirmed against BETSWIRL_GAMES/PROVIDER_GAMES — no game anywhere
// carries a "slots" or "table-games" tag). This is a hide-when-genuinely-
// unsupported decision, not a silent omission: both entries stay fully
// modeled here (id/label/icon/order) so re-enabling either is a one-field
// flip once real inventory exists, not a rebuild.
//
// `showAsLobbyRow` is independent of `enabled`/`showInSidebar` — the Lobby
// row order is curated (see the prior Lobby-correction task), while
// sidebar/pill/search visibility is persistent navigation. A category can
// in principle be sidebar-visible without a Lobby row (not used today, but
// modeled so the two concerns never get silently conflated).
//
// `sectionId` is the stable DOM id of that category's actual Lobby section
// (see CasinoCatalog.jsx's LobbyDashboard/ProviderTiles, which render
// `id={sectionId}` on the matching <section>) — only set when
// `showAsLobbyRow` is true, since a category with no real Lobby row has no
// DOM element to point at (setting one anyway would invite a dead scroll
// target). This is what CategoryNav's pill-click scroll-spy (see
// lib/casinoLobbyScroll.js) uses to jump to the right section without a
// second hardcoded id map.
const ALL_CASINO_CATEGORIES = [
  { id: "Lobby", label: "Lobby", kind: "lobby", icon: LayoutGrid, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: false, order: 0 },
  { id: "Originals", label: CATEGORY_LABEL_OVERRIDE.Originals, kind: "rail", railTarget: "originals-rail", sectionId: "casino-section-originals", icon: Sparkles, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 1 },
  { id: "Popular", label: "Popular", kind: "routed", sectionId: "casino-section-popular", icon: Flame, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 2 },
  { id: "New", label: CATEGORY_LABEL_OVERRIDE.New, kind: "routed", sectionId: "casino-section-new-releases", icon: Rocket, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 3 },
  { id: "Slots", label: "Slots", kind: "routed", icon: Cherry, enabled: false, showInSidebar: false, showInTopNav: false, showAsLobbyRow: false, order: 4 },
  { id: "Live Casino", label: "Live Casino", kind: "routed", sectionId: "casino-section-live-casino", icon: Radio, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 5 },
  { id: "Game Shows", label: "Game Shows", kind: "routed", sectionId: "casino-section-game-shows", icon: Tv, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 6 },
  { id: "Table Games", label: "Table Games", kind: "unsupported", icon: Spade, enabled: false, showInSidebar: false, showInTopNav: false, showAsLobbyRow: false, order: 7 },
  // FINAL QA fix: there is no real, multi-provider inventory yet — this
  // app's "two providers" are really just its own onchain games (Tribet
  // Originals) vs. its own vendored demo games (Tribet Studio), not
  // distinct third parties worth a dedicated browsing destination (see
  // FINAL QA's own PROVIDERS section: "no visible Providers row... no
  // provider pill... no provider grouping in search... preserve future
  // provider architecture privately"). Disabled the same way Slots/Table
  // Games already are — code (ProviderTiles, CASINO_PROVIDERS,
  // SEARCH_PROVIDERS) stays intact for when real provider inventory
  // exists, it just isn't offered anywhere active right now.
  { id: "Providers", label: "Providers", kind: "rail", railTarget: "providers-rail", sectionId: "casino-section-providers", icon: Building2, enabled: false, showInSidebar: false, showInTopNav: false, showAsLobbyRow: false, order: 8 },
].sort((a, b) => a.order - b.order);

// Nav-visible categories only — every enabled entry, in order. This is what
// CategoryNav, the Sidebar's Games section, and casinoSearch.js's
// SEARCH_CATEGORIES all render from.
export const CASINO_CATEGORIES = ALL_CASINO_CATEGORIES.filter((c) => c.enabled);

// Label lookup built from the FULL list (not just enabled entries) so a
// disabled category (Slots' own CategoryPage title, reachable by direct
// link) still resolves its correct display label even though it's absent
// from CASINO_CATEGORIES itself.
export const CATEGORY_LABEL = Object.fromEntries(ALL_CASINO_CATEGORIES.map((c) => [c.id, c.label]));

// Routed category ids that have a real CATEGORY_META page — independent of
// `enabled`, so a disabled-but-routable category (Slots) keeps working for
// a direct/bookmarked link even though it's never offered as a destination
// anywhere (see ALL_CASINO_CATEGORIES' own comment). "Table Games" is
// `kind: "unsupported"`, never "routed" — it has no CATEGORY_META entry and
// no route at all, so it can never appear here.
export const ROUTED_CATEGORIES = Object.keys(CATEGORY_META);

// The two real game studios in this catalog — not a generic mixed rail
// mislabeled "Providers" (see CasinoCatalog.jsx's gameProviderName, which
// this mirrors 1:1 via `kind`: onchain games are BetSwirl, provider games
// are TriBet Studio, exactly two studios, never eleven invented ones). No
// dedicated provider page exists (see ProviderGame.jsx) so each provider's
// real destination is its own Lobby rail — BetSwirl's is the always-shown
// Originals rail; TriBet Studio's is its own dedicated games rail. `kind`
// lets any consumer compute a real, non-fabricated game count against
// ALL_GAMES without this module needing to import game data itself.
export const CASINO_PROVIDERS = [
  { id: "betswirl", name: "BetSwirl", kind: "onchain", railTarget: "originals-rail" },
  { id: "tribet-studio", name: "TriBet Studio", kind: "provider", railTarget: "tribet-studio-rail" },
];

// Personal/utility destinations — NOT Casino content categories (they don't
// filter games by tag), so they live in their own shared config rather than
// inside CASINO_CATEGORIES, per this task's own "Personal destinations may
// live in a separate shared configuration if they are not true Casino
// categories." Never offered as top-pill/search-category results (matches
// the pre-existing Favorites precedent — it was never a CategoryNav pill or
// a search category either), only as Sidebar/mobile-menu destinations.
//
// `kind: "route"` means selecting it sets casinoCategory to `id` (the same
// mechanism Favorites already used). `kind: "action"` means the actual
// handler is an App-level closure (opening a dialog, not changing the
// route) — the shared config only carries the static id/label/icon; App.jsx
// attaches the real `action`/`count` per item, same as it already did for
// Favorites' count before this task.
export const CASINO_PERSONAL_DESTINATIONS = [
  { id: "Favorites", label: "Favorites", icon: Star, kind: "route" },
  { id: "Recently Played", label: "Recently Played", icon: History, kind: "route" },
];

// Not imported from lib/casinoLobbyScroll.js's identical check — that file
// already imports CASINO_CATEGORIES from here, so importing back would
// create a cycle (see this file's own top-of-file note on why ALL_GAMES
// isn't imported here for the same reason).
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Scrolls the Lobby to a rail rather than opening a dedicated page — the
// real, working destination for "Originals"/"Providers" category selections
// and for individual provider results (see CASINO_CATEGORIES/CASINO_PROVIDERS
// above). Exported so the in-page nav bar, Casino search's category and
// provider results, the Sidebar's Games section, and the Lobby's own
// provider tiles all share one implementation instead of several.
export function scrollToRail(railTestId) {
  requestAnimationFrame(() => {
    document.querySelector(`[data-test-id="${railTestId}"]`)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  });
}

// The one shared "what happens when this category is chosen" behavior for
// destinations OTHER than the Lobby pill bar — routed categories (and
// Lobby) change casinoCategory (opening that category's standalone page);
// rail-only categories instead ensure Lobby is showing and scroll to that
// rail. Used by Casino search's category results and the Sidebar/mobile
// menu's Games section (both of which intentionally open a full
// destination, not scroll-in-place — see PILL NAVIGATION CONSISTENCY:
// "Sidebar items = open category destination... Search result
// destinations" must not change). CategoryNav's pill bar no longer uses
// this — every pill now scrolls the Lobby to its section instead (see
// lib/casinoLobbyScroll.js's activateLobbyPill), which is a deliberately
// different interaction model scoped specifically to the Lobby pills.
export function activateCasinoCategory(category, onSelectCategory) {
  if (category.kind === "rail") {
    onSelectCategory?.("Lobby");
    scrollToRail(category.railTarget);
    return;
  }
  onSelectCategory?.(category.id);
}
