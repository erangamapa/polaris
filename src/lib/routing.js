// Lightweight URL <-> state sync (no router dependency).
// Paths: /casino/:category · /predictions/:section · /sports/:sport
import { CATEGORIES } from "@/lib/mockData";
import { PRED_CATEGORIES } from "@/lib/predictionsData";
import { SPORTS } from "@/lib/sportsData";

const slug = (s) => s.toLowerCase().replace(/\s+/g, "-");

export const DEFAULT_NAV = {
  product: "casino",
  casinoCategory: "Lobby",
  predSection: "Trending",
  sportId: "soccer",
};

export function parsePath(pathname) {
  const [p, sec] = pathname.replace(/^\/+/, "").split("/");
  if (p === "casino") {
    return { ...DEFAULT_NAV, product: "casino", casinoCategory: CATEGORIES.find((c) => slug(c) === sec) ?? "Lobby" };
  }
  if (p === "predictions") {
    const opts = [...PRED_CATEGORIES, "My Positions"];
    return { ...DEFAULT_NAV, product: "predictions", predSection: opts.find((o) => slug(o) === sec) ?? "Trending" };
  }
  if (p === "sports") {
    return { ...DEFAULT_NAV, product: "sports", sportId: SPORTS.find((s) => s.id === sec)?.id ?? "soccer" };
  }
  return { ...DEFAULT_NAV };
}

export function pathFor({ product, casinoCategory, predSection, sportId }) {
  if (product === "predictions") return `/predictions/${slug(predSection)}`;
  if (product === "sports") return `/sports/${sportId}`;
  return `/casino/${slug(casinoCategory)}`;
}
