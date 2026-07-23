// One shared Casino round model — every activity surface (My Bets' Casino
// tab, the round receipt) derives from this, never a second store (see ONE
// SHARED CASINO ROUND MODEL). Casino rounds are real on-chain BetSwirl data;
// nothing here invents a stake, payout, ID, or timestamp.
//
// Three real sources feed this, normalized to the same shape:
//   1. /api/casino-history — authoritative, read straight from chain Roll
//      events (survives reload; see api/casino-history.js). Every field is
//      real: betId, stake, payout, outcome text, txHash, blockNumber,
//      placedAt are all decoded from an actual on-chain event.
//   2. BetSwirlGame's `onRound` callback — fires the instant a round
//      resolves in the CURRENT tab, with the same real values (stake,
//      payout, txnHash) before the next chain-history refetch would show it
//      — used only to make a just-played round appear immediately, not as a
//      second source of truth (see mergeCasinoRounds' txHash dedupe).
//   3. BetSwirlGame's `onRoundPending` callback — fires the moment a bet
//      transaction is confirmed (`onBetPlaced` in useBetSwirl.js), before
//      the VRF roll resolves. This is a REAL, not fabricated, pending state:
//      the stake is genuinely locked in and the tx hash is real; only the
//      win/loss outcome is genuinely not known yet.
export const ROUND_STATUS = {
  PENDING: "pending",
  WON: "won",
  LOST: "lost",
  SETTLED: "settled",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
  FAILED: "failed",
};

// One shared status config — label, icon key (resolved to a lucide icon by
// the receipt/list components, never color alone), and semantic tone token.
// Unknown/unrecognized statuses fall back safely rather than crashing or
// showing a raw backend string (see STATUS SYSTEM: "unknown status maps to
// a safe fallback").
const STATUS_CONFIG = {
  [ROUND_STATUS.PENDING]: { label: "Pending", icon: "clock", tone: "neutral" },
  [ROUND_STATUS.WON]: { label: "Won", icon: "check", tone: "success" },
  [ROUND_STATUS.LOST]: { label: "Lost", icon: "x", tone: "danger" },
  [ROUND_STATUS.SETTLED]: { label: "Settled", icon: "check-circle", tone: "neutral" },
  [ROUND_STATUS.REFUNDED]: { label: "Refunded", icon: "rotate-ccw", tone: "neutral" },
  [ROUND_STATUS.CANCELLED]: { label: "Cancelled", icon: "slash", tone: "neutral" },
  [ROUND_STATUS.FAILED]: { label: "Failed", icon: "alert-triangle", tone: "danger" },
};
const UNKNOWN_STATUS_CONFIG = { label: "Unknown", icon: "help-circle", tone: "neutral" };

export function resolveRoundStatusConfig(status) {
  return STATUS_CONFIG[status] ?? UNKNOWN_STATUS_CONFIG;
}

// Real BetSwirl game keys this project actually plays (see useBetSwirl.js's
// BETSWIRL_GAMES) — the only ones /api/casino-history ever returns.
export const GAME_LABEL = { dice: "Dice", "coin-toss": "Coin Toss", roulette: "Roulette", keno: "Keno" };

// Trims a decimal ETH string/number to at most 6 significant fractional
// places with no trailing zeros — same convention BetHistoryDialog already
// used inline (see that file's own `trim`), centralized here so every
// surface formats the same real value identically.
export function formatEthAmount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const trimmed = n.toFixed(6).replace(/\.?0+$/, "");
  return trimmed === "" || trimmed === "-" ? "0" : trimmed;
}

// Payout minus stake — the one place this subtraction happens, so no
// surface can double-count a returned stake as "profit" (see STAKE, PAYOUT
// AND PROFIT/LOSS: "do not double-count returned stake"). Returns null
// (never 0) when either side is unavailable, e.g. a pending round with no
// payout yet — callers must render "—", not fabricate a zero.
export function computeProfitLoss(stake, payout) {
  const s = Number(stake);
  const p = Number(payout);
  if (!Number.isFinite(s) || !Number.isFinite(p)) return null;
  return p - s;
}

// Real, stable identifier: BetSwirl's own on-chain bet ID, scoped by game
// (two different game contracts can both have used bet ID 5). Never
// generated — if a round genuinely has no betId (the pending-callback path,
// before the chain has assigned/exposed one), the transaction hash is the
// real stable reference instead (see ROUND ID: "if no stable round ID
// exists, do not generate a fake one").
export function getRoundId(round) {
  if (round.betId != null) return `${round.gameKey}-${round.betId}`;
  return round.txHash ?? round.id;
}

function baseRound({ gameKey, favId, status }) {
  return {
    gameKey,
    gameId: favId ?? (gameKey ? `casino:${gameKey}` : undefined),
    gameName: GAME_LABEL[gameKey] ?? gameKey,
    status,
    currency: "ETH",
  };
}

// From /api/casino-history's real per-bet record (see api/casino-history.js
// — every field here is decoded from an actual Roll event).
export function normalizeChainHistoryRound(bet) {
  const round = {
    ...baseRound({ gameKey: bet.game, status: bet.isWin ? ROUND_STATUS.WON : ROUND_STATUS.LOST }),
    betId: bet.betId,
    startedAt: bet.placedAt,
    stake: bet.stake,
    payout: bet.payout,
    resultSummary: bet.outcome || undefined,
    txHash: bet.txHash,
    blockNumber: bet.blockNumber,
  };
  round.profitLoss = computeProfitLoss(round.stake, round.payout);
  round.id = getRoundId(round);
  return round;
}

// From BetSwirlGame's real `onRound` callback the instant a round resolves
// in this tab (see BetSwirlGame.jsx — `gameKey`/`favId` are the small,
// additive fields this task added to that payload so this normalizer never
// has to re-derive them). No betId/blockNumber/outcome text are available
// this way (only the chain-history fetch decodes those) — omitted, not
// guessed.
export function normalizeLiveResultRound(e) {
  const round = {
    ...baseRound({ gameKey: e.gameKey, favId: e.favId, status: e.status === "won" ? ROUND_STATUS.WON : ROUND_STATUS.LOST }),
    startedAt: e.at ?? Date.now(),
    stake: e.stake,
    payout: e.status === "won" ? e.potential : 0,
    txHash: e.txnHash,
  };
  round.profitLoss = computeProfitLoss(round.stake, round.payout);
  round.id = round.txHash ?? `local:${round.gameKey}:${round.startedAt}`;
  return round;
}

// From BetSwirlGame's real `onRoundPending` callback — fires the instant a
// bet transaction is confirmed (see useBetSwirl.js's `onBetPlaced`), before
// the VRF roll resolves. Every field here is already real (stake locked in,
// real tx hash); only the eventual win/loss is genuinely unknown, which is
// exactly what "pending" means (see PENDING ROUND BEHAVIOR).
export function normalizePendingRound(e) {
  const round = {
    ...baseRound({ gameKey: e.gameKey, favId: e.favId, status: ROUND_STATUS.PENDING }),
    startedAt: e.at ?? Date.now(),
    stake: e.stake,
    txHash: e.txHash,
  };
  round.id = round.txHash ?? `pending:${round.gameKey}:${round.startedAt}`;
  return round;
}

// Merges the three real sources into one newest-first list. A pending
// round is dropped the moment a resolved round with the SAME txHash shows
// up (from either the live-result callback or the next chain-history
// refetch) — never left as a stale duplicate alongside its own resolution
// (see PENDING ROUND BEHAVIOR: "avoid duplicate entries"). Sort is stable:
// real timestamp first, id as a tiebreaker, so equal-timestamp entries
// never reorder between renders (see SORTING: "no unstable sort jumps").
export function mergeCasinoRounds({ chainHistory = [], liveResults = [], pending = [] }) {
  const resolvedTxHashes = new Set([...chainHistory, ...liveResults].map((r) => r.txHash).filter(Boolean));
  const livePendingOnly = pending.filter((r) => !resolvedTxHashes.has(r.txHash));

  const byId = new Map();
  // Chain history is authoritative — added last so it overwrites a
  // same-id/txHash live-result placeholder with the richer real record.
  for (const round of [...livePendingOnly, ...liveResults, ...chainHistory]) {
    const key = round.txHash ?? round.id;
    byId.set(key, round);
  }

  return [...byId.values()].sort((a, b) => {
    const at = a.startedAt ?? 0;
    const bt = b.startedAt ?? 0;
    if (bt !== at) return bt - at;
    return String(b.id).localeCompare(String(a.id));
  });
}
