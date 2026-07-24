import { cloneElement, isValidElement, useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { GAME_LAUNCH_STATUS, FAILED_ERROR_CODE, isLoadingStatus } from "@/lib/casinoGameLaunch";
import { getGameDisplayMetadata } from "@/lib/gameDisplay";
import { CasinoGameplayFrame } from "./CasinoGameplayFrame";

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

// Decides WHAT renders inside the one shared CasinoGameplayFrame for the
// current launch status — the frame itself (outer chrome: fixed
// positioning, header, close button, viewport-aware content-box sizing) is
// now fully owned by CasinoGameplayFrame.jsx, not this file (see GAME
// CONTAINER task: "outer frame ownership should be shared"). This is what
// makes loading -> ready -> failed all share identical outer bounds: every
// status mounts the exact same <CasinoGameplayFrame>, only the content
// inside its content-box differs.
export function GameLaunchSurface({ launch, game, onClose, onRetry, onBrowseGames, onOpenInfo, gameInfoOpen, devPanelOpen, children }) {
  const { status, delayed, errorCode } = launch;
  const headingRef = useRef(null);
  // Set only by BetSwirlGame (via the cloned `onBusyChange` prop below) while
  // an on-chain bet is mid-confirmation — the one real "abandoning this has a
  // consequence" case in this app (see CLOSE AND CANCEL BEHAVIOR: "do not add
  // confirmation unless abandoning gameplay has real consequences" — this IS
  // one). ProviderGame never calls it, so this stays false for every
  // provider game, matching its previous (unconditional) close behavior.
  //
  // FINAL QA fix: also true whenever Game Info is open on top of gameplay
  // (`gameInfoOpen`, from App.jsx's `infoFavId`). CasinoGameplayFrame's own
  // Escape-closes-the-game listener and GameInfoPanel's own Escape-closes-
  // itself listener are both bound to `window`, so without this a single
  // Escape press fired both at once — closing Game Info AND the whole game
  // underneath it, instead of Escape closing only the topmost surface like
  // every other stacked overlay in this app. `closeDisabled` already existed
  // for exactly this class of "something on top has a reason to own Escape
  // right now" case, so this reuses it rather than adding a second signal.
  //
  // Also true whenever the Developer Panel is open (`devPanelOpen`, from
  // App.jsx's devMock.panelOpen — the Panel visually sits above the game,
  // z-[var(--z-critical-alert)] vs. this frame's z-50). Without this, the
  // SAME collision existed here too: both the Panel's own Escape-closes-
  // itself listener (useDevPanelShortcut.js) and this frame's Escape-
  // closes-the-game listener are bound to `window`. It happened to not be
  // visibly reachable before this fix only by accident — a real Playwright
  // trace showed the Panel's synchronous `useSyncExternalStore` update was
  // tearing down and re-adding this frame's own listener (its effect deps
  // churn on every App re-render) DURING the same event dispatch, and per
  // DOM semantics a listener removed before its turn during dispatch is
  // simply skipped — not a deliberate guarantee, and it would silently stop
  // holding the moment those effect deps were ever stabilized (e.g. a future
  // `useCallback` "cleanup"). Suppressing explicitly here makes the already-
  // correct "Escape closes only the topmost overlay" behavior deterministic
  // instead of an accident of render timing.
  const [closeDisabled, setCloseDisabled] = useState(false);
  const escapeSuppressed = closeDisabled || gameInfoOpen || devPanelOpen;

  // ACCESSIBILITY: "failure state receives focus" — the status heading is
  // the one focus target across every non-ready branch; ready hands focus
  // ownership to CasinoGameplayFrame itself (see that file).
  useEffect(() => {
    if (status === GAME_LAUNCH_STATUS.READY || status === GAME_LAUNCH_STATUS.IDLE) return;
    headingRef.current?.focus();
  }, [status, errorCode]);

  if (status === GAME_LAUNCH_STATUS.IDLE) return null;

  // `children` (the real BetSwirlGame/ProviderGame content) mounts as soon as
  // a launch is genuinely in flight — NOT only once ready — because the
  // provider game's own iframe onLoad IS the real ready signal this surface
  // is waiting for (see useCasinoGameLaunch.js/ProviderGame.jsx): if it never
  // mounted until ready, ready could never arrive. It stays mounted, visually
  // covered by the status overlay below, until either it reports ready
  // (overlay is removed, revealing it — same content-box, no jump) or the
  // launch fails/times out (overlay's terminal branch replaces it, and NOT
  // rendering children any longer is what disposes the stale iframe/client —
  // see RETRY LOGIC/FAILED LAUNCH STATE: "old client/iframe is disposed").
  // UNAVAILABLE/NOT_FOUND never mount children at all — there is no real
  // game to initialize (see UNAVAILABLE GAME STATE: "do not open a loading
  // state first").
  const showChildren = status === GAME_LAUNCH_STATUS.REQUESTED || status === GAME_LAUNCH_STATUS.LOADING || status === GAME_LAUNCH_STATUS.READY;
  const mode = game?.kind === "onchain" ? "first-party" : "embedded";
  const title = game?.title ?? "Game";
  const outcome = resolveLaunchOutcome({ status, errorCode });
  // "intrinsic" (Tribet Originals' compact profile, see lib/gameDisplay.js):
  // BetSwirlGame's own root already self-constrains to max-w-md and has no
  // reason to stretch to the box's full height — center it in the box
  // instead of pinning it to the top (this file's default flex-col
  // behavior otherwise leaves it flush against the header with empty
  // space below, the exact "excessive empty space" case the inventory
  // doc's audit found). "fill" profiles (landscape-wide/flexible) keep
  // today's exact unchanged behavior: the iframe fills the whole box.
  const readyWrapperClassName = getGameDisplayMetadata(game).sizingMode === "intrinsic"
    ? "flex h-full w-full flex-col items-center justify-center"
    : "flex h-full w-full flex-col";

  const runAction = (action) => {
    if (action === "retry") onRetry();
    else if (action === "browse" || action === "back") onBrowseGames();
    else onClose();
  };

  // Injects onBusyChange without changing the `children: ReactNode` contract
  // App.jsx's call sites use (`<BetSwirlGame .../>`/`<ProviderGame .../>` are
  // still plain elements there) — only this file, which structurally owns
  // the close button's disabled state, needs to see it.
  const content = isValidElement(children) ? cloneElement(children, { onBusyChange: setCloseDisabled }) : children;

  return (
    <CasinoGameplayFrame game={game} mode={mode} onClose={onClose} closeDisabled={escapeSuppressed} onOpenInfo={game ? onOpenInfo : undefined}>
      {showChildren && (
        <div className={status === GAME_LAUNCH_STATUS.READY ? readyWrapperClassName : "absolute inset-0 flex flex-col"}>
          {content}
        </div>
      )}

      {status !== GAME_LAUNCH_STATUS.READY && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900/98 p-6 text-center backdrop-blur-sm"
          data-test-id="game-launch-status"
          data-launch-status={status}
        >
          {isLoadingStatus(status) ? (
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="size-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">{title}</h2>
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
              <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">{outcome.heading}</h2>
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
      )}
    </CasinoGameplayFrame>
  );
}
