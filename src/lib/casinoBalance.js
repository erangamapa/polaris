// One shared Casino balance model — every surface that shows the player's
// balance (top HUD's BalanceControl, BetSwirlGame's in-game display/
// insufficient-balance check) derives from this, never a second copy (see
// ONE SHARED BALANCE MODEL). It wraps useDevAwareWallet() (the existing,
// already-dev-aware wallet hook — see that file) rather than forking it, so
// Developer Panel balance presets finally reach gameplay too: previously
// only TopBar read the dev-aware hook, while BetSwirlGame read the raw
// useWallet() directly, so presets like "Loading"/"Error" had no visible
// effect in-game at all (a real, fixed inconsistency, not a hypothetical
// one — see FINAL RESPONSE).
//
// There is deliberately no `reserved`/`total` field: BetSwirl bets debit the
// wallet the instant the bet transaction confirms on-chain (a real transfer,
// not an app-level escrow) — this app has no separate reservation bucket to
// report, and fabricating one would misrepresent how the balance actually
// moves (see BALANCE DEFINITIONS: "if the system immediately debits stake,
// do not fake a separate reserved bucket"). `available` (the real wallet
// balance) is the only number that exists.
import { useCallback, useEffect, useRef } from "react";
import { useDevAwareWallet } from "./useDevAwareWallet";
import { track } from "./telemetry";

export const BALANCE_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  SYNCING: "syncing",
  STALE: "stale",
  ERROR: "error",
};

// Pure status derivation, kept separate from the hook so it's unit-testable
// without rendering (same split as every other pure-logic/hook pair in this
// codebase — see casinoGameLaunch.js vs useCasinoGameLaunch.js).
//
// `hasEverLoaded` is what distinguishes STALE (a refresh failed, but a real
// value is already on screen — safe to keep showing, just flagged) from
// ERROR (no value has ever been obtained — nothing safe to show but the
// error state itself). Order matters: disconnected wins over everything
// (there's no balance concept at all yet), then "no value yet" beats a
// stale/error read of a value that was never real.
export function resolveBalanceStatus({ isConnected, isLoading, isFetching, isError, hasEverLoaded }) {
  if (!isConnected) return BALANCE_STATUS.IDLE;
  if (isLoading) return BALANCE_STATUS.LOADING;
  if (isError) return hasEverLoaded ? BALANCE_STATUS.STALE : BALANCE_STATUS.ERROR;
  if (isFetching) return BALANCE_STATUS.SYNCING;
  return BALANCE_STATUS.READY;
}

export function useCasinoBalance() {
  const wallet = useDevAwareWallet();
  const lastUpdatedAtRef = useRef(null);
  const hasEverLoadedRef = useRef(false);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!wallet.casinoBalanceLoading && !wallet.casinoBalanceError) {
      lastUpdatedAtRef.current = Date.now();
      hasEverLoadedRef.current = true;
    }
  }, [wallet.casinoBalance, wallet.casinoBalanceLoading, wallet.casinoBalanceError]);

  const status = resolveBalanceStatus({
    isConnected: wallet.isConnected,
    isLoading: wallet.casinoBalanceLoading,
    isFetching: wallet.casinoBalanceFetching,
    isError: wallet.casinoBalanceError,
    hasEverLoaded: hasEverLoadedRef.current,
  });

  // Always-fresh ref to the real refetch function (wagmi returns a new one
  // each render, rebound to whatever account/chain is current) — read
  // through a ref rather than closed over directly, so refreshBalance's own
  // identity can stay genuinely stable via useCallback([]) below without
  // ever calling a stale, pre-account-switch refetch (see RACE CONDITIONS:
  // "wallet/currency switch during a pending round").
  const refetchRef = useRef(wallet.refetchCasinoBalance);
  useEffect(() => { refetchRef.current = wallet.refetchCasinoBalance; });

  // One shared refresh action, not every component calling
  // refetchCasinoBalance() independently (see BALANCE REFRESH: "do not let
  // every component fetch independently"). Deduplicates concurrent calls
  // with a plain ref flag — wagmi/react-query already collapses the
  // underlying network request for the same query key, so this only needs
  // to stop this hook's own analytics from double-firing for calls that
  // land in the same tick (e.g. bet-accepted and a manual click at once),
  // not re-implement query dedup itself.
  const refreshBalance = useCallback(({ reason }) => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    const startedAt = Date.now();
    track("casino_balance_refresh_started", { reason });
    Promise.resolve(refetchRef.current())
      .then(() => track("casino_balance_refresh_completed", { reason, durationMs: Date.now() - startedAt }))
      .catch(() => track("casino_balance_refresh_failed", { reason }))
      .finally(() => { refreshingRef.current = false; });
  }, []);

  return {
    status,
    currency: wallet.casinoSymbol,
    available: wallet.casinoBalance,
    lastUpdatedAt: lastUpdatedAtRef.current,
    isConnected: wallet.isConnected,
    refreshBalance,
  };
}
