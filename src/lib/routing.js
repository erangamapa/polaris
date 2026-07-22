// Lightweight URL <-> state sync (no router dependency).
// Paths:
//   /casino/:category
//   /predictions/:section
//   /sports/home | /sports/live | /sports/my-bets | /sports/dev
//   /sports/:sport
//   /sports/:sport/:country/:league
//   /sports/:sport/event/:eventId
import { ROUTED_CATEGORIES } from "@/lib/casinoCategories";
import { PRED_CATEGORIES } from "@/lib/predictionsData";
import { MVP_SPORT_IDS } from "@/lib/sportsModel";

// Every casinoCategory value routing.js accepts from a URL — the shared
// taxonomy's ROUTED_CATEGORIES (Popular/New/Live Casino/Game Shows/Slots,
// see lib/casinoCategories.js) plus the three destinations that aren't
// content-tag categories at all: Lobby (the default), and Favorites/
// Recently Played (personal destinations — see CASINO_PERSONAL_DESTINATIONS
// in that same module). Previously validated against a separate, stale
// `CATEGORIES` array in lib/mockData.js that had drifted out of sync with
// the real taxonomy (missing "Recently Played" entirely, still listing
// "Favorites" but not deriving from the same source) — this is the one
// place route validity is decided now, matching every other Casino
// navigation surface's "no independent category array" rule.
const VALID_CASINO_CATEGORIES = ["Lobby", "Favorites", "Recently Played", ...ROUTED_CATEGORIES];

const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");

export const DEFAULT_NAV = {
  product: "casino",
  casinoCategory: "Lobby",
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

export function parsePath(pathname) {
  const parts = pathname.replace(/^\/+/, "").split("/").filter(Boolean);
  const [p, ...rest] = parts;
  if (p === "casino") {
    return { ...DEFAULT_NAV, product: "casino", casinoCategory: VALID_CASINO_CATEGORIES.find((c) => slug(c) === rest[0]) ?? "Lobby" };
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

export function pathFor({ product, casinoCategory, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId }) {
  if (product === "predictions") return `/predictions/${slug(predSection)}`;
  if (product === "sports") return pathForSports({ sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId });
  return `/casino/${slug(casinoCategory)}`;
}
