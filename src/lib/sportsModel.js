// Normalized Sports UI data model — the single shape every presentation
// component consumes, regardless of whether an event came from the real
// Azuro provider feed or curated placeholder inventory. See
// docs/architecture/25-sports-taxonomy-and-ia.md for the source taxonomy
// this maps from (Azuro: Sport → Country → League → Game → Condition →
// Outcome; our mock: sport → region → league → event).
//
// Nothing downstream of normalizeMockEvent()/normalizeAzuroGame() should
// ever touch a raw provider or mock field directly — that's the whole
// point of normalizing at the boundary.
//
// Shapes (JSDoc — this repo is plain JS, not TypeScript):
//
// SportsEventSource = "provider" | "mock"
// SportsEventStatus = "live" | "upcoming" | "started" | "suspended"
//   | "finished" | "postponed" | "cancelled"
//
// SportRef      = { id, slug, name, templateFamily, icon }
// CountryRef    = { slug, name }
// LeagueRef     = { id?, slug, name }
// Participant   = { id?, name, shortName?, image? }
// SportsOutcome = { id, name, odds, status?, raw? }
// SportsMarket  = { id, name, group, outcomes: SportsOutcome[], status?, raw? }
// SportsEvent   = {
//   id, source, sport, country, league, participants: Participant[],
//   startsAt, status, score?, period?, clock?, markets: SportsMarket[],
//   featured?, livePriority?, competitionPriority?, raw?,
// }

// ── Five-sport MVP whitelist ────────────────────────────────────────────
// Stable regardless of provider coverage — a sport never disappears from
// navigation because activeGamesCount is 0 today (see INVENTORY STABILITY).
// `templateFamily` selects which of the three event-layout families (see
// eventTemplates.js) renders this sport's rows/detail page.
export const MVP_SPORTS = [
  { id: "soccer", slug: "soccer", name: "Soccer", icon: "⚽", templateFamily: "soccer" },
  { id: "tennis", slug: "tennis", name: "Tennis", icon: "🎾", templateFamily: "tennis" },
  { id: "basketball", slug: "basketball", name: "Basketball", icon: "🏀", templateFamily: "team" },
  { id: "baseball", slug: "baseball", name: "Baseball", icon: "⚾", templateFamily: "team" },
  { id: "american-football", slug: "american-football", name: "American Football", icon: "🏈", templateFamily: "team" },
];
export const MVP_SPORT_IDS = MVP_SPORTS.map((s) => s.id);
export const sportById = (id) => MVP_SPORTS.find((s) => s.id === id);

// ── Country/league fallbacks ────────────────────────────────────────────
// Never render a null/undefined heading — see COUNTRY AND LEAGUE FALLBACKS.
export const INTERNATIONAL = { slug: "international", name: "International" };
export const OTHER_COUNTRY = { slug: "other", name: "Other" };

export function slugify(s) {
  return String(s ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function normalizeCountry(rawName) {
  if (!rawName) return OTHER_COUNTRY;
  const name = String(rawName).trim();
  if (/^(international|world|global)$/i.test(name)) return INTERNATIONAL;
  return { slug: slugify(name), name };
}

export function normalizeLeague(rawName, id) {
  if (!rawName) return { id, slug: "other", name: "Other" };
  const name = String(rawName).trim();
  return { id, slug: slugify(name), name };
}

// ── Status ───────────────────────────────────────────────────────────────
const VALID_STATUS = new Set(["live", "upcoming", "started", "suspended", "finished", "postponed", "cancelled"]);
export function normalizeStatus(s) {
  return VALID_STATUS.has(s) ? s : "upcoming";
}

// ── Mock event -> normalized SportsEvent ────────────────────────────────
// Mirrors the field mapping table in docs/architecture/25-sports-taxonomy-and-ia.md
// §6, just applied to our own mock shape instead of Azuro's directly.
export function normalizeMockEvent(raw) {
  const sport = sportById(raw.sport);
  if (!sport) return null;
  const status = raw.live ? "live" : "upcoming";
  return {
    id: raw.id,
    source: "mock",
    sport: { id: sport.id, slug: sport.slug, name: sport.name, templateFamily: sport.templateFamily, icon: sport.icon },
    country: normalizeCountry(raw.region),
    league: normalizeLeague(raw.league),
    participants: [
      { name: raw.home, shortName: raw.home },
      { name: raw.away, shortName: raw.away },
    ],
    startsAt: raw.startsAt ?? null,
    status,
    score: raw.score,
    period: raw.period,
    clock: raw.clock,
    timeLabel: raw.time,
    markets: (raw.markets ?? []).map((m) => normalizeMockMarket(m)),
    featured: !!raw.featured,
    competitionPriority: raw.competitionPriority ?? 50,
    raw,
  };
}

function normalizeMockMarket(m) {
  return {
    id: m.key,
    name: m.name,
    group: m.group,
    type: m.type,
    line: m.line,
    status: "active",
    outcomes: m.outcomes.map((o) => ({ id: `${m.key}:${o.pick}`, name: o.label, odds: o.odds, status: "active", pick: o.pick })),
    raw: m,
  };
}

// ── Azuro provider game -> normalized SportsEvent ───────────────────────
// `game` is the shape returned by useBettableGames() in web3/useAzuro.js
// (extended to also request country/participants — see that file). Keeps
// `raw` references all the way down so AzuroBetSlip's existing
// { game, market, outcome } contract can be reconstructed unchanged for
// the real transaction flow — normalizing for display never touches the
// real bet-placement path.
export function normalizeAzuroGame(game) {
  const sportSlug = (game.sport?.slug ?? game.sport?.name ?? "").toLowerCase();
  const sport = MVP_SPORTS.find((s) => s.slug === sportSlug || s.name.toLowerCase() === sportSlug);
  if (!sport) return null; // outside the 5-sport MVP whitelist — never shown

  const now = Math.floor(Date.now() / 1000);
  // The current feed query doesn't expose live score/period/clock — only
  // startsAt and whether the relayer will still accept a bet. Rather than
  // fabricate a live clock for a real event, a started-but-not-confirmed-
  // finished game is labelled "started", not "live" (see README/limitations).
  const status = game.bettable ? "upcoming" : Number(game.startsAt) <= now ? "started" : "upcoming";

  const participants = (game.participants ?? []).map((p) => ({ name: p.name, shortName: p.name, image: p.image }));
  const [home, away] = participants.length >= 2 ? participants : [{ name: game.title?.split(" – ")[0] ?? game.title }, { name: game.title?.split(" – ")[1] ?? "" }];

  return {
    id: `azuro-${game.gameId}`,
    source: "provider",
    sport: { id: sport.id, slug: sport.slug, name: sport.name, templateFamily: sport.templateFamily, icon: sport.icon },
    country: normalizeCountry(game.country?.name),
    league: normalizeLeague(game.league?.name),
    participants: [home, away],
    startsAt: game.startsAt ? new Date(Number(game.startsAt) * 1000).toISOString() : null,
    status,
    markets: (game.markets ?? []).map((c) => normalizeAzuroCondition(c)),
    featured: false,
    competitionPriority: 50,
    raw: game,
  };
}

function normalizeAzuroCondition(condition) {
  return {
    id: `condition-${condition.conditionId}`,
    name: condition.title ?? "Market",
    group: "main", // refined by the market-grouping layer, see eventTemplates.js
    status: condition.state === "Active" ? "active" : "suspended",
    outcomes: (condition.outcomes ?? []).map((o) => ({
      id: `outcome-${o.outcomeId}`,
      name: o.title,
      odds: Number(o.odds),
      status: "active",
      raw: o,
    })),
    raw: condition,
  };
}

// ── Ranking (Sports Home / sport landing "top matches") ─────────────────
// A separate, replaceable layer — never baked into card components. See
// SPORTS HOME INVENTORY RANKING. Testnet/placeholder inventory has no real
// turnover to rank by, so the priority order collapses to:
// live > manual featured > starting soon > competition priority > stable id order.
export function rankEvents(events) {
  return [...events].sort((a, b) => {
    const liveA = a.status === "live" ? 1 : 0;
    const liveB = b.status === "live" ? 1 : 0;
    if (liveA !== liveB) return liveB - liveA;
    const featA = a.featured ? 1 : 0;
    const featB = b.featured ? 1 : 0;
    if (featA !== featB) return featB - featA;
    const startA = a.startsAt ? Date.parse(a.startsAt) : Infinity;
    const startB = b.startsAt ? Date.parse(b.startsAt) : Infinity;
    if (startA !== startB) return startA - startB;
    const cpA = a.competitionPriority ?? 50;
    const cpB = b.competitionPriority ?? 50;
    if (cpA !== cpB) return cpB - cpA;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function groupByCountryLeague(events) {
  const map = new Map();
  for (const e of events) {
    const key = `${e.country.slug}::${e.league.slug}`;
    if (!map.has(key)) map.set(key, { country: e.country, league: e.league, events: [] });
    map.get(key).events.push(e);
  }
  return [...map.values()];
}
