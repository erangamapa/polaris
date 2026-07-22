// SX Bet REST client + odds math + market→event grouping. Pure, non-React,
// fully unit-testable (see sxbet.test.js) — the React hook (web3/useSxBet.js)
// only wires these into effects/state.
//
// SX Bet is an order book: each market has maker "orders" quoting a price. A
// bettor (taker) FILLS the best maker order on the side they want. Everything
// here reads the public API — no key, no wallet.
import { sxbet } from "@shared/chains";

// Browser calls go through our own same-origin proxy (api/sx.js) — SX's API
// sends no Access-Control-Allow-Origin header, so a direct fetch from the app
// is blocked by CORS. Server-side callers (tests, the proxy itself) pass an
// absolute `base` to hit SX directly.
export const SX_PROXY_BASE = "/api/sx";

// Build a URL for an SX endpoint. With `base` (absolute) → hit SX directly.
// Without → go through the same-origin proxy as /api/sx?endpoint=<path>&...
export function sxUrl(endpoint, params = {}, base) {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""));
  if (base) {
    const qs = new URLSearchParams(clean).toString();
    return `${base}/${endpoint}${qs ? `?${qs}` : ""}`;
  }
  const qs = new URLSearchParams({ endpoint, ...clean }).toString();
  return `${SX_PROXY_BASE}?${qs}`;
}

// SX sportId → our five-sport MVP slug. Anything else is dropped from the UI
// (never shown as "Other"), matching the Azuro provider's whitelist behaviour.
export const SX_SPORT_TO_MVP = {
  1: "basketball",
  3: "baseball",
  5: "soccer",
  6: "tennis",
  8: "american-football",
};
export const SX_MVP_SPORT_IDS = Object.keys(SX_SPORT_TO_MVP).map(Number);

// percentageOdds is the MAKER's implied probability in fixed-point 1e20 units.
// The TAKER who fills that order receives the complementary side:
//   takerDecimalOdds = 1e20 / (1e20 - percentageOdds)
// and the taker-side implied odds (what SX's fill wants as `desiredOdds`) is
//   1e20 - percentageOdds.
export const ODDS_SCALE = 10n ** 20n;

export function takerDecimalOdds(percentageOdds) {
  const po = BigInt(percentageOdds);
  if (po <= 0n || po >= ODDS_SCALE) return null;
  // Number() on ~1e20 loses no meaningful precision for a display ratio.
  return Number(ODDS_SCALE) / Number(ODDS_SCALE - po);
}

// Taker-side implied odds in 1e20 units — passed straight to the fill as the
// worst acceptable price (before oddsSlippage is applied).
export function takerImpliedOdds(percentageOdds) {
  return (ODDS_SCALE - BigInt(percentageOdds)).toString();
}

// Best price a taker can get on one side of a market.
// A taker backs outcome ONE by filling orders where the MAKER is betting
// outcome two (isMakerBettingOutcomeOne === false), and vice-versa. Returns the
// single best (highest-odds) order with non-zero remaining size, or null.
export function bestTakerOdds(orders, backOutcomeOne) {
  let best = null;
  for (const o of orders) {
    const takerBacksOne = !o.isMakerBettingOutcomeOne;
    if (takerBacksOne !== backOutcomeOne) continue;
    if (BigInt(o.totalBetSize ?? "0") <= 0n) continue;
    const dec = takerDecimalOdds(o.percentageOdds);
    if (dec == null) continue;
    if (best == null || dec > best.odds) best = { odds: dec, order: o };
  }
  return best;
}

// Human market name + grouping derived from the outcome labels (SX's numeric
// `type` isn't a stable enum across sports; the labels always are). The names
// are chosen so eventTemplates.classifyMarket() buckets them correctly.
export function deriveMarketMeta(m) {
  const o1 = String(m.outcomeOneName ?? "");
  if (/^over/i.test(o1) || /^under/i.test(o1)) {
    return { name: `Total ${m.line ?? ""}`.trim(), group: "totals" };
  }
  if (/[+-]\d/.test(o1)) {
    const sign = Number(m.line) > 0 ? "+" : "";
    return { name: `Handicap ${sign}${m.line ?? ""}`.trim(), group: "handicap" };
  }
  return { name: "Match Winner", group: "main" };
}

const MARKET_GROUP_RANK = { main: 0, handicap: 1, totals: 2, other: 3 };
const DEFAULT_BASE_TOKEN = sxbet.betToken.address;
// Cap markets shown per event — futures/outright "vs The Field" events can
// carry 100+ mostly-unpriced markets; keep the page sane (priced ones first).
const MAX_MARKETS_PER_EVENT = 40;

// Fold a flat list of SX markets (+ the live order book) into events. Every
// market is kept — priced markets are bettable, unpriced markets render with
// disabled odds buttons (full-catalogue view) — so an event shows its whole
// market list, not just the one or two lines a maker happened to quote.
// Returns the intermediate "sx game" shape that sportsModel.normalizeSxGame()
// maps into the shared SportsEvent model.
export function buildSxEvents(markets, ordersByHash) {
  const byEvent = new Map();
  for (const m of markets) {
    if (!SX_SPORT_TO_MVP[m.sportId]) continue;
    if (!m.outcomeOneName || !m.outcomeTwoName) continue; // skip malformed/1-way

    const orders = ordersByHash.get(m.marketHash) ?? [];
    const one = bestTakerOdds(orders, true);
    const two = bestTakerOdds(orders, false);
    const baseToken = (one?.order ?? two?.order)?.baseToken ?? DEFAULT_BASE_TOKEN;
    const outcomes = [
      sxOutcome(m, 1, m.outcomeOneName, one, baseToken),
      sxOutcome(m, 2, m.outcomeTwoName, two, baseToken),
    ];
    const priced = !!(one || two);
    const meta = deriveMarketMeta(m);
    const market = { marketHash: m.marketHash, type: m.type, line: m.line, baseToken, priced, ...meta, outcomes, raw: m };

    const id = m.sportXeventId;
    if (!byEvent.has(id)) {
      byEvent.set(id, {
        eventId: id,
        sportId: m.sportId,
        sportLabel: m.sportLabel,
        leagueLabel: m.leagueLabel,
        teamOne: m.teamOneName,
        teamTwo: m.teamTwoName,
        startsAt: m.gameTime,
        liveEnabled: !!m.liveEnabled,
        markets: [],
        raw: m,
      });
    }
    byEvent.get(id).markets.push(market);
  }

  for (const ev of byEvent.values()) {
    // Priced (bettable) markets first, then by group; cap to keep it readable.
    ev.markets.sort(
      (a, b) => Number(b.priced) - Number(a.priced) || (MARKET_GROUP_RANK[a.group] ?? 9) - (MARKET_GROUP_RANK[b.group] ?? 9),
    );
    ev.markets = ev.markets.slice(0, MAX_MARKETS_PER_EVENT);
  }
  // Only surface events that have at least one bettable market.
  return [...byEvent.values()].filter((e) => e.markets.some((m) => m.priced));
}

// One outcome. If `best` is null the outcome is unpriced — kept for display
// (so the market shows its full line) but not bettable: no fill descriptor.
function sxOutcome(m, side, name, best, baseToken) {
  if (!best) return { side, name, odds: null, priced: false, fill: null };
  return {
    side,
    name,
    odds: best.odds,
    priced: true,
    // Everything the fill needs to reconstruct this exact bet later.
    fill: {
      marketHash: m.marketHash,
      baseToken,
      isTakerBettingOutcomeOne: side === 1,
      percentageOdds: best.order.percentageOdds,
      desiredOdds: takerImpliedOdds(best.order.percentageOdds),
    },
  };
}

// ── Network I/O ──────────────────────────────────────────────────────────

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SX API ${res.status}`);
  return res.json();
}

// The live order book, keyed by market hash. This is the source of truth for
// "what's actually bettable" — a market with no open orders has no price, so we
// drive discovery off the orders rather than the (much larger, mostly
// unpriced) active-markets catalogue. `GET /orders` returns the active orders
// (one page is ample inventory for the MVP).
export async function fetchSxOrderBook(base) {
  const orders = (await getJson(sxUrl("orders", {}, base)).then((d) => d?.data ?? []).catch(() => [])) ?? [];
  const map = new Map();
  for (const o of orders) {
    if (!map.has(o.marketHash)) map.set(o.marketHash, []);
    map.get(o.marketHash).push(o);
  }
  return map;
}

// Resolve exact market hashes to their full details. `/markets/find` is the
// only endpoint that filters by hash (`/markets/active` ignores the filter).
// Chunked to keep the URL length sane.
export async function fetchSxMarketsByHash(hashes, base) {
  const chunks = [];
  for (let i = 0; i < hashes.length; i += 25) chunks.push(hashes.slice(i, i + 25));
  const results = await Promise.all(
    chunks.map((c) =>
      getJson(sxUrl("markets/find", { marketHashes: c.join(",") }, base))
        .then((d) => d?.data ?? [])
        .catch(() => [])
    )
  );
  return results.flat();
}

// All markets for one event (its full catalogue, priced or not).
export async function fetchSxEventMarkets(eventId, base) {
  return getJson(sxUrl("markets/active", { eventId }, base))
    .then((d) => d?.data?.markets ?? [])
    .catch(() => []);
}

const MAX_EVENTS = 40; // bound the per-event catalogue fan-out

// One-shot pipeline: the live order book tells us which events are active; for
// each we pull the full market catalogue so the UI shows every market (priced
// = bettable, unpriced = disabled), not just the lines a maker quoted.
export async function loadSxEvents({ base } = {}) {
  const ordersByHash = await fetchSxOrderBook(base);
  const pricedHashes = [...ordersByHash.keys()];
  if (!pricedHashes.length) return [];

  const pricedMarkets = await fetchSxMarketsByHash(pricedHashes, base);
  const eventIds = [...new Set(pricedMarkets.map((m) => m.sportXeventId).filter(Boolean))].slice(0, MAX_EVENTS);

  const catalogues = await Promise.all(eventIds.map((id) => fetchSxEventMarkets(id, base)));

  // Dedupe by hash; fall back to the priced markets themselves if a catalogue
  // call came back empty, so a bettable market is never lost.
  const byHash = new Map();
  for (const m of [...catalogues.flat(), ...pricedMarkets]) {
    if (m?.marketHash && !byHash.has(m.marketHash)) byHash.set(m.marketHash, m);
  }
  return buildSxEvents([...byHash.values()], ordersByHash);
}

// GET /metadata — signing addresses (rotated per env, read at runtime).
export async function fetchSxMetadata(base) {
  const d = await getJson(sxUrl("metadata", {}, base));
  return d?.data ?? d;
}
