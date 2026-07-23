// One shared Casino game-information model — every surface that explains a
// game to a player (the gameplay frame's "Game info" panel, a direct
// game-detail link) derives from this single source, never a second
// metadata store (see DATA HONESTY / "do not create duplicate metadata
// stores").
//
// GAME_FACTS below is a hand-authored, per-game set of ONLY the facts that
// are actually verifiable from this project's own real data — nothing here
// is invented. Provenance, per field:
//   - description/rules: paraphrased from each game's own real in-game
//     "How to play"/rules copy (public/games/<slug>/index.html) or, for
//     BetSwirl games, derived directly from their real bet-control logic in
//     BetSwirlGame.jsx (win-chance slider, heads/tails, number picks).
//   - rtp/fairness: copied from each game's own real, already-shipped RTP/
//     fairness disclosure (e.g. Warpout's and Vector Dice's in-game
//     "Provably Fair" panels literally state "98.00% RTP / 2.00% house
//     edge"; Coin Fighters/Raider's Escape/Drunken Pirate disclose their own
//     numbers in their in-game footers/modals).
//   - minimumBet/maximumBet: only set for Drunken Pirate, whose own bet
//     input is genuinely capped (min="0.01" max="100" in its own HTML).
// Every other game/field is deliberately left unset — see STOP CONDITIONS:
// "RTP values cannot be verified" for BetSwirl's on-chain games (this
// project has no per-game RTP number on record, only a business-level house
// -edge RANGE in docs/architecture/00-overview.md that isn't attributable to
// any one game) and for provider games with no in-game disclosure at all
// (Coin Flip, Nova Wheel, SpaceX Rush, KeyMines V2, Bubble Girl). Omitting
// is the correct, honest behavior per this task's own instruction, not a gap
// to "fix" by guessing.
export const FAIRNESS_TYPE = {
  PROVABLY_FAIR: "provably-fair",
  UNKNOWN: "unknown",
};

const GAME_FACTS = {
  // ---- Onchain (BetSwirl) — real mechanic (from BetSwirlGame.jsx's own
  // control logic), real on-chain Chainlink VRF randomness (real, verifiable
  // per-bet via the block-explorer link BetSwirlGame already renders after a
  // round — see that file's txUrl/"verify roll on-chain" link). No per-game
  // RTP number is recorded anywhere in this project — omitted, not guessed.
  "casino:dice": {
    description: "Choose your win chance, then roll — a lower chance pays a bigger multiplier.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Set your win chance and bet amount.",
      "Roll — a Chainlink VRF request generates the result on-chain.",
      "Land inside your chosen chance and you win; miss and you lose your bet.",
    ] }],
    fairness: { type: FAIRNESS_TYPE.PROVABLY_FAIR, mechanism: "on-chain-vrf" },
  },
  "casino:coin-toss": {
    description: "Call heads or tails and settle the flip on-chain.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Choose heads or tails and set your bet amount.",
      "Flip — a Chainlink VRF request generates the result on-chain.",
      "Match your call and you win; miss and you lose your bet.",
    ] }],
    fairness: { type: FAIRNESS_TYPE.PROVABLY_FAIR, mechanism: "on-chain-vrf" },
  },
  "casino:roulette": {
    description: "Pick one or more numbers on the wheel — any hit pays out.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Pick any of the 37 numbers (0-36) and set your bet amount.",
      "Spin — a Chainlink VRF request generates the result on-chain.",
      "If the result matches any number you picked, you win.",
    ] }],
    fairness: { type: FAIRNESS_TYPE.PROVABLY_FAIR, mechanism: "on-chain-vrf" },
  },
  "casino:keno": {
    description: "Pick up to 4 numbers and see how many hit.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Pick up to 4 numbers (1-10) and set your bet amount.",
      "Draw — a Chainlink VRF request generates the result on-chain.",
      "Your payout depends on how many of your picks are drawn.",
    ] }],
    fairness: { type: FAIRNESS_TYPE.PROVABLY_FAIR, mechanism: "on-chain-vrf" },
  },

  // ---- Provider (vendored iframe games) — description/rules/RTP/fairness
  // are paraphrased directly from each game's own real, already-shipped
  // copy (see file header). Games with no such disclosure keep only a
  // mechanic description (still real — read from their own DOM/controls),
  // no RTP/fairness section at all.
  "provider:crash": {
    description: "A rising multiplier climbs from 1.00× — cash out any time to bank your bet, or lose it if the round collapses first.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Place a bet before the round starts.",
      "Watch the multiplier climb from 1.00× once the round begins.",
      "Cash out any time to bank your bet at the current multiplier.",
      "If the round collapses before you cash out, the bet is lost.",
    ] }],
    rtp: { value: 98.0 },
    fairness: {
      type: FAIRNESS_TYPE.PROVABLY_FAIR,
      mechanism: "client-commit-reveal",
      note: "This is a demo prototype: the committed seed is generated and held in your browser tab, not on a real server.",
    },
  },
  "provider:dice": {
    description: "Pick 1 to 5 of six die faces, then roll. Fewer faces covered means a lower chance to win but a bigger multiplier, and every roll settles instantly.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Tap 1 to 5 of the six faces — those are your winning faces.",
      "Set your bet amount.",
      "Roll — the result settles instantly.",
      "Land on one of your covered faces and you win.",
    ] }],
    rtp: { value: 98.0 },
    fairness: {
      type: FAIRNESS_TYPE.PROVABLY_FAIR,
      mechanism: "client-commit-reveal",
      note: "This is a demo prototype: the committed seed is generated and held in your browser tab, not on a real server.",
    },
  },
  "provider:coinflip": {
    description: "Choose heads or tails, then flip a coin for your bet.",
  },
  "provider:nova-wheel": {
    description: "Set a stake and spin the wheel.",
  },
  "provider:spacex-rush": {
    description: "A rising multiplier climbs as your rocket launches — set an auto-cashout or cash out manually before it crashes.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Set your bet and, optionally, an auto-cashout multiplier.",
      "Launch — the multiplier climbs as your rocket flies.",
      "Cash out (manually or automatically) before it crashes to bank your bet.",
    ] }],
  },
  "provider:tumble": {
    description: "A rising multiplier climbs each round — drop in, then cash out before it busts.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Set your bet and, optionally, an auto-cashout multiplier.",
      "Drop in — the multiplier climbs as the round runs.",
      "Cash out before it busts to bank your bet.",
    ] }],
    fairness: {
      type: FAIRNESS_TYPE.PROVABLY_FAIR,
      mechanism: "client-commit-reveal",
      note: "This is a demo prototype: the committed seed is generated and held in your browser tab, not on a real server.",
    },
  },
  "provider:coin-fighters": {
    description: "Guess Heads or Paws against your fighter. Correct guesses double your multiplier; cash out anytime, or lose your bet and a life box on a wrong guess.",
    rules: [
      { id: "play", title: "How to play", steps: [
        "Set your bet, then guess Heads or Paws.",
        "Correct — your multiplier roughly doubles (1× → 2× → 4× → 8×…).",
        "Cash out anytime above 1× to bank bet × multiplier.",
        "Wrong — you lose the bet and one life box; the multiplier resets.",
      ] },
      { id: "bonus", title: "Streak bonus", body: "Landing 5 correct guesses in a row reaches 32× — take the payout, or gamble it on a bonus Ship's Wheel spin for a shot at 96×." },
    ],
    rtp: { value: 97.0 },
    fairness: {
      type: FAIRNESS_TYPE.PROVABLY_FAIR,
      mechanism: "client-commit-reveal",
      note: "This is a demo prototype: the committed seed is generated and held in your browser tab, not on a real server.",
    },
    payoutSummary: "A 3% house edge sets the win chance to 48.5% (not a raw 50/50); first-cashout RTP is approximately 97%.",
  },
  "provider:raiders-escape": {
    description: "A rising multiplier climbs as you run from a collapsing corridor — cash out before the boulder hits or lose your bet.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Set your bet and, optionally, an auto-cashout multiplier.",
      "Run — the multiplier climbs as you flee the boulder.",
      "Cash out before it hits to bank your bet; if it hits first, the round is lost.",
    ] }],
    rtp: { value: 97.0, note: "Approximate return up to a 2× cash-out; the multiplier is capped at 3.5×." },
    fairness: {
      type: FAIRNESS_TYPE.PROVABLY_FAIR,
      mechanism: "client-commit-reveal",
      note: "This is a demo prototype: the committed seed is generated and held in your browser tab, not on a real server.",
    },
  },
  "provider:keymines-v2": {
    // No description/rules/RTP/fairness — this game's UI is a bundled SPA
    // with no inspectable markup (index.html is just a script mount point),
    // so there is no real per-game copy to paraphrase here (see DESCRIPTION:
    // "do not generate descriptions for games without enough supported
    // information").
  },
  "provider:drunken-pirate": {
    description: "Fire at apples — each hit doubles your multiplier, cash out anytime. Miss and you lose your bet and a life. Land 5 hits in a row for a bonus Ship's Wheel spin.",
    rules: [
      { id: "play", title: "How to play", steps: [
        "Place your bet — wagers from $0.01 up to $100.",
        "Fire — a hit doubles your multiplier (1× → 2× → 4× → 8×…).",
        "Cash out anytime to bank bet × multiplier.",
        "A miss loses the bet for that round and one life box.",
      ] },
      { id: "bonus", title: "Ship's Wheel bonus", body: "Landing 5 hits in a row reaches 32× — take the payout, or pay a 10×-bet entry to spin the bonus wheel (2 of 6 slices win 30×-bet more; the rest lose the entry fee)." },
    ],
    rtp: { value: 97.0 },
    fairness: {
      type: FAIRNESS_TYPE.PROVABLY_FAIR,
      mechanism: "client-commit-reveal",
      note: "This is a demo prototype: the committed seed is generated and held in your browser tab, not on a real server.",
    },
    payoutSummary: "Each hit returns 2× your bet with roughly a 48.5% hit chance — expected return 97% (3% house edge).",
    minimumBet: "$0.01",
    maximumBet: "$100",
  },
  "provider:bubble-girl": {
    description: "Hold to inflate the bubble, building your multiplier — release or cash out before it bursts.",
    rules: [{ id: "play", title: "How to play", steps: [
      "Start a new round and set your bet.",
      "Hold to inflate the bubble — the multiplier climbs while you hold.",
      "Cash out before it bursts to bank your bet.",
    ] }],
    // No RTP/fairness section — this game has no disclosed RTP or seed-based
    // fairness mechanism in its own source.
  },
};

// Customer-safe copy per fairness type — kept here (not per-game) so the
// language is consistent everywhere it appears, and so a game can only ever
// show real, correctly-labeled copy for its own actual mechanism (see
// PROVABLY FAIR INFORMATION / CERTIFIED RNG GAMES).
export function resolveFairnessSummary(fairness) {
  if (!fairness) {
    return { heading: null, summary: "Game outcomes are generated by the game's own random-number system." };
  }
  if (fairness.type === FAIRNESS_TYPE.PROVABLY_FAIR && fairness.mechanism === "on-chain-vrf") {
    return {
      heading: "Provably fair",
      summary: "Each result is generated using a verifiable on-chain process. Every bet settles as a real transaction you can look up afterwards.",
    };
  }
  if (fairness.type === FAIRNESS_TYPE.PROVABLY_FAIR && fairness.mechanism === "client-commit-reveal") {
    return {
      heading: "Provably fair",
      summary: "Each result can be independently verified using the inputs committed before the round.",
      note: fairness.note,
    };
  }
  return { heading: null, summary: "Game outcomes are generated by the game's own random-number system." };
}

// Formats a real RTP value consistently — never invents one; callers only
// pass this a value that already came from GAME_FACTS.
export function formatRtp(value) {
  return `${value.toFixed(2)}%`;
}

export const RTP_EXPLANATION = "The theoretical percentage returned to players over a very large number of rounds. Individual results will vary.";

// Builds the full details object for a real catalog game (favId/title/kind/
// playable/tags — the same object every other Casino surface already uses,
// see CasinoCatalog.jsx's ALL_GAMES) merged with this file's own verified
// facts. `status` is derived from the game's own real `playable` flag, never
// duplicated as a second stored value (see ONE SHARED GAME METADATA MODEL:
// "do not create duplicate metadata stores").
export function getGameDetails(game) {
  if (!game) return null;
  const playable = game.kind !== "onchain" || game.playable;
  const status = playable ? "available" : "coming-soon";
  const facts = GAME_FACTS[game.favId] ?? {};

  // Coming-soon games never surface rules/RTP/fairness/limits, even if a
  // future catalog entry accidentally carried them — see COMING-SOON AND
  // UNAVAILABLE GAMES: "do not show RTP/payout rules/fairness claims/bet
  // limits unless actually finalized."
  const safeFacts = status === "coming-soon" ? {} : facts;

  return {
    id: game.favId,
    name: game.title,
    kind: game.kind,
    categoryIds: game.tags ?? [],
    status,
    description: safeFacts.description,
    rules: safeFacts.rules,
    rtp: safeFacts.rtp,
    fairness: safeFacts.fairness,
    payoutSummary: safeFacts.payoutSummary,
    minimumBet: safeFacts.minimumBet,
    maximumBet: safeFacts.maximumBet,
  };
}
