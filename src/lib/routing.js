// Lightweight URL <-> state sync (no router dependency).
// Paths:
//   /casino/lobby                     — Lobby dashboard (rails)
//   /casino/lobby/:category            — CHIP/"home" filter view (promo+chips retained, grid replaces rails)
//   /casino/category/:category         — destination view (hero+search+filter+sort+grid, no promo/chips)
//   /casino/favorites | /casino/recently-played
//   /casino/collection/provider        — providers index
//   /casino/provider/:slug             — single provider page
//   /predictions/:section
//   /sports/home | /sports/live | /sports/my-bets | /sports/dev
//   /sports/:sport
//   /sports/:sport/:country/:league
//   /sports/:sport/event/:eventId
import { ROUTED_CATEGORIES, CASINO_PROVIDERS } from "@/lib/casinoCategories";
import { PRED_CATEGORIES } from "@/lib/predictionsData";
import { MVP_SPORT_IDS } from "@/lib/sportsModel";

// TAG_CATEGORIES — every category the two-route split (spec §4.1) applies
// to: the 5 content-tag categories a "home"/"category" URL pair can exist
// for. "Originals" has no CATEGORY_META entry (it's sourced straight from
// the onchain game list, not a `tags` filter — see CasinoCatalog.jsx's
// LobbyDashboard), so it's listed here explicitly rather than derived from
// ROUTED_CATEGORIES alone.
const TAG_CATEGORIES = ["Originals", ...ROUTED_CATEGORIES];

const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");

export const DEFAULT_NAV = {
  product: "casino",
  casinoCategory: "Lobby",
  // TWO-ROUTE SPLIT (spec §4.1): "dashboard" is the default multi-rail
  // Lobby; "home" is the chip-driven in-lobby filter (promo+chips kept,
  // grid replaces rails); "category" is the standalone destination (hero+
  // filter+sort+grid, no promo/chips). "providers"/"provider" are the new
  // provider-route family (spec §6.2) — kept as a separate view rather than
  // overloading casinoCategory, since a provider isn't a content category.
  casinoView: "dashboard",
  casinoProviderSlug: null,
  predSection: "Trending",
  sportsView: "home",
  sportsSport: null,
  sportsCountry: null,
  sportsLeague: null,
  sportsEventId: null,
};

const SPORTS_DEFAULTS = {
  sportsView: "home",
  sportsSport: null,
  sportsCountry: null,
  sportsLeague: null,
  sportsEventId: null,
};

function parseSportsPath(rest) {
  const [seg1, seg2, seg3] = rest;
  if (!seg1 || seg1 === "home") return { ...SPORTS_DEFAULTS, sportsView: "home" };
  if (seg1 === "live") return { ...SPORTS_DEFAULTS, sportsView: "live" };
  if (seg1 === "my-bets") return { ...SPORTS_DEFAULTS, sportsView: "my-bets" };
  if (seg1 === "dev") return { ...SPORTS_DEFAULTS, sportsView: "dev" };

  // Anything not on the 5-sport MVP whitelist (see sportsModel.js) falls
  // back to Sports Home rather than crashing on an unknown route segment —
  // "invalid routes show a useful fallback."
  const sport = MVP_SPORT_IDS.includes(seg1) ? seg1 : null;
  if (!sport) return { ...SPORTS_DEFAULTS, sportsView: "home" };

  if (seg2 === "event" && seg3) return { ...SPORTS_DEFAULTS, sportsView: "event", sportsSport: sport, sportsEventId: seg3 };
  if (seg2 && seg3) return { ...SPORTS_DEFAULTS, sportsView: "league", sportsSport: sport, sportsCountry: seg2, sportsLeague: seg3 };
  return { ...SPORTS_DEFAULTS, sportsView: "sport", sportsSport: sport };
}

function parseCasinoPath(rest) {
  const [seg1, seg2] = rest;

  // /casino/collection/provider — providers index (spec §6.2 surface 3).
  if (seg1 === "collection" && seg2 === "provider") {
    return { casinoCategory: "Lobby", casinoView: "providers", casinoProviderSlug: null };
  }
  // /casino/provider/:slug — a single provider page (spec §6.2 surface 4).
  if (seg1 === "provider" && seg2) {
    const provider = CASINO_PROVIDERS.find((p) => p.id === seg2);
    return provider
      ? { casinoCategory: "Lobby", casinoView: "provider", casinoProviderSlug: provider.id }
      : { casinoCategory: "Lobby", casinoView: "dashboard", casinoProviderSlug: null };
  }
  // /casino/category/:category — the destination view (spec §4.1).
  if (seg1 === "category" && seg2) {
    const category = TAG_CATEGORIES.find((c) => slug(c) === seg2);
    return category
      ? { casinoCategory: category, casinoView: "category", casinoProviderSlug: null }
      : { casinoCategory: "Lobby", casinoView: "dashboard", casinoProviderSlug: null };
  }
  // /casino/lobby/:category — the chip-driven "home" filter view (spec
  // §4.1); bare /casino/lobby (no seg2) is just the ordinary dashboard.
  if (seg1 === "lobby" && seg2) {
    const category = TAG_CATEGORIES.find((c) => slug(c) === seg2);
    return category
      ? { casinoCategory: category, casinoView: "home", casinoProviderSlug: null }
      : { casinoCategory: "Lobby", casinoView: "dashboard", casinoProviderSlug: null };
  }
  // /casino/favorites, /casino/recently-played, /casino/lobby, unknown -> Lobby
  const personal = ["Favorites", "Recently Played"].find((c) => slug(c) === seg1);
  return { casinoCategory: personal ?? "Lobby", casinoView: "dashboard", casinoProviderSlug: null };
}

export function parsePath(pathname) {
  const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  const [p, ...rest] = parts;
  if (p === "casino") {
    return { ...DEFAULT_NAV, product: "casino", ...parseCasinoPath(rest) };
  }
  if (p === "predictions") {
    const opts = [...PRED_CATEGORIES, "My Positions"];
    return { ...DEFAULT_NAV, product: "predictions", predSection: opts.find((o) => slug(o) === rest[0]) ?? "Trending" };
  }
  if (p === "sports") {
    return { ...DEFAULT_NAV, product: "sports", ...parseSportsPath(rest) };
  }
  return { ...DEFAULT_NAV };
}

function pathForSports({ sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId }) {
  if (sportsView === "live") return "/sports/live";
  if (sportsView === "my-bets") return "/sports/my-bets";
  if (sportsView === "dev") return "/sports/dev";
  if (sportsView === "event" && sportsSport && sportsEventId) return `/sports/${sportsSport}/event/${sportsEventId}`;
  if (sportsView === "league" && sportsSport && sportsCountry && sportsLeague) return `/sports/${sportsSport}/${sportsCountry}/${sportsLeague}`;
  if (sportsView === "sport" && sportsSport) return `/sports/${sportsSport}`;
  return "/sports/home";
}

function pathForCasino({ casinoCategory, casinoView, casinoProviderSlug }) {
  if (casinoView === "providers") return "/casino/collection/provider";
  if (casinoView === "provider" && casinoProviderSlug) return `/casino/provider/${casinoProviderSlug}`;
  if (casinoView === "category" && TAG_CATEGORIES.includes(casinoCategory)) return `/casino/category/${slug(casinoCategory)}`;
  if (casinoView === "home" && TAG_CATEGORIES.includes(casinoCategory)) return `/casino/lobby/${slug(casinoCategory)}`;
  if (casinoCategory === "Favorites") return "/casino/favorites";
  if (casinoCategory === "Recently Played") return "/casino/recently-played";
  return "/casino/lobby";
}

export function pathFor({ product, casinoCategory, casinoView, casinoProviderSlug, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId }) {
  if (product === "predictions") return `/predictions/${slug(predSection)}`;
  if (product === "sports") return pathForSports({ sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId });
  return pathForCasino({ casinoCategory, casinoView, casinoProviderSlug });
}
