// Prediction-market mock data. Core invariant: Yes + No = $1, price = implied probability.

export const PRED_CATEGORIES = ["Trending", "Politics", "Crypto", "Sports", "Tech", "Economy"];

// Build a simple price-history series that lands on `end` (0..1).
function history(start, end, n = 16) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const base = start + (end - start) * (i / (n - 1));
    const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.02;
    const v = Math.min(0.98, Math.max(0.02, base + noise));
    out.push({ t: `${i}`, yes: +(v * 100).toFixed(1) });
  }
  return out;
}

// Build a YES order book around a mid price `p` (0..1).
function book(p) {
  const asks = [];
  const bids = [];
  for (let i = 1; i <= 6; i++) {
    const ap = Math.min(0.99, +(p + i * 0.01).toFixed(2));
    const bp = Math.max(0.01, +(p - i * 0.01).toFixed(2));
    asks.push({ price: ap, size: Math.round(Math.random() * 4000 + 300) });
    bids.push({ price: bp, size: Math.round(Math.random() * 4000 + 300) });
  }
  return { asks: asks.reverse(), bids };
}

const M = (o) => ({
  ...o,
  no: +(1 - o.yes).toFixed(2),
  series: history(o.from ?? o.yes, o.yes),
  orderbook: book(o.yes),
});

export const MARKETS = [
  M({
    id: "btc-150k",
    question: "Will Bitcoin hit $150,000 before 2027?",
    category: "Crypto",
    yes: 0.62, from: 0.41,
    volume24h: 1_240_000, volumeTotal: 18_900_000,
    closes: "Dec 31, 2026",
    hue: "from-amber-500 to-orange-700",
    resolutionSource: "Coinbase BTC-USD spot price at any point before resolution.",
    rules: "Resolves YES if Bitcoin trades at or above $150,000 on Coinbase at any time before Jan 1, 2027 (UTC). Otherwise NO.",
    trending: true,
  }),
  M({
    id: "eth-flip",
    question: "Will Ethereum's market cap exceed 50% of Bitcoin's in 2026?",
    category: "Crypto",
    yes: 0.28, from: 0.35,
    volume24h: 410_000, volumeTotal: 6_200_000,
    closes: "Dec 31, 2026",
    hue: "from-indigo-500 to-blue-700",
    resolutionSource: "CoinGecko market-cap data, daily close.",
    rules: "Resolves YES if ETH market cap / BTC market cap ≥ 0.50 on any daily close in 2026.",
  }),
  M({
    id: "fed-cut",
    question: "Will the Fed cut rates at the next FOMC meeting?",
    category: "Economy",
    yes: 0.74, from: 0.55,
    volume24h: 880_000, volumeTotal: 9_400_000,
    closes: "Next FOMC",
    hue: "from-emerald-500 to-teal-700",
    resolutionSource: "Federal Reserve official FOMC statement.",
    rules: "Resolves YES if the target federal funds rate is lowered at the next scheduled FOMC meeting.",
    trending: true,
  }),
  M({
    id: "election-turnout",
    question: "Will voter turnout exceed 60% in the next national election?",
    category: "Politics",
    yes: 0.47, from: 0.5,
    volume24h: 320_000, volumeTotal: 4_100_000,
    closes: "Election day",
    hue: "from-rose-500 to-red-700",
    resolutionSource: "Official electoral commission certified results.",
    rules: "Resolves YES if certified turnout of eligible voters is greater than 60.0%.",
  }),
  M({
    id: "gpt6",
    question: "Will a frontier lab release a GPT-6-class model in 2026?",
    category: "Tech",
    yes: 0.55, from: 0.4,
    volume24h: 600_000, volumeTotal: 7_800_000,
    closes: "Dec 31, 2026",
    hue: "from-fuchsia-500 to-purple-700",
    resolutionSource: "Official lab announcement + public availability.",
    rules: "Resolves YES if any major lab publicly releases a model marketed as a generational successor in 2026.",
    trending: true,
  }),
  M({
    id: "ucl-winner",
    question: "Will an English club win the Champions League this season?",
    category: "Sports",
    yes: 0.38, from: 0.3,
    volume24h: 540_000, volumeTotal: 5_600_000,
    closes: "Final, May 2026",
    hue: "from-sky-500 to-cyan-700",
    resolutionSource: "UEFA official final result.",
    rules: "Resolves YES if the winning club of the UEFA Champions League final is from the English league.",
  }),
  M({
    id: "sol-100",
    question: "Will Solana close above $400 this quarter?",
    category: "Crypto",
    yes: 0.33, from: 0.45,
    volume24h: 290_000, volumeTotal: 3_300_000,
    closes: "End of quarter",
    hue: "from-violet-500 to-indigo-700",
    resolutionSource: "Coinbase SOL-USD daily close.",
    rules: "Resolves YES if SOL closes at or above $400 on any day this quarter.",
  }),
  M({
    id: "unemployment",
    question: "Will US unemployment stay below 5% all year?",
    category: "Economy",
    yes: 0.69, from: 0.6,
    volume24h: 150_000, volumeTotal: 2_100_000,
    closes: "Dec 31, 2026",
    hue: "from-lime-500 to-green-700",
    resolutionSource: "US Bureau of Labor Statistics monthly report.",
    rules: "Resolves YES if the reported U-3 unemployment rate is below 5.0% in every month of 2026.",
  }),
];

export function marketsByCategory(category) {
  if (category === "Trending") return MARKETS.filter((m) => m.trending);
  return MARKETS.filter((m) => m.category === category);
}

export function getMarket(id) {
  return MARKETS.find((m) => m.id === id);
}

// Mock open/settled positions for the "My Positions" view.
export const POSITIONS = [
  { id: "p1", marketId: "btc-150k", question: "Will Bitcoin hit $150,000 before 2027?", side: "Yes", shares: 120, avgPrice: 0.48, status: "open" },
  { id: "p2", marketId: "fed-cut", question: "Will the Fed cut rates at the next FOMC meeting?", side: "Yes", shares: 200, avgPrice: 0.61, status: "open" },
  { id: "p3", marketId: "sol-100", question: "Will Solana close above $400 this quarter?", side: "No", shares: 90, avgPrice: 0.62, status: "open" },
  { id: "p4", marketId: "old-1", question: "Will it rain on launch day?", side: "Yes", shares: 50, avgPrice: 0.4, status: "settled", resolvedYes: true },
  { id: "p5", marketId: "old-2", question: "Will the merger close in Q1?", side: "Yes", shares: 75, avgPrice: 0.55, status: "settled", resolvedYes: false },
];
