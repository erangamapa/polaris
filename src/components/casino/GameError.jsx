import { AlertTriangle, WifiOff } from "lucide-react";
import { GAME_LAUNCH_STATUS, FAILED_ERROR_CODE } from "@/lib/casinoGameLaunch";

// Copy + actions for every FAILED outcome, plus a "session-expired" variant
// this component supports but nothing currently triggers (see below) — a
// pure lookup, unit-testable without rendering, same pattern the previous
// GameLaunchSurface.jsx's resolveLaunchOutcome used.
//
// SESSION EXPIRED: the task's spec lists this as a distinct state ("Explain
// clearly. Offer: Restart Session, Back to Casino."). This app has no
// existing signal for "the game session itself expired" separate from a
// network/provider failure — on-chain games gate re-auth entirely before
// launch (see App.jsx's `ensureAuth`), and provider games have no session
// concept beyond the iframe being loaded or not. Wiring a real trigger
// would mean inventing new wallet/session-expiry detection, which this
// task's own PRESERVE section rules out ("do not change... wallet logic").
// `resolveGameOutcome` accepts `errorCode: "session-expired"` and renders
// correctly if a real signal is ever wired up (e.g. from a future wallet
// disconnect-mid-game event), but nothing dispatches it today — this is a
// supported variant, not a fabricated one.
export function resolveGameOutcome({ status, errorCode }) {
  if (errorCode === "session-expired") {
    return {
      kind: "session-expired",
      heading: "Your session expired",
      message: "Reconnect to keep playing — your progress up to this point is safe.",
      actions: ["restart-session", "browse"],
    };
  }
  if (status === GAME_LAUNCH_STATUS.FAILED && errorCode === FAILED_ERROR_CODE.TIMEOUT) {
    return {
      kind: "connection-lost",
      heading: "Connection lost",
      message: "Check your connection and try again.",
      actions: ["retry", "browse", "report"],
    };
  }
  if (status === GAME_LAUNCH_STATUS.FAILED) {
    return {
      kind: "provider-error",
      heading: "Unable to launch game",
      message: "We couldn't start this game. Try again or choose another game.",
      actions: ["retry", "browse", "report"],
    };
  }
  return null;
}

const ACTION_LABEL = {
  retry: "Try again",
  browse: "Browse games",
  close: "Close",
  back: "Back to Casino",
  report: "Report Issue",
  "restart-session": "Restart Session",
};

// Never expose the raw provider/SDK error or the Developer Panel's
// simulated reason string (see App.jsx's checkGameAvailability, which
// already collapses every real reason to one signal before this component
// ever sees it) — only the customer-safe heading/message above.
export function GameError({ status, errorCode, onRetry, onBrowseGames, onReportIssue, headingRef }) {
  const outcome = resolveGameOutcome({ status, errorCode });
  if (!outcome) return null;

  const runAction = (action) => {
    if (action === "retry" || action === "restart-session") onRetry();
    else if (action === "report") onReportIssue();
    else onBrowseGames();
  };

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
      data-test-id="game-error"
      data-error-kind={outcome.kind}
    >
      {outcome.kind === "connection-lost" ? (
        <WifiOff className="size-8 text-amber-400" aria-hidden="true" />
      ) : (
        <AlertTriangle className="size-8 text-amber-400" aria-hidden="true" />
      )}
      <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-white outline-none">{outcome.heading}</h2>
      <p className="max-w-xs text-sm text-zinc-400">{outcome.message}</p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {outcome.actions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => runAction(action)}
            data-test-id={`game-error-${action}`}
            className={
              action === "retry" || action === "restart-session"
                ? "rounded-lg [background-image:var(--global-cta-gradient)] px-4 py-2 text-sm font-bold text-[var(--global-cta-text)] hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : "rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            }
          >
            {ACTION_LABEL[action]}
          </button>
        ))}
      </div>
    </div>
  );
}
