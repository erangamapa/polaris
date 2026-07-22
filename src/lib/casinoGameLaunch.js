// CASINO GAME LAUNCH — the one shared state machine every Casino entry
// point (Lobby rail, category page, Favorites, Recently Played, search,
// direct game link) drives instead of the previous scattered booleans
// (`onchainGame`/`providerGame` in App.jsx, each independently truthy/null).
// Kept as a pure reducer (no DOM/timer/game-client access) so the actual
// transition logic is unit-testable without a browser — see
// lib/useCasinoGameLaunch.js for the orchestration (timers, ready signals,
// Recently Played, analytics) built around it.

export const GAME_LAUNCH_STATUS = {
  IDLE: "idle",
  REQUESTED: "requested",
  LOADING: "loading",
  READY: "ready",
  FAILED: "failed",
  UNAVAILABLE: "unavailable",
  // Not in the task's own suggested enum (idle|requested|loading|ready|
  // failed|unavailable|closing) — added because "Game not found" (a
  // malformed/unknown game id) needs distinct customer copy from "Game
  // unavailable" (a real, known game that isn't launchable yet), and the
  // task's own INVALID GAME STATE section requires that distinction. This
  // is exactly the "adapt to the current architecture" the task allows
  // rather than forcing the suggested shape verbatim.
  NOT_FOUND: "not-found",
};

// `closing` (from the task's suggested enum) intentionally has no reachable
// state here — CLOSE resolves directly to IDLE in one synchronous reducer
// step. This app has no exit-transition animation for any existing
// full-screen overlay (MobileFullScreenMenu/CasinoMobileSearchDialog both
// unmount their content immediately on close, animating only the Dialog
// primitive's own enter/exit via Radix, not app state), so a distinct
// "closing" state would have no real UI to represent and nothing to gate.

// Timeout errorCode is distinguished from a generic init failure so the
// launch surface can show the task's two different copy sets (Timeout vs
// Failed) from the same top-level `status: "failed"` rather than a second
// top-level status — see FAILED_ERROR_CODE.TIMEOUT's own call site in
// useCasinoGameLaunch.js.
export const FAILED_ERROR_CODE = {
  INIT_FAILED: "init-failed",
  TIMEOUT: "timeout",
};

export const INITIAL_GAME_LAUNCH_STATE = {
  status: GAME_LAUNCH_STATUS.IDLE,
  gameId: null,
  source: null,
  categoryId: null,
  errorCode: null,
  attempt: 0,
  delayed: false,
  requestedAt: null,
};

// Pure transition table. Every action that targets an in-flight launch
// (LOADING/DELAYED/READY/FAILED) is guarded by `action.gameId === state.gameId`
// — a stale timer or iframe callback from a launch that's since been
// superseded (a different game requested, or the surface closed) must never
// resurrect it (see DUPLICATE LAUNCH PROTECTION: "avoid... two game clients
// or overlays simultaneously").
export function gameLaunchReducer(state, action) {
  switch (action.type) {
    case "REQUEST": {
      // Same game already in flight — ignore the duplicate click entirely
      // (see DUPLICATE LAUNCH PROTECTION: "ignore duplicate request for the
      // same game while loading").
      if (
        state.gameId === action.gameId &&
        (state.status === GAME_LAUNCH_STATUS.REQUESTED || state.status === GAME_LAUNCH_STATUS.LOADING)
      ) {
        return state;
      }
      // A different game requested mid-launch supersedes the old one
      // outright — no confirmation prompt (abandoning a launch that hasn't
      // reached gameplay yet has no real consequence to warn about; see
      // CLOSE AND CANCEL BEHAVIOR: "do not add confirmation unless
      // abandoning gameplay has real consequences"). The stale instance's
      // own cleanup is the orchestration layer's job (disposing the old
      // iframe/timers), triggered by this same state transition.
      return {
        status: GAME_LAUNCH_STATUS.REQUESTED,
        gameId: action.gameId,
        source: action.source ?? null,
        categoryId: action.categoryId ?? null,
        errorCode: null,
        attempt: 1,
        delayed: false,
        requestedAt: action.now ?? null,
      };
    }
    case "UNAVAILABLE":
      return {
        ...INITIAL_GAME_LAUNCH_STATE,
        status: GAME_LAUNCH_STATUS.UNAVAILABLE,
        gameId: action.gameId ?? null,
        source: action.source ?? null,
      };
    case "NOT_FOUND":
      return { ...INITIAL_GAME_LAUNCH_STATE, status: GAME_LAUNCH_STATUS.NOT_FOUND };
    case "LOADING":
      if (state.gameId !== action.gameId) return state;
      return { ...state, status: GAME_LAUNCH_STATUS.LOADING };
    case "DELAYED":
      if (state.gameId !== action.gameId || state.status !== GAME_LAUNCH_STATUS.LOADING) return state;
      return { ...state, delayed: true };
    case "READY":
      if (state.gameId !== action.gameId) return state;
      // Only a genuinely in-flight launch can become ready — a READY signal
      // arriving after FAILED/closed (a slow iframe onLoad firing after the
      // user already gave up) must not resurrect a dead surface.
      if (state.status !== GAME_LAUNCH_STATUS.REQUESTED && state.status !== GAME_LAUNCH_STATUS.LOADING) return state;
      return { ...state, status: GAME_LAUNCH_STATUS.READY, delayed: false, errorCode: null };
    case "FAILED":
      if (state.gameId !== action.gameId) return state;
      return { ...state, status: GAME_LAUNCH_STATUS.FAILED, delayed: false, errorCode: action.errorCode ?? FAILED_ERROR_CODE.INIT_FAILED };
    case "RETRY":
      if (state.gameId !== action.gameId) return state;
      if (state.status !== GAME_LAUNCH_STATUS.FAILED) return state;
      return { ...state, status: GAME_LAUNCH_STATUS.REQUESTED, errorCode: null, delayed: false, attempt: state.attempt + 1, requestedAt: action.now ?? null };
    case "CLOSE":
      return { ...INITIAL_GAME_LAUNCH_STATE };
    default:
      return state;
  }
}

// Whether a launch is currently occupying the surface (used to gate
// duplicate-launch checks and to decide whether App.jsx needs to render the
// surface at all) — anything except idle.
export function isLaunchActive(status) {
  return status !== GAME_LAUNCH_STATUS.IDLE;
}

// Only these two statuses ever show the loading UI (with or without the
// "delayed" copy layered on top) — every other status is a terminal
// outcome (ready, or one of the three non-loading end states).
export function isLoadingStatus(status) {
  return status === GAME_LAUNCH_STATUS.REQUESTED || status === GAME_LAUNCH_STATUS.LOADING;
}
