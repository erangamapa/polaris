import { describe, it, expect } from "vitest";
import { resolveBalanceStatus, BALANCE_STATUS } from "./casinoBalance";

// BALANCE UPDATES, INSUFFICIENT BALANCE, AND SETTLEMENT FEEDBACK — scenario
// coverage. resolveBalanceStatus is the one place "what should the player
// see right now" gets decided, so its correctness is what every consumer
// (BalanceControl, BetSwirlGame) depends on.

describe("resolveBalanceStatus", () => {
  it("is idle when no wallet is connected, regardless of any other flag", () => {
    expect(resolveBalanceStatus({ isConnected: false, isLoading: true, isFetching: true, isError: true, hasEverLoaded: true })).toBe(BALANCE_STATUS.IDLE);
  });

  it("is loading when connected but no value has ever arrived yet", () => {
    expect(resolveBalanceStatus({ isConnected: true, isLoading: true, isFetching: false, isError: false, hasEverLoaded: false })).toBe(BALANCE_STATUS.LOADING);
  });

  it("is error when a refresh fails and no good value was ever obtained", () => {
    expect(resolveBalanceStatus({ isConnected: true, isLoading: false, isFetching: false, isError: true, hasEverLoaded: false })).toBe(BALANCE_STATUS.ERROR);
  });

  it("is stale (not error) when a refresh fails but a real value is already on screen", () => {
    expect(resolveBalanceStatus({ isConnected: true, isLoading: false, isFetching: false, isError: true, hasEverLoaded: true })).toBe(BALANCE_STATUS.STALE);
  });

  it("is syncing when a background refetch is in flight over an existing good value", () => {
    expect(resolveBalanceStatus({ isConnected: true, isLoading: false, isFetching: true, isError: false, hasEverLoaded: true })).toBe(BALANCE_STATUS.SYNCING);
  });

  it("is ready when connected, not loading/fetching/erroring", () => {
    expect(resolveBalanceStatus({ isConnected: true, isLoading: false, isFetching: false, isError: false, hasEverLoaded: true })).toBe(BALANCE_STATUS.READY);
  });
});
