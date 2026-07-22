import { describe, it, expect } from "vitest";
import {
  takerDecimalOdds,
  takerImpliedOdds,
  bestTakerOdds,
  deriveMarketMeta,
  buildSxEvents,
  loadSxEvents,
  ODDS_SCALE,
} from "./sxbet";
import { normalizeSxGame } from "./sportsModel";
import { primaryMarket, teamQuickMarkets } from "../components/sports/eventTemplates";

// A maker order helper (percentageOdds in 1e20 units).
const order = (percentageOdds, isMakerBettingOutcomeOne, size = "1000000000") => ({
  percentageOdds,
  isMakerBettingOutcomeOne,
  totalBetSize: size,
  baseToken: "0xUSDC",
  marketHash: "0xmh",
});

describe("odds math", () => {
  it("taker decimal = 1e20 / (1e20 - percentageOdds)", () => {
    // maker implied 0.5 -> taker implied 0.5 -> decimal 2.0
    expect(takerDecimalOdds((ODDS_SCALE / 2n).toString())).toBeCloseTo(2.0, 6);
    // maker implied 0.372 -> taker decimal 1.594 (matches live sample)
    expect(takerDecimalOdds("37250000000000000000")).toBeCloseTo(1.5936, 3);
  });

  it("taker implied odds = 1e20 - percentageOdds", () => {
    expect(takerImpliedOdds("37250000000000000000")).toBe("62750000000000000000");
  });

  it("rejects degenerate odds (0 or >= 1e20)", () => {
    expect(takerDecimalOdds("0")).toBeNull();
    expect(takerDecimalOdds(ODDS_SCALE.toString())).toBeNull();
  });
});

describe("bestTakerOdds", () => {
  it("backing outcome one fills makers betting outcome two, best price wins", () => {
    const orders = [
      order("40000000000000000000", false), // taker one -> 1.667
      order("37250000000000000000", false), // taker one -> 1.594  (worse)
      order("52375000000000000000", true), // maker one -> taker two, ignored
    ];
    const best = bestTakerOdds(orders, true);
    expect(best.odds).toBeCloseTo(1.667, 2);
    expect(best.order.percentageOdds).toBe("40000000000000000000");
  });

  it("skips zero-size orders and returns null when no side matches", () => {
    expect(bestTakerOdds([order("50000000000000000000", true, "0")], true)).toBeNull();
    expect(bestTakerOdds([], false)).toBeNull();
  });
});

describe("deriveMarketMeta", () => {
  it("classifies totals, handicaps and moneyline from outcome labels", () => {
    expect(deriveMarketMeta({ outcomeOneName: "Over 2.5", line: 2.5 })).toEqual({ name: "Total 2.5", group: "totals" });
    expect(deriveMarketMeta({ outcomeOneName: "Levski -1.5", line: -1.5 })).toEqual({ name: "Handicap -1.5", group: "handicap" });
    expect(deriveMarketMeta({ outcomeOneName: "Levski Sofia" })).toEqual({ name: "Match Winner", group: "main" });
  });
});

describe("buildSxEvents + normalizeSxGame", () => {
  const market = {
    marketHash: "0xmh",
    sportId: 5,
    sportLabel: "Soccer",
    leagueLabel: "Champions League",
    teamOneName: "Levski Sofia",
    teamTwoName: "CS U Craiova",
    outcomeOneName: "Levski Sofia",
    outcomeTwoName: "CS U Craiova",
    gameTime: Math.floor(Date.now() / 1000) + 3600,
    sportXeventId: "EVT1",
    type: 52,
  };
  const ordersByHash = new Map([
    ["0xmh", [order("40000000000000000000", false), order("52375000000000000000", true)]],
  ]);

  it("folds markets with live odds into an event carrying the fill descriptor", () => {
    const events = buildSxEvents([market], ordersByHash);
    expect(events).toHaveLength(1);
    const [ev] = events;
    expect(ev.teamOne).toBe("Levski Sofia");
    expect(ev.markets[0].outcomes).toHaveLength(2);
    const o1 = ev.markets[0].outcomes[0];
    expect(o1.fill.isTakerBettingOutcomeOne).toBe(true);
    expect(o1.fill.desiredOdds).toBe("60000000000000000000"); // 1e20 - 4e19
  });

  it("drops an event whose markets are all unpriced", () => {
    expect(buildSxEvents([market], new Map())).toHaveLength(0);
  });

  it("keeps unpriced markets (disabled) when the event has a bettable market", () => {
    const total = { ...market, marketHash: "0xmh2", outcomeOneName: "Over 2.5", outcomeTwoName: "Under 2.5", type: 28, line: 2.5 };
    const [ev] = buildSxEvents([market, total], ordersByHash); // orders only exist for 0xmh
    expect(ev.markets).toHaveLength(2);
    const priced = ev.markets.find((m) => m.marketHash === "0xmh");
    const unpriced = ev.markets.find((m) => m.marketHash === "0xmh2");
    expect(priced.priced).toBe(true);
    expect(unpriced.priced).toBe(false);
    expect(unpriced.outcomes).toHaveLength(2);
    expect(unpriced.outcomes.every((o) => o.odds === null && !o.priced && o.fill === null)).toBe(true);
    expect(ev.markets[0].marketHash).toBe("0xmh"); // priced markets sort first
  });

  it("normalizes an unpriced market to a suspended, non-bettable market", () => {
    const total = { ...market, marketHash: "0xmh2", outcomeOneName: "Over 2.5", outcomeTwoName: "Under 2.5", type: 28, line: 2.5 };
    const norm = normalizeSxGame(buildSxEvents([market, total], ordersByHash)[0]);
    const m = norm.markets.find((x) => x.id === "sxm-0xmh2");
    expect(m.status).toBe("suspended");
    expect(m.outcomes.every((o) => o.odds === null && o.status === "suspended" && o.raw === null)).toBe(true);
  });

  it("normalizes into the shared SportsEvent model with provider source", () => {
    const [ev] = buildSxEvents([market], ordersByHash);
    const norm = normalizeSxGame(ev);
    expect(norm.source).toBe("provider");
    expect(norm.sport.id).toBe("soccer");
    expect(norm.id).toBe("sx-EVT1");
    expect(norm.markets[0].outcomes[0].raw.marketHash).toBe("0xmh");
    expect(norm.markets[0].outcomes[0].odds).toBeGreaterThan(1);
  });

  it("drops sports outside the MVP whitelist", () => {
    expect(normalizeSxGame({ sportId: 2, markets: [] })).toBeNull(); // Hockey
  });

  it("never hides a started game — future=upcoming, started+live=live, started=upcoming", () => {
    const now = Math.floor(Date.now() / 1000);
    const [game] = buildSxEvents([market], ordersByHash);
    expect(normalizeSxGame({ ...game, startsAt: now + 3600 }).status).toBe("upcoming");
    expect(normalizeSxGame({ ...game, startsAt: now - 3600, liveEnabled: true }).status).toBe("live");
    expect(normalizeSxGame({ ...game, startsAt: now - 3600, liveEnabled: false }).status).toBe("upcoming");
  });

  it("SX 'Match Winner' is recognized as the primary/moneyline market", () => {
    const norm = normalizeSxGame(buildSxEvents([market], ordersByHash)[0]);
    expect(primaryMarket(norm)?.name).toBe("Match Winner");
    expect(teamQuickMarkets(norm).moneyline?.name).toBe("Match Winner");
  });
});

// Live smoke test against the real Toronto testnet — guarded so it never runs
// in CI. Run manually with: SX_LIVE=1 npx vitest run sxbet
describe.runIf(process.env.SX_LIVE)("live SX Toronto testnet", () => {
  it("loads real events with priced outcomes", async () => {
    // Node has no same-origin proxy — hit the SX API directly here.
    const games = await loadSxEvents({ base: "https://api.toronto.sx.bet" });
    expect(games.length).toBeGreaterThan(0);
    const normalized = games.map(normalizeSxGame).filter(Boolean);
    expect(normalized.length).toBeGreaterThan(0);
    const withOdds = normalized.flatMap((e) => e.markets.flatMap((m) => m.outcomes)).filter((o) => o.odds > 1);
    expect(withOdds.length).toBeGreaterThan(0);
    const totalMarkets = normalized.reduce((s, e) => s + e.markets.length, 0);
    const maxMarkets = Math.max(...normalized.map((e) => e.markets.length));
    // Full catalogue means far more total markets than priced ones.
    expect(totalMarkets).toBeGreaterThan(withOdds.length);
    // eslint-disable-next-line no-console
    console.log(`live: ${normalized.length} events, ${totalMarkets} total markets (max ${maxMarkets}/event), ${withOdds.length} priced outcomes`);
  }, 30_000);
});
