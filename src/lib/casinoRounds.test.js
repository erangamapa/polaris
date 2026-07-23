import { describe, it, expect } from "vitest";
import {
  resolveRoundStatusConfig, formatEthAmount, computeProfitLoss, getRoundId,
  normalizeChainHistoryRound, normalizeLiveResultRound, normalizePendingRound, mergeCasinoRounds,
  ROUND_STATUS,
} from "./casinoRounds";

// CASINO ACTIVITY, BET HISTORY AND ROUND RECEIPTS — scenario coverage. This
// module is the one place all three real data sources (chain-history fetch,
// live in-tab result, live in-tab pending) get normalized and merged, so its
// correctness is what the whole My Bets Casino tab depends on.

describe("resolveRoundStatusConfig", () => {
  it("returns the exact label for every real status", () => {
    expect(resolveRoundStatusConfig(ROUND_STATUS.WON).label).toBe("Won");
    expect(resolveRoundStatusConfig(ROUND_STATUS.LOST).label).toBe("Lost");
    expect(resolveRoundStatusConfig(ROUND_STATUS.PENDING).label).toBe("Pending");
    expect(resolveRoundStatusConfig(ROUND_STATUS.REFUNDED).label).toBe("Refunded");
  });
  it("falls back safely for an unrecognized status instead of showing a raw value", () => {
    const config = resolveRoundStatusConfig("some-internal-backend-code");
    expect(config.label).toBe("Unknown");
  });
});

describe("formatEthAmount", () => {
  it("trims trailing zeros without losing precision", () => {
    expect(formatEthAmount("0.00001000")).toBe("0.00001");
    expect(formatEthAmount("0.500000")).toBe("0.5");
  });
  it("never renders an empty string for zero", () => {
    expect(formatEthAmount("0.000000")).toBe("0");
    expect(formatEthAmount(0)).toBe("0");
  });
});

describe("computeProfitLoss", () => {
  it("is payout minus stake, never a double count of the returned stake", () => {
    expect(computeProfitLoss("0.001", "0.0025")).toBeCloseTo(0.0015);
    expect(computeProfitLoss("0.001", "0")).toBeCloseTo(-0.001);
  });
  it("returns null (not zero) when either side is unavailable", () => {
    expect(computeProfitLoss("0.001", undefined)).toBeNull();
    expect(computeProfitLoss(undefined, undefined)).toBeNull();
  });
});

describe("normalizeChainHistoryRound", () => {
  it("maps a real /api/casino-history bet into the shared shape with a stable id", () => {
    const round = normalizeChainHistoryRound({
      game: "dice", betId: "42", stake: "0.001", payout: "0.0025", isWin: true,
      outcome: "rolled 61 · cap 50", txHash: "0xabc", blockNumber: 123, placedAt: 1700000000000,
    });
    expect(round.status).toBe(ROUND_STATUS.WON);
    expect(round.gameName).toBe("Dice");
    expect(round.gameId).toBe("casino:dice");
    expect(round.id).toBe(getRoundId(round));
    expect(round.profitLoss).toBeCloseTo(0.0015);
    expect(round.resultSummary).toBe("rolled 61 · cap 50");
  });
  it("marks a zero-payout bet as lost, not a fabricated win", () => {
    const round = normalizeChainHistoryRound({ game: "coin-toss", betId: "1", stake: "0.001", payout: "0", isWin: false, txHash: "0xdef", placedAt: 1 });
    expect(round.status).toBe(ROUND_STATUS.LOST);
    expect(round.profitLoss).toBeCloseTo(-0.001);
  });
});

describe("normalizeLiveResultRound / normalizePendingRound", () => {
  it("normalizes a just-resolved in-tab result without inventing a betId", () => {
    const round = normalizeLiveResultRound({ gameKey: "dice", favId: "casino:dice", stake: 0.001, potential: 0.0025, status: "won", txnHash: "0x123", at: 5000 });
    expect(round.status).toBe(ROUND_STATUS.WON);
    expect(round.betId).toBeUndefined();
    expect(round.payout).toBe(0.0025);
  });
  it("normalizes a real pending round with no payout/profitLoss field at all", () => {
    const round = normalizePendingRound({ gameKey: "roulette", favId: "casino:roulette", stake: 0.002, txHash: "0x456", at: 9000 });
    expect(round.status).toBe(ROUND_STATUS.PENDING);
    expect(round.payout).toBeUndefined();
    expect(round.profitLoss).toBeUndefined();
  });
});

describe("mergeCasinoRounds", () => {
  it("drops a pending round once its txHash appears in the resolved chain history (no duplicate)", () => {
    const pending = [normalizePendingRound({ gameKey: "dice", txHash: "0xsame", at: 100 })];
    const chainHistory = [normalizeChainHistoryRound({ game: "dice", betId: "1", stake: "0.001", payout: "0.002", isWin: true, txHash: "0xsame", placedAt: 200 })];
    const merged = mergeCasinoRounds({ chainHistory, pending });
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe(ROUND_STATUS.WON);
  });
  it("sorts newest first by real timestamp", () => {
    const older = normalizeChainHistoryRound({ game: "dice", betId: "1", stake: "0.001", payout: "0", isWin: false, txHash: "0xold", placedAt: 100 });
    const newer = normalizeChainHistoryRound({ game: "dice", betId: "2", stake: "0.001", payout: "0.002", isWin: true, txHash: "0xnew", placedAt: 200 });
    const merged = mergeCasinoRounds({ chainHistory: [older, newer] });
    expect(merged.map((r) => r.id)).toEqual([newer.id, older.id]);
  });
  it("never mutates the same round into two rows even across all three sources at once", () => {
    const gameKey = "keno";
    const txHash = "0xtriple";
    const pending = [normalizePendingRound({ gameKey, txHash, at: 1 })];
    const live = [normalizeLiveResultRound({ gameKey, status: "won", stake: 0.001, potential: 0.003, txnHash: txHash, at: 2 })];
    const chainHistory = [normalizeChainHistoryRound({ game: gameKey, betId: "9", stake: "0.001", payout: "0.003", isWin: true, txHash, placedAt: 3 })];
    const merged = mergeCasinoRounds({ chainHistory, liveResults: live, pending });
    expect(merged).toHaveLength(1);
  });
});
