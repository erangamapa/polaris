// Market group taxonomy, ordering, and primary/quick-bet market selection —
// the "configurable, not five separate systems" layer referenced throughout
// the Sports spec. One config table drives grouping/ordering for all three
// event-layout families (soccer / tennis / team); Basketball, Baseball and
// American Football all share the "team" family and differ only in which
// quick-bet markets exist in their real inventory (handled gracefully by
// falling back to whatever's present, never forcing an empty column).

export const MARKET_GROUP_ORDER = {
  soccer: ["popular", "main", "handicap", "totals", "goals", "corners", "cards", "players", "other"],
  tennis: ["popular", "main", "sets", "games", "handicap", "totals", "players", "other"],
  team: ["popular", "main", "handicap", "totals", "periods", "players", "other"],
};

export const MARKET_GROUP_LABEL = {
  popular: "Popular",
  main: "Main",
  totals: "Totals",
  handicap: "Handicap",
  goals: "Goals",
  corners: "Corners",
  cards: "Cards",
  players: "Players",
  sets: "Sets",
  games: "Games",
  periods: "Periods",
  other: "Other",
};

// Provider market titles (Azuro condition.title) are free text, not a
// fixed enum — this can't be an exact-match table. Unmatched markets land
// in "other" rather than breaking rendering (see MARKET GROUPING).
export function classifyMarket(market, templateFamily) {
  const name = (market.name || "").toLowerCase();
  if (market.group && MARKET_GROUP_LABEL[market.group.toLowerCase()]) return market.group.toLowerCase();
  if (/1x2|match result|match winner|moneyline|winner|double chance/.test(name)) return "main";
  if (/handicap|spread|run line/.test(name)) return "handicap";
  if (/total|over.?under/.test(name)) return "totals";
  if (/both teams to score|btts/.test(name)) return "goals";
  if (/corner/.test(name)) return "corners";
  if (/card/.test(name)) return "cards";
  if (/set/.test(name)) return "sets";
  if (templateFamily === "tennis" && /game/.test(name)) return "games";
  if (/quarter|period|inning|half/.test(name)) return "periods";
  if (/player|scorer|assist/.test(name)) return "players";
  return "other";
}

export function groupAndOrderMarkets(markets, templateFamily) {
  const order = MARKET_GROUP_ORDER[templateFamily] ?? MARKET_GROUP_ORDER.team;
  const byGroup = new Map();
  for (const m of markets) {
    const g = classifyMarket(m, templateFamily);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(m);
  }
  return order.filter((g) => byGroup.has(g)).map((g) => ({ group: g, label: MARKET_GROUP_LABEL[g] ?? g, markets: byGroup.get(g) }));
}

// The single market shown inline on a compact row / event header. Falls
// back to whatever market exists first rather than showing nothing.
// "Match winner" / "moneyline" / "winner" are synonyms across providers (Azuro
// titles vs SX's two-way "Match Winner") — match them all so the headline
// market is always found, not just the first market as a fallback.
const PRIMARY_MATCHERS = {
  soccer: /1x2|match result|match winner|moneyline/i,
  tennis: /match winner|winner|moneyline/i,
  team: /moneyline|match winner|winner/i,
};
export function primaryMarket(event) {
  const re = PRIMARY_MATCHERS[event.sport.templateFamily];
  const found = re && event.markets.find((m) => re.test(m.name));
  return found ?? event.markets[0] ?? null;
}

// Team-sport quick-bet columns (Moneyline / Spread / Total). Any that don't
// exist in this event's real markets are simply omitted from the row —
// "do not force all sports to show every market if provider conditions are
// unavailable."
export function teamQuickMarkets(event) {
  return {
    moneyline: event.markets.find((m) => /moneyline|match winner|winner/i.test(m.name)),
    spread: event.markets.find((m) => /spread|handicap|run line/i.test(m.name)),
    total: event.markets.find((m) => /total/i.test(m.name)),
  };
}
