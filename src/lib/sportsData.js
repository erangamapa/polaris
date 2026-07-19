// Curated placeholder/demo sports inventory — five MVP sports, several
// markets per event, deterministic settlement (Stake-faithful: won / lost /
// void-returns-stake). This is ONE of the two controlled data sources (see
// src/lib/sportsDemo.js) — every event here is fully mocked end to end
// (mock event + mock markets + mock odds), never mixed with real provider
// data. Raw authoring shape here; src/lib/sportsModel.js's
// normalizeMockEvent() is what presentation components actually consume.
import { MVP_SPORTS } from "./sportsModel";

export const SPORTS = MVP_SPORTS;

// outcome: { label, odds, pick }  · pick codes: H/D/A (result), O/U (totals),
// HH/AH (handicap home/away), Y/N (both teams to score)
const O = (label, odds, pick) => ({ label, odds, pick });
const M = (key, group, name, type, line, outcomes) => ({ key, group, name, type, line, outcomes });

// Fixture times are generated relative to "now" so Today/Tomorrow grouping
// is always sensible regardless of when this runs, instead of hardcoding
// dates that go stale.
const HOUR = 3600_000;
const at = (hoursFromNow) => new Date(Date.now() + hoursFromNow * HOUR).toISOString();

const E = (o) => ({ ...o });

export const EVENTS = [
  // ---------- SOCCER ----------
  E({
    id: "s1", sport: "soccer", region: "England", league: "Premier League",
    home: "Arsenal", away: "Chelsea", live: true, clock: "63'", score: [1, 1],
    startsAt: at(-1), finalScore: [2, 1], featured: true, competitionPriority: 90,
    markets: [
      M("s1-1x2", "Popular", "Match Result", "1x2", null, [O("Arsenal", 2.10, "H"), O("Draw", 3.40, "D"), O("Chelsea", 3.25, "A")]),
      M("s1-ou25", "Popular", "Total Goals — Over/Under 2.5", "ou", 2.5, [O("Over 2.5", 1.90, "O"), O("Under 2.5", 1.90, "U")]),
      M("s1-ou3", "Totals", "Total Goals — Over/Under 3", "ou", 3, [O("Over 3", 2.30, "O"), O("Under 3", 1.60, "U")]),
      M("s1-ah", "Handicap", "Handicap", "ah", -1.5, [O("Arsenal −1.5", 2.75, "HH"), O("Chelsea +1.5", 1.44, "AH")]),
      M("s1-btts", "Goals", "Both Teams To Score", "btts", null, [O("Yes", 1.72, "Y"), O("No", 2.05, "N")]),
    ],
  }),
  E({
    id: "s2", sport: "soccer", region: "England", league: "Premier League",
    home: "Man City", away: "Liverpool", live: false, startsAt: at(28), finalScore: [1, 1], competitionPriority: 90,
    markets: [
      M("s2-1x2", "Popular", "Match Result", "1x2", null, [O("Man City", 1.95, "H"), O("Draw", 3.70, "D"), O("Liverpool", 3.80, "A")]),
      M("s2-ou25", "Popular", "Total Goals — Over/Under 2.5", "ou", 2.5, [O("Over 2.5", 1.80, "O"), O("Under 2.5", 2.00, "U")]),
      M("s2-ah", "Handicap", "Handicap", "ah", -0.5, [O("Man City −0.5", 1.95, "HH"), O("Liverpool +0.5", 1.85, "AH")]),
      M("s2-btts", "Goals", "Both Teams To Score", "btts", null, [O("Yes", 1.66, "Y"), O("No", 2.15, "N")]),
    ],
  }),
  E({
    id: "s3", sport: "soccer", region: "Spain", league: "LaLiga",
    home: "Real Madrid", away: "Barcelona", live: false, startsAt: at(52), finalScore: [2, 2], competitionPriority: 88,
    markets: [
      M("s3-1x2", "Popular", "Match Result", "1x2", null, [O("Real Madrid", 2.45, "H"), O("Draw", 3.50, "D"), O("Barcelona", 2.70, "A")]),
      M("s3-ou3", "Popular", "Total Goals — Over/Under 3", "ou", 3, [O("Over 3", 2.10, "O"), O("Under 3", 1.72, "U")]),
      M("s3-btts", "Goals", "Both Teams To Score", "btts", null, [O("Yes", 1.50, "Y"), O("No", 2.50, "N")]),
    ],
  }),
  E({
    id: "s4", sport: "soccer", region: "International", league: "Champions League",
    home: "Bayern Munich", away: "Inter Milan", live: false, startsAt: at(4), finalScore: [3, 1], featured: true, competitionPriority: 95,
    markets: [
      M("s4-1x2", "Popular", "Match Result", "1x2", null, [O("Bayern Munich", 1.65, "H"), O("Draw", 4.10, "D"), O("Inter Milan", 4.80, "A")]),
      M("s4-ou25", "Popular", "Total Goals — Over/Under 2.5", "ou", 2.5, [O("Over 2.5", 1.75, "O"), O("Under 2.5", 2.05, "U")]),
    ],
  }),

  // ---------- BASKETBALL (no draw) ----------
  E({
    id: "b1", sport: "basketball", region: "USA", league: "NBA",
    home: "Lakers", away: "Celtics", live: true, clock: "Q3 04:12", score: [78, 81],
    startsAt: at(-1.5), finalScore: [104, 108], featured: true, competitionPriority: 92,
    markets: [
      M("b1-ml", "Popular", "Moneyline", "ml", null, [O("Lakers", 2.05, "H"), O("Celtics", 1.80, "A")]),
      M("b1-ou", "Popular", "Total Points — Over/Under 210.5", "ou", 210.5, [O("Over 210.5", 1.90, "O"), O("Under 210.5", 1.90, "U")]),
      M("b1-ah", "Handicap", "Spread ±5.5", "ah", -5.5, [O("Lakers −5.5", 1.95, "HH"), O("Celtics +5.5", 1.85, "AH")]),
    ],
  }),
  E({
    id: "b2", sport: "basketball", region: "USA", league: "NBA",
    home: "Warriors", away: "Nuggets", live: false, startsAt: at(6), finalScore: [120, 115], competitionPriority: 92,
    markets: [
      M("b2-ml", "Popular", "Moneyline", "ml", null, [O("Warriors", 1.72, "H"), O("Nuggets", 2.15, "A")]),
      M("b2-ou", "Popular", "Total Points — Over/Under 229.5", "ou", 229.5, [O("Over 229.5", 1.90, "O"), O("Under 229.5", 1.90, "U")]),
      M("b2-ah", "Handicap", "Spread ±3.5", "ah", -3.5, [O("Warriors −3.5", 1.90, "HH"), O("Nuggets +3.5", 1.90, "AH")]),
    ],
  }),

  // ---------- TENNIS ----------
  E({
    id: "t1", sport: "tennis", region: "International", league: "ATP Masters",
    home: "Alcaraz", away: "Sinner", live: true, clock: "Set 2", score: [1, 0],
    startsAt: at(-0.5), finalScore: [2, 1], featured: true, competitionPriority: 85,
    markets: [
      M("t1-ml", "Popular", "Match Winner", "ml", null, [O("Alcaraz", 1.85, "H"), O("Sinner", 1.95, "A")]),
      M("t1-ou", "Popular", "Total Games — Over/Under 22.5", "ou", 22.5, [O("Over 22.5", 1.90, "O"), O("Under 22.5", 1.90, "U")]),
    ],
  }),
  E({
    id: "t2", sport: "tennis", region: "International", league: "ATP Masters",
    home: "Djokovic", away: "Medvedev", live: false, startsAt: at(20), finalScore: [2, 0], competitionPriority: 85,
    markets: [
      M("t2-ml", "Popular", "Match Winner", "ml", null, [O("Djokovic", 1.65, "H"), O("Medvedev", 2.25, "A")]),
      M("t2-ou", "Popular", "Total Sets — Over/Under 2.5", "ou", 2.5, [O("Over 2.5", 2.10, "O"), O("Under 2.5", 1.70, "U")]),
    ],
  }),
  E({
    id: "t3", sport: "tennis", region: "USA", league: "WTA 1000",
    home: "Swiatek", away: "Gauff", live: false, startsAt: at(30), finalScore: [2, 1], competitionPriority: 80,
    markets: [
      M("t3-ml", "Popular", "Match Winner", "ml", null, [O("Swiatek", 1.55, "H"), O("Gauff", 2.55, "A")]),
    ],
  }),

  // ---------- BASEBALL ----------
  E({
    id: "ba1", sport: "baseball", region: "USA", league: "MLB",
    home: "Yankees", away: "Red Sox", live: true, clock: "Top 6th", score: [3, 2],
    startsAt: at(-2), finalScore: [5, 4], featured: true, competitionPriority: 82,
    markets: [
      M("ba1-ml", "Popular", "Moneyline", "ml", null, [O("Yankees", 1.75, "H"), O("Red Sox", 2.10, "A")]),
      M("ba1-rl", "Handicap", "Run Line ±1.5", "ah", -1.5, [O("Yankees −1.5", 2.20, "HH"), O("Red Sox +1.5", 1.68, "AH")]),
      M("ba1-ou", "Popular", "Total Runs — Over/Under 8.5", "ou", 8.5, [O("Over 8.5", 1.90, "O"), O("Under 8.5", 1.90, "U")]),
    ],
  }),
  E({
    id: "ba2", sport: "baseball", region: "USA", league: "MLB",
    home: "Dodgers", away: "Giants", live: false, startsAt: at(9), finalScore: [4, 3], competitionPriority: 82,
    markets: [
      M("ba2-ml", "Popular", "Moneyline", "ml", null, [O("Dodgers", 1.55, "H"), O("Giants", 2.50, "A")]),
      M("ba2-rl", "Handicap", "Run Line ±1.5", "ah", -1.5, [O("Dodgers −1.5", 1.95, "HH"), O("Giants +1.5", 1.85, "AH")]),
      M("ba2-ou", "Popular", "Total Runs — Over/Under 7.5", "ou", 7.5, [O("Over 7.5", 1.85, "O"), O("Under 7.5", 1.95, "U")]),
    ],
  }),

  // ---------- AMERICAN FOOTBALL ----------
  E({
    id: "af1", sport: "american-football", region: "USA", league: "NFL",
    home: "Chiefs", away: "Bills", live: true, clock: "Q2 08:41", score: [10, 7],
    startsAt: at(-1), finalScore: [27, 24], featured: true, competitionPriority: 96,
    markets: [
      M("af1-ml", "Popular", "Moneyline", "ml", null, [O("Chiefs", 1.70, "H"), O("Bills", 2.15, "A")]),
      M("af1-spread", "Handicap", "Spread ±3.5", "ah", -3.5, [O("Chiefs −3.5", 1.90, "HH"), O("Bills +3.5", 1.90, "AH")]),
      M("af1-ou", "Popular", "Total Points — Over/Under 47.5", "ou", 47.5, [O("Over 47.5", 1.90, "O"), O("Under 47.5", 1.90, "U")]),
    ],
  }),
  E({
    id: "af2", sport: "american-football", region: "USA", league: "NFL",
    home: "49ers", away: "Cowboys", live: false, startsAt: at(72), finalScore: [23, 20], competitionPriority: 96,
    markets: [
      M("af2-ml", "Popular", "Moneyline", "ml", null, [O("49ers", 1.60, "H"), O("Cowboys", 2.35, "A")]),
      M("af2-spread", "Handicap", "Spread ±3", "ah", -3, [O("49ers −3", 1.95, "HH"), O("Cowboys +3", 1.85, "AH")]),
      M("af2-ou", "Popular", "Total Points — Over/Under 44.5", "ou", 44.5, [O("Over 44.5", 1.90, "O"), O("Under 44.5", 1.90, "U")]),
    ],
  }),
];

export function eventsBySport(sportId, liveOnly = false) {
  return EVENTS.filter((e) => e.sport === sportId && (!liveOnly || e.live));
}

export function liveCountBySport(sportId) {
  return EVENTS.filter((e) => e.sport === sportId && e.live).length;
}

export function getEvent(id) {
  return EVENTS.find((e) => e.id === id);
}

// --- Settlement: resolve one selection against the event's final score. ---
// Returns "won" | "lost" | "void". Used by the demo bet slip (mock events
// only — real provider bets settle on-chain via Azuro, never through this).
export function outcomeResult(market, pick, finalScore) {
  const [h, a] = finalScore;
  const total = h + a;
  switch (market.type) {
    case "1x2": {
      const win = pick === "H" ? h > a : pick === "A" ? a > h : h === a;
      return win ? "won" : "lost";
    }
    case "ml": {
      if (h === a) return "void"; // 2-way draw = push
      const win = pick === "H" ? h > a : a > h;
      return win ? "won" : "lost";
    }
    case "ou": {
      if (total === market.line) return "void"; // exact line = push
      const win = pick === "O" ? total > market.line : total < market.line;
      return win ? "won" : "lost";
    }
    case "ah": {
      // market.line is the HOME handicap (e.g. -1.5). HH = home covers, AH = away covers.
      const homeAdj = h + market.line;
      if (homeAdj === a) return "void";
      const homeCovers = homeAdj > a;
      const win = pick === "HH" ? homeCovers : !homeCovers;
      return win ? "won" : "lost";
    }
    case "btts": {
      const yes = h > 0 && a > 0;
      const win = pick === "Y" ? yes : !yes;
      return win ? "won" : "lost";
    }
    default:
      return "lost";
  }
}
