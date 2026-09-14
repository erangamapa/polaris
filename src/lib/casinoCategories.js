import { LayoutGrid, Flame, Rocket, Cherry, Sparkles, Spade, Ticket, Gem, Building2, Heart, History } from "lucide-react";

// Casino taxonomy — the one shared source every Casino navigation surface
// (in-page CategoryNav, Sidebar/mobile menu, Casino search's category and
// provider results, Casino Home row destinations, route parsing) derives
// from instead of keeping an independent list. Kept as plain data with no
// ALL_GAMES import — CasinoCatalog.jsx (which owns ALL_GAMES) imports FROM
// this file, so pulling live game data in here would create a cycle; any
// consumer that needs a live count (game totals, provider counts) computes
// it locally against ALL_GAMES using the ids/kinds defined here.

// BGAMING-ONLY REWORK — this taxonomy used to be built around 6 in-house
// on-chain "originals" plus a Live Casino/Game Shows pair those same 6
// games' hardcoded tags fed (see git history for the removed "Originals"
// category and its BETSWIRL_GAMES-derived tags). BGaming ships no
// live-dealer or game-show titles at all, so both went to zero the moment
// the originals were removed and are deleted here, not left empty. Every
// category below is instead keyed to a real BGaming genre (see
// lib/catalog/normalize.js's tagsFor, which maps genre -> tag) or an
// explicit curation (Popular — see lib/catalog/adapters/bgaming.popular.js;
// New — the existing released-date mechanism, unchanged).
export const CATEGORY_META = {
  Popular: { tag: "popular", description: "Hand-picked across the catalog — not a play-count metric." },
  New: { tag: "new", description: "Just added to the lobby." },
  Slots: { tag: "slots", description: "Reel games." },
  Casual: { tag: "casual", description: "Quick, casual-format games." },
  "Table Games": { tag: "table-games", description: "Roulette, cards and dice games." },
  Scratch: { tag: "scratch", description: "Scratch cards and lottery-style games." },
  Exclusive: { tag: "exclusive", description: "Exclusive titles, not available everywhere." },
};

// Display label for a category id where it differs from the routing/
// sidebar id ("New" stays the URL slug; every place that shows it as text
// reads "New Releases").
const CATEGORY_LABEL_OVERRIDE = { New: "New Releases" };

// THE one shared Casino category-navigation config, now enriched with the
// fields every navigation surface needs (icon, visibility per-surface,
// order) so the Sidebar/mobile menu can derive its "Games" section from the
// exact same array the top category pills and search already use — no
// second hand-rolled list (see RESTORE AND REBUILD THE CASINO SIDEBAR:
// "Do not define category arrays independently in sidebar/mobile menu/
// category pills/search/routing/Lobby").
//
// `enabled` is the one flag that governs whether a category is offered as a
// destination ANYWHERE (top pills, sidebar, search, Lobby row). Providers
// is the one `enabled: false` entry — with the 12 placeholder provider
// games removed, BGaming is the only real source left, and it carries no
// `providerId` (see ProviderGame.jsx), so the Providers rail/page would
// show zero real content today. Kept fully modeled (id/label/icon/order) so
// re-enabling it is a one-field flip once a second real provider is wired
// in with a real `providerId`, not a rebuild.
//
// `showAsLobbyRow` is independent of `enabled`/`showInSidebar` — the Lobby
// row order is curated, while sidebar/pill/search visibility is persistent
// navigation. A category can in principle be sidebar-visible without a
// Lobby row (not used today, but modeled so the two concerns never get
// silently conflated).
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
  { id: "Popular", label: "Popular", kind: "routed", sectionId: "casino-section-popular", icon: Flame, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 1 },
  { id: "New", label: CATEGORY_LABEL_OVERRIDE.New, kind: "routed", sectionId: "casino-section-new-releases", icon: Rocket, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 2 },
  { id: "Slots", label: "Slots", kind: "routed", sectionId: "casino-section-slots", icon: Cherry, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 3 },
  { id: "Casual", label: "Casual", kind: "routed", sectionId: "casino-section-casual", icon: Sparkles, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 4 },
  { id: "Table Games", label: "Table Games", kind: "routed", sectionId: "casino-section-table-games", icon: Spade, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 5 },
  { id: "Scratch", label: "Scratch", kind: "routed", sectionId: "casino-section-scratch", icon: Ticket, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 6 },
  { id: "Exclusive", label: "Exclusive", kind: "routed", sectionId: "casino-section-exclusive", icon: Gem, enabled: true, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 7 },
  { id: "Providers", label: "Providers", kind: "rail", railTarget: "providers-rail", sectionId: "casino-section-providers", icon: Building2, enabled: false, showInSidebar: true, showInTopNav: true, showAsLobbyRow: true, order: 8 },
].sort((a, b) => a.order - b.order);

// Nav-visible categories only — every enabled entry, in order. This is what
// CategoryNav, the Sidebar's Games section, and casinoSearch.js's
// SEARCH_CATEGORIES all render from.
export const CASINO_CATEGORIES = ALL_CASINO_CATEGORIES.filter((c) => c.enabled);

// Label lookup built from the FULL list (not just enabled entries) so a
// disabled category (Providers) still resolves its correct display label
// even though it's absent from CASINO_CATEGORIES itself.
export const CATEGORY_LABEL = Object.fromEntries(ALL_CASINO_CATEGORIES.map((c) => [c.id, c.label]));

// Routed category ids that have a real CATEGORY_META page — independent of
// `enabled`, so a disabled-but-routable category keeps working for a
// direct/bookmarked link even though it's never offered as a destination
// anywhere.
export const ROUTED_CATEGORIES = Object.keys(CATEGORY_META);

// With the 12 placeholder provider games removed, BGaming is the only
// content source and it carries no `providerId` (see ProviderGame.jsx's
// own comment) — so there is nothing real to list here. Kept as an empty
// array, not deleted, since ProviderGame.jsx/CasinoCatalog.jsx/
// casinoSearch.js all structurally depend on this export existing (see
// Providers' `enabled: false` above for the reasoning).
export const CASINO_PROVIDERS = [];

// Personal/utility destinations — NOT Casino content categories (they don't
// filter games by tag), so they live in their own shared config rather than
// inside CASINO_CATEGORIES. Never offered as top-pill/search-category
// results, only as Sidebar/mobile-menu destinations.
//
// `kind: "route"` means selecting it sets casinoCategory to `id` (the same
// mechanism Favorites already used). `kind: "action"` means the actual
// handler is an App-level closure (opening a dialog, not changing the
// route) — the shared config only carries the static id/label/icon; App.jsx
// attaches the real `action`/`count` per item.
export const CASINO_PERSONAL_DESTINATIONS = [
  { id: "Favorites", label: "Favorites", icon: Heart, kind: "route" },
  { id: "Recently Played", label: "Recently Played", icon: History, kind: "route" },
];

// Not imported from lib/casinoLobbyScroll.js's identical check — that file
// already imports CASINO_CATEGORIES from here, so importing back would
// create a cycle (see this file's own top-of-file note on why ALL_GAMES
// isn't imported here for the same reason).
const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Scrolls the Lobby to a rail rather than opening a dedicated page — the
// real, working destination for a "Providers" category selection and for
// individual provider results (see CASINO_CATEGORIES/CASINO_PROVIDERS
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
// destination, not scroll-in-place). CategoryNav's pill bar no longer uses
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
