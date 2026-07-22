// SX Bet REST client + odds math + market→event grouping. Pure, non-React,
// fully unit-testable (see sxbet.test.js) — the React hook (web3/useSxBet.js)
// only wires these into effects/state.
//
// SX Bet is an order book: each market has maker "orders" quoting a price. A
// bettor (taker) FILLS the best maker order on the side they want. Everything
// here reads the public API — no key, no wallet.
import { sxbet } from "@shared/chains";

export const SX_API_BASE = sxbet.api;

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

// Fold a flat list of SX markets (+ their orders) into events. A market is
// dropped unless at least one outcome has live odds, so the UI never renders a
// priceless odds button. Returns the intermediate "sx game" shape that
// sportsModel.normalizeSxGame() maps into the shared SportsEvent model.
export function buildSxEvents(markets, ordersByHash) {
  const byEvent = new Map();
  for (const m of markets) {
    if (!SX_SPORT_TO_MVP[m.sportId]) continue;
    const orders = ordersByHash.get(m.marketHash) ?? [];
    const one = bestTakerOdds(orders, true);
    const two = bestTakerOdds(orders, false);
    if (!one && !two) continue;

    const baseToken = (one?.order ?? two?.order)?.baseToken;
    const outcomes = [];
    if (one) outcomes.push(sxOutcome(m, 1, m.outcomeOneName, one, baseToken));
    if (two) outcomes.push(sxOutcome(m, 2, m.outcomeTwoName, two, baseToken));
    const meta = deriveMarketMeta(m);
    const market = { marketHash: m.marketHash, type: m.type, line: m.line, baseToken, ...meta, outcomes, raw: m };

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
    ev.markets.sort((a, b) => (MARKET_GROUP_RANK[a.group] ?? 9) - (MARKET_GROUP_RANK[b.group] ?? 9));
  }
  return [...byEvent.values()].filter((e) => e.markets.length);
}

function sxOutcome(m, side, name, best, baseToken) {
  return {
    side,
    name,
    odds: best.odds,
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
export async function fetchSxOrderBook(base = SX_API_BASE) {
  const orders = (await getJson(`${base}/orders`).then((d) => d?.data ?? []).catch(() => [])) ?? [];
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
export async function fetchSxMarketsByHash(hashes, base = SX_API_BASE) {
  const chunks = [];
  for (let i = 0; i < hashes.length; i += 25) chunks.push(hashes.slice(i, i + 25));
  const results = await Promise.all(
    chunks.map((c) =>
      getJson(`${base}/markets/find?marketHashes=${c.join(",")}`)
        .then((d) => d?.data ?? [])
        .catch(() => [])
    )
  );
  return results.flat();
}

// One-shot: live orders → the markets they price → folded into events.
export async function loadSxEvents({ base = SX_API_BASE } = {}) {
  const ordersByHash = await fetchSxOrderBook(base);
  const hashes = [...ordersByHash.keys()];
  if (!hashes.length) return [];
  const markets = await fetchSxMarketsByHash(hashes, base);
  return buildSxEvents(markets, ordersByHash);
}

// GET /metadata — signing addresses (rotated per env, read at runtime).
export async function fetchSxMetadata(base = SX_API_BASE) {
  const d = await getJson(`${base}/metadata`);
  return d?.data ?? d;
}
