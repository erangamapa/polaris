// title, provider, hue, players, cat, flags
const G = (title, provider, hue, players, cat, flags = {}) => ({
  title,
  provider,
  hue,
  players,
  cat,
  ...flags,
});

export const RAILS = [
  {
    id: "continue",
    title: "Continue Playing",
    icon: "↻",
    games: [
      G("Mines", "Spinwave", "from-emerald-500 to-teal-700", 1842, "originals"),
      G("Crash", "Spinwave", "from-rose-500 to-orange-600", 4021, "originals"),
      G("Dice", "Spinwave", "from-sky-500 to-indigo-700", 912, "originals"),
    ],
  },
  {
    id: "originals",
    title: "Popular",
    icon: "◆",
    games: [
      G("Crash", "Spinwave", "from-rose-500 to-orange-600", 4021, "originals"),
      G("Plinko", "Spinwave", "from-fuchsia-500 to-purple-700", 2310, "originals"),
      G("Limbo", "Spinwave", "from-cyan-500 to-blue-700", 1455, "originals", { new: true }),
      G("Mines", "Spinwave", "from-emerald-500 to-teal-700", 1842, "originals"),
      G("Dice", "Spinwave", "from-sky-500 to-indigo-700", 912, "originals"),
      G("Wheel", "Spinwave", "from-amber-500 to-red-600", 688, "originals", { new: true }),
    ],
  },
  {
    id: "slots",
    title: "Slots",
    icon: "▦",
    games: [
      G("Gold Rush", "Provider A", "from-yellow-500 to-amber-700", 5120, "slots"),
      G("Neon Reels", "Provider B", "from-pink-500 to-fuchsia-700", 3301, "slots", { new: true }),
      G("Aztec Coins", "Provider A", "from-lime-500 to-green-700", 2780, "slots"),
      G("Pirate Bay", "Provider C", "from-blue-500 to-indigo-700", 1990, "slots"),
      G("Fruit Blitz", "Provider B", "from-orange-500 to-rose-700", 1204, "slots"),
      G("Diamond X", "Provider C", "from-violet-500 to-purple-700", 944, "slots", { new: true }),
    ],
  },
  {
    id: "live",
    title: "Live Casino",
    icon: "●",
    games: [
      G("Roulette", "Live Studio", "from-red-500 to-rose-800", 7411, "live"),
      G("Blackjack", "Live Studio", "from-slate-500 to-zinc-800", 3120, "live"),
      G("Baccarat", "Live Studio", "from-emerald-500 to-green-800", 1877, "live"),
      G("Crazy Wheel", "Live Studio", "from-indigo-500 to-violet-800", 6203, "gameshow"),
      G("Money Drop", "Live Studio", "from-teal-500 to-cyan-800", 4480, "gameshow", { new: true }),
    ],
  },
];

// All unique games, flattened (de-duped by title+provider).
export const ALL_GAMES = (() => {
  const seen = new Map();
  for (const rail of RAILS) {
    for (const g of rail.games) {
      const key = `${g.title}-${g.provider}`;
      if (!seen.has(key)) seen.set(key, g);
    }
  }
  return [...seen.values()];
})();

// Maps a category chip/nav label to a filter over ALL_GAMES.
// Returns null for "Lobby" (caller renders the rail layout instead).
export function getGamesByCategory(category) {
  switch (category) {
    case "Lobby":
      return null;
    case "Popular":
      return ALL_GAMES.filter((g) => g.cat === "originals");
    case "Slots":
      return ALL_GAMES.filter((g) => g.cat === "slots");
    case "Live Casino":
      return ALL_GAMES.filter((g) => g.cat === "live" || g.cat === "gameshow");
    case "Game Shows":
      return ALL_GAMES.filter((g) => g.cat === "gameshow");
    case "New":
      return ALL_GAMES.filter((g) => g.new);
    case "Favorites":
      return []; // nothing persisted yet → empty state
    default:
      return null;
  }
}

export const CATEGORIES = ["Lobby", "Popular", "Slots", "Live Casino", "Game Shows", "New", "Favorites"];

export const NAV = [
  { id: "casino", label: "Casino", icon: "♠" },
  { id: "predictions", label: "Predictions", icon: "◎" },
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "wallet", label: "Wallet", icon: "▢" },
];

// Promo hero carousel slides.
export const PROMOS = [
  {
    id: "welcome",
    eyebrow: "Welcome offer",
    title: "200% up to 1,000 USDT",
    body: "Match on your first deposit. Instant credit, no lock-up.",
    cta: "Claim bonus",
    hue: "from-emerald-500 via-teal-600 to-cyan-700",
    image: "/heroes/casino-welcome.png",
  },
  {
    id: "race",
    eyebrow: "Live now",
    title: "$50,000 Weekly Race",
    body: "Wager to climb the leaderboard. Paid out every Monday.",
    cta: "View race",
    hue: "from-fuchsia-500 via-purple-600 to-indigo-700",
    image: "/heroes/casino-race.png",
  },
  {
    id: "cashback",
    eyebrow: "Always on",
    title: "Instant 10% Cashback",
    body: "Flat rate, win or lose. Credited in real time.",
    cta: "Learn more",
    hue: "from-amber-500 via-orange-600 to-rose-700",
    image: "/heroes/casino-cashback.png",
  },
];

export const TICKER_NAMES = ["c0re", "luna", "0xKai", "mireille", "satoshi_jr", "vex", "nori", "pax", "ghost", "mara", "zenu", "kix"];

export const FEED_GAMES = ["Crash", "Mines", "Dice", "Plinko", "Limbo", "Roulette", "Wheel"];
