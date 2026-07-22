import { Fragment, useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { GAME_LAUNCH_STATUS, FAILED_ERROR_CODE, isLoadingStatus } from "@/lib/casinoGameLaunch";

// Copy + actions for every non-loading, non-ready outcome — pure lookup, no
// component state, so it's unit-testable without rendering (see
// casinoGameLaunch.test.js). Every string here is the exact customer-safe
// copy the task specifies; the real reason (dev-only simulation value,
// specific SDK error) never reaches this layer — see checkAvailability in
// App.jsx, which already collapses every unavailable reason to one signal
// before this component ever sees it.
export function resolveLaunchOutcome({ status, errorCode }) {
  if (status === GAME_LAUNCH_STATUS.UNAVAILABLE) {
    return { heading: "Game unavailable", message: "This game is not available right now.", actions: ["browse", "close"] };
  }
  if (status === GAME_LAUNCH_STATUS.NOT_FOUND) {
    return { heading: "Game not found", message: "The game link may be invalid or no longer available.", actions: ["browse", "back"] };
  }
  if (status === GAME_LAUNCH_STATUS.FAILED && errorCode === FAILED_ERROR_CODE.TIMEOUT) {
    return { heading: "Game took too long to load", message: "Check your connection and try again.", actions: ["retry", "close"] };
  }
  if (status === GAME_LAUNCH_STATUS.FAILED) {
    return { heading: "Unable to launch game", message: "We couldn't start this game. Try again or choose another game.", actions: ["retry", "browse", "close"] };
  }
  return null;
}

const ACTION_LABEL = { retry: "Try again", browse: "Browse games", close: "Close", back: "Back to Casino" };

// The one shared chrome every non-ready Casino launch state renders inside
// (loading/delayed, unavailable, not-found, failed, timeout) — a single
// fixed full-screen surface so the player is never looking at a bare Lobby
// while a launch is in flight (see LAUNCH ENTRY FEEDBACK). Once `status`
// reaches "ready" this renders its own `children` untouched (the existing
// BetSwirlGame/ProviderGame) and gets out of the way entirely — this
// component owns none of their internal chrome, controls, or gameplay UI
// (see DO NOT ADD: "do not redesign the game UI itself").
export function GameLaunchSurface({ launch, game, onClose, onRetry, onBrowseGames, children }) {
  const { status, delayed, errorCode } = launch;
  const headingRef = useRef(null);

  // ACCESSIBILITY: "failure state receives focus" / loading has a live
  // region, not silence — the heading is the one stable focus target across
  // every non-ready branch below.
  useEffect(() => {
    if (status === GAME_LAUNCH_STATUS.READY || status === GAME_LAUNCH_STATUS.IDLE) return;
    headingRef.current?.focus();
  }, [status, errorCode]);

  // Escape is predictable everywhere this surface is showing its own chrome
  // (loading or a terminal outcome) — once ready, BetSwirlGame/ProviderGame
  // own their own content and this component no longer renders any chrome to
  // attach the listener's semantics to, so it skips wiring it at all rather
  // than fight whatever the real game surface does with Escape itself.
  useEffect(() => {
    if (status === GAME_LAUNCH_STATUS.READY || status === GAME_LAUNCH_STATUS.IDLE) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, onClose]);

  if (status === GAME_LAUNCH_STATUS.IDLE) return null;

  // `children` (the real BetSwirlGame/ProviderGame) mounts as soon as a
  // launch is genuinely in flight — NOT only once ready — because the
  // provider game's own iframe onLoad IS the real ready signal this surface
  // is waiting for (see useCasinoGameLaunch.js/ProviderGame.jsx): if it never
  // mounted until ready, ready could never arrive. It stays mounted, visually
  // covered by this component's own loading chrome, until either it reports
  // ready (chrome is removed, revealing it) or the launch fails/times out
  // (chrome's terminal branch replaces it, and NOT rendering children any
  // longer is what disposes the stale iframe/client — see RETRY LOGIC/FAILED
  // LAUNCH STATE: "old client/iframe is disposed"). UNAVAILABLE/NOT_FOUND
  // never mount children at all — there is no real game to initialize (see
  // UNAVAILABLE GAME STATE: "do not open a loading state first").
  const showChildren = status === GAME_LAUNCH_STATUS.REQUESTED || status === GAME_LAUNCH_STATUS.LOADING || status === GAME_LAUNCH_STATUS.READY;
  if (status === GAME_LAUNCH_STATUS.READY) return children;

  const title = game?.title ?? "Game";
  const outcome = resolveLaunchOutcome({ status, errorCode });

  const runAction = (action) => {
    if (action === "retry") onRetry();
    else if (action === "browse" || action === "back") onBrowseGames();
    else onClose();
  };

  return (
    <Fragment>
      {showChildren && children}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={outcome ? outcome.heading : `Loading ${title}`}
        // z-[60] — one layer above the real game surface it's covering
        // (BetSwirlGame/ProviderGame are each z-50, see those files), so this
        // chrome reliably paints on top of the just-mounted, not-yet-ready
        // iframe/modal underneath rather than relying on DOM source order.
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center backdrop-blur"
        data-test-id="game-launch-surface"
        data-launch-status={status}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-test-id="game-launch-close"
          className="absolute right-4 top-[max(1rem,env(safe-area-inset-top,0px))] grid h-11 w-11 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          ✕
        </button>

        {isLoadingStatus(status) ? (
          <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 text-white">
            <Loader2 className="size-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            <h1 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">{title}</h1>
            <p className="text-sm text-zinc-400">Loading game…</p>
            {delayed && (
              <div className="mt-2 max-w-xs rounded-lg border border-white/10 bg-zinc-900 p-4" data-test-id="game-launch-delayed">
                <p className="text-sm font-semibold text-white">Still loading</p>
                <p className="mt-1 text-xs text-zinc-400">This is taking longer than expected.</p>
                <button
                  type="button"
                  onClick={onClose}
                  data-test-id="game-launch-cancel"
                  className="mt-3 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex max-w-xs flex-col items-center gap-3 text-white">
            <AlertTriangle className="size-8 text-amber-400" aria-hidden="true" />
            <h1 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">{outcome.heading}</h1>
            <p className="text-sm text-zinc-400">{outcome.message}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {outcome.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => runAction(action)}
                  data-test-id={`game-launch-${action}`}
                  className={
                    action === "retry"
                      ? "rounded-lg bg-[var(--casino-primary)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--casino-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      : "rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  }
                >
                  {ACTION_LABEL[action]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
}
