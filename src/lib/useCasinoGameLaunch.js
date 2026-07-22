import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  gameLaunchReducer, INITIAL_GAME_LAUNCH_STATE, GAME_LAUNCH_STATUS, FAILED_ERROR_CODE, isLoadingStatus,
} from "./casinoGameLaunch";
import { track } from "./telemetry";

// Provider games (vendored iframe apps — see ProviderGame.jsx) are the only
// kind with a real, network-bound init step (the iframe's own onLoad). Onchain
// BetSwirl games have none: `useBetSwirl().ready` is just "wallet already
// connected", already checked by ensureAuth before a launch is ever requested
// (see App.jsx), and the modal's own content (image, controls) is available
// the instant it mounts. Timing/delayed/timeout machinery below only ever
// runs for provider games — applying it to onchain games would mean either
// faking a delay that doesn't exist or leaving unreachable dead code, both of
// which the task's own DO NOT ADD list rules out ("fake progress", "fake
// session resume").
const hasAsyncInit = (game) => game?.kind === "provider";

// Suggested band from LAUNCH TIMING: "~8-12s" / "~20-30s" — picked the
// midpoints rather than the extremes so neither state feels rushed or
// unreasonably patient for a same-origin static asset load.
const DELAYED_MS = 10_000;
const TIMEOUT_MS = 25_000;

// Orchestrates the pure casinoGameLaunch reducer with the side effects a
// reducer can't own: timers, analytics, focus return, and the one real
// "did the surface actually finish loading" signal (reported by the caller
// via markReady/markFailed — see ProviderGame.jsx's onLoad/onError).
//
// `resolveGame(gameId)` — looks up a favId in the real catalog (ALL_GAMES);
// `checkAvailability(game)` — returns a truthy reason string when a game is
// known unavailable before init (non-playable, or a Developer Panel
// simulation), or a falsy value when launch may proceed. Neither reason
// string is ever shown to the player (see UNAVAILABLE GAME STATE: "do not
// fake a maintenance reason") — it only drives analytics' errorCategory and
// the Developer Panel's own round-trip.
export function useCasinoGameLaunch({ resolveGame, checkAvailability, onReady }) {
  const [state, dispatch] = useReducer(gameLaunchReducer, INITIAL_GAME_LAUNCH_STATE);
  const delayedTimer = useRef(null);
  const timeoutTimer = useRef(null);
  const returnFocusRef = useRef(null);
  // Guards onReady/ready-analytics against firing twice for the exact same
  // attempt (a stale iframe onLoad arriving after this render already saw
  // READY once — see the reducer's own guard against resurrecting a dead
  // launch, which this mirrors on the analytics side).
  const readyAnnouncedRef = useRef(null);

  const clearTimers = () => {
    if (delayedTimer.current) clearTimeout(delayedTimer.current);
    if (timeoutTimer.current) clearTimeout(timeoutTimer.current);
    delayedTimer.current = null;
    timeoutTimer.current = null;
  };
  useEffect(() => clearTimers, []);

  // Driven purely by real status transitions, not by every dispatch — the
  // reducer returns the exact same state reference for an ignored duplicate
  // REQUEST or a stale/superseded LOADING/READY/FAILED action (see
  // casinoGameLaunch.js), so React bails out of re-rendering and this effect
  // never re-fires for those. That's what makes "duplicate click creates one
  // launch" and "stale signal can't resurrect a dead launch" hold without
  // this file re-implementing either guard itself.
  // Block-disabled (not eslint-disable-next-line) — oxlint anchors this
  // rule's diagnostic at each individual state.* read inside the callback
  // body, not at the dependency array below, so a single next-line comment
  // above the array only silences one of several reported lines. Keyed
  // deliberately only on [state.status, state.gameId, state.attempt]:
  // resolveGame/onReady are recreated every App.jsx render and must NOT be
  // deps here, or this effect would re-run (re-arming timers, re-firing
  // analytics) on every unrelated parent re-render while a launch is in
  // flight, not just on a real status transition.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (state.status === GAME_LAUNCH_STATUS.REQUESTED) {
      track("casino_game_launch_requested", {
        gameId: state.gameId, source: state.source, categoryId: state.categoryId, attempt: state.attempt,
      });
      const game = resolveGame(state.gameId);
      if (hasAsyncInit(game)) dispatch({ type: "LOADING", gameId: state.gameId });
      else dispatch({ type: "READY", gameId: state.gameId });
      return;
    }
    if (state.status === GAME_LAUNCH_STATUS.LOADING) {
      clearTimers();
      delayedTimer.current = setTimeout(() => dispatch({ type: "DELAYED", gameId: state.gameId }), DELAYED_MS);
      timeoutTimer.current = setTimeout(
        () => dispatch({ type: "FAILED", gameId: state.gameId, errorCode: FAILED_ERROR_CODE.TIMEOUT }),
        TIMEOUT_MS
      );
      return;
    }
    if (state.status === GAME_LAUNCH_STATUS.READY) {
      clearTimers();
      const key = `${state.gameId}:${state.attempt}`;
      if (readyAnnouncedRef.current !== key) {
        readyAnnouncedRef.current = key;
        const loadDuration = state.requestedAt ? Date.now() - state.requestedAt : 0;
        track("casino_game_launch_ready", {
          gameId: state.gameId, source: state.source, categoryId: state.categoryId, attempt: state.attempt, loadDuration,
        });
        onReady?.(resolveGame(state.gameId), state.source);
      }
      return;
    }
    if (state.status === GAME_LAUNCH_STATUS.FAILED) {
      clearTimers();
      track("casino_game_launch_failed", {
        gameId: state.gameId, source: state.source, attempt: state.attempt, errorCategory: state.errorCode,
      });
      return;
    }
    if (state.status === GAME_LAUNCH_STATUS.UNAVAILABLE || state.status === GAME_LAUNCH_STATUS.NOT_FOUND) {
      clearTimers();
      track("casino_game_launch_failed", {
        gameId: state.gameId, source: state.source,
        errorCategory: state.status === GAME_LAUNCH_STATUS.NOT_FOUND ? "not-found" : "unavailable",
      });
      return;
    }
    // idle (including initial mount) — nothing to report, just make sure no
    // timer from a previous launch is still ticking.
    clearTimers();
  }, [state.status, state.gameId, state.attempt]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const launchCasinoGame = useCallback(({ gameId, source, categoryId }) => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const game = resolveGame(gameId);
    if (!game) { dispatch({ type: "NOT_FOUND" }); return; }
    if (checkAvailability(game)) { dispatch({ type: "UNAVAILABLE", gameId: game.favId, source }); return; }
    dispatch({ type: "REQUEST", gameId: game.favId, source, categoryId, now: Date.now() });
  }, [resolveGame, checkAvailability]);

  // Reported by the actual game surface once it has real evidence of
  // success/failure (iframe onLoad/onError — see ProviderGame.jsx). Onchain
  // games never call these; the effect above already resolves them straight
  // to READY, since there's no real signal to wait for (see hasAsyncInit).
  const markReady = useCallback((gameId) => dispatch({ type: "READY", gameId }), []);
  const markFailed = useCallback(
    (gameId, errorCode = FAILED_ERROR_CODE.INIT_FAILED) => dispatch({ type: "FAILED", gameId, errorCode }),
    []
  );

  const retryLaunch = useCallback(() => {
    if (!state.gameId) return;
    track("casino_game_launch_retried", { gameId: state.gameId, source: state.source, attempt: state.attempt + 1 });
    dispatch({ type: "RETRY", gameId: state.gameId, now: Date.now() });
  }, [state.gameId, state.source, state.attempt]);

  const closeLaunch = useCallback(() => {
    if (state.status === GAME_LAUNCH_STATUS.IDLE) return;
    if (isLoadingStatus(state.status)) {
      track("casino_game_launch_cancelled", { gameId: state.gameId, source: state.source, attempt: state.attempt });
    }
    track("casino_game_closed", { gameId: state.gameId, source: state.source, status: state.status });
    clearTimers();
    dispatch({ type: "CLOSE" });
    const el = returnFocusRef.current;
    if (el && document.contains(el)) el.focus();
    returnFocusRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status, state.gameId, state.source, state.attempt]);

  return { state, launchCasinoGame, markReady, markFailed, retryLaunch, closeLaunch };
}
