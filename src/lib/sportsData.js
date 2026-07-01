// Sportsbook data v2 — multiple markets per event, a simulated final score,
// and deterministic settlement (Stake-faithful: won / lost / void-returns-stake).

export const SPORTS = [
  { id: "soccer", label: "Soccer", icon: "⚽" },
  { id: "basketball", label: "Basketball", icon: "🏀" },
  { id: "tennis", label: "Tennis", icon: "🎾" },
  { id: "mma", label: "MMA", icon: "🥊" },
];

// Market groups shown as tabs on the event detail.
export const MARKET_GROUPS = ["Popular", "Totals", "Handicap", "Goals"];

// outcome: { label, odds, pick }  · pick codes: H/D/A (result), O/U (totals),
// HH/AH (handicap home/away), Y/N (both teams to score)
const O = (label, odds, pick) => ({ label, odds, pick });
const M = (key, group, name, type, line, outcomes) => ({ key, group, name, type, line, outcomes });

const E = (o) => ({ ...o });

export const EVENTS = [
  // ---------- SOCCER ----------
  E({
    id: "s1", sport: "soccer", region: "England", league: "Premier League",
    home: "Arsenal", away: "Chelsea", live: true, clock: "63'", score: [1, 1],
    finalScore: [2, 1],
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
    home: "Man City", away: "Liverpool", live: false, time: "Sat 17:30",
    finalScore: [1, 1],
    markets: [
      M("s2-1x2", "Popular", "Match Result", "1x2", null, [O("Man City", 1.95, "H"), O("Draw", 3.70, "D"), O("Liverpool", 3.80, "A")]),
      M("s2-ou25", "Popular", "Total Goals — Over/Under 2.5", "ou", 2.5, [O("Over 2.5", 1.80, "O"), O("Under 2.5", 2.00, "U")]),
      M("s2-ah", "Handicap", "Handicap", "ah", -0.5, [O("Man City −0.5", 1.95, "HH"), O("Liverpool +0.5", 1.85, "AH")]),
      M("s2-btts", "Goals", "Both Teams To Score", "btts", null, [O("Yes", 1.66, "Y"), O("No", 2.15, "N")]),
    ],
  }),
  E({
    id: "s3", sport: "soccer", region: "Spain", league: "LaLiga",
    home: "Real Madrid", away: "Barcelona", live: false, time: "Sun 21:00",
    finalScore: [2, 2],
    markets: [
      M("s3-1x2", "Popular", "Match Result", "1x2", null, [O("Real Madrid", 2.45, "H"), O("Draw", 3.50, "D"), O("Barcelona", 2.70, "A")]),
      M("s3-ou3", "Popular", "Total Goals — Over/Under 3", "ou", 3, [O("Over 3", 2.10, "O"), O("Under 3", 1.72, "U")]),
      M("s3-btts", "Goals", "Both Teams To Score", "btts", null, [O("Yes", 1.50, "Y"), O("No", 2.50, "N")]),
    ],
  }),

  // ---------- BASKETBALL (no draw) ----------
  E({
    id: "b1", sport: "basketball", region: "USA", league: "NBA",
    home: "Lakers", away: "Celtics", live: true, clock: "Q3 04:12", score: [78, 81],
    finalScore: [104, 108],
    markets: [
      M("b1-ml", "Popular", "Moneyline", "ml", null, [O("Lakers", 2.05, "H"), O("Celtics", 1.80, "A")]),
      M("b1-ou", "Popular", "Total Points — Over/Under 210.5", "ou", 210.5, [O("Over 210.5", 1.90, "O"), O("Under 210.5", 1.90, "U")]),
      M("b1-ah", "Handicap", "Spread ±5.5", "ah", -5.5, [O("Lakers −5.5", 1.95, "HH"), O("Celtics +5.5", 1.85, "AH")]),
    ],
  }),
  E({
    id: "b2", sport: "basketball", region: "USA", league: "NBA",
    home: "Warriors", away: "Nuggets", live: false, time: "Today 22:00",
    finalScore: [120, 115],
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
    finalScore: [2, 1], // sets
    markets: [
      M("t1-ml", "Popular", "Match Winner", "ml", null, [O("Alcaraz", 1.85, "H"), O("Sinner", 1.95, "A")]),
      M("t1-ou", "Popular", "Total Games — Over/Under 22.5", "ou", 22.5, [O("Over 22.5", 1.90, "O"), O("Under 22.5", 1.90, "U")]),
    ],
  }),
  E({
    id: "t2", sport: "tennis", region: "International", league: "ATP Masters",
    home: "Djokovic", away: "Medvedev", live: false, time: "Fri 14:00",
    finalScore: [2, 0],
    markets: [
      M("t2-ml", "Popular", "Match Winner", "ml", null, [O("Djokovic", 1.65, "H"), O("Medvedev", 2.25, "A")]),
      M("t2-ou", "Popular", "Total Sets — Over/Under 2.5", "ou", 2.5, [O("Over 2.5", 2.10, "O"), O("Under 2.5", 1.70, "U")]),
    ],
  }),

  // ---------- MMA ----------
  E({
    id: "m1", sport: "mma", region: "International", league: "UFC 320",
    home: "Jones", away: "Aspinall", live: false, time: "Sat 04:00",
    finalScore: [1, 0], // 1 = home wins, 0 = away wins
    markets: [
      M("m1-ml", "Popular", "Fight Winner", "ml", null, [O("Jones", 1.90, "H"), O("Aspinall", 1.90, "A")]),
    ],
  }),
  E({
    id: "m2", sport: "mma", region: "International", league: "UFC 320",
    home: "Makhachev", away: "Oliveira", live: false, time: "Sat 05:30",
    finalScore: [1, 0],
    markets: [
      M("m2-ml", "Popular", "Fight Winner", "ml", null, [O("Makhachev", 1.45, "H"), O("Oliveira", 2.75, "A")]),
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

// The market shown inline on the event row (first Popular one = Match Result / Moneyline).
export function mainMarket(event) {
  return event.markets[0];
}

export function groupByCompetition(events) {
  const map = new Map();
  for (const e of events) {
    const key = `${e.region} · ${e.league}`;
    if (!map.has(key)) map.set(key, { region: e.region, league: e.league, label: key, events: [] });
    map.get(key).events.push(e);
  }
  return [...map.values()];
}

// --- Settlement: resolve one selection against the event's final score. ---
// Returns "won" | "lost" | "void".
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
