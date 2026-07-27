import { cloneElement, isValidElement, useEffect, useRef } from "react";
import { RotateCw } from "lucide-react";
import { GAME_LAUNCH_STATUS, isLoadingStatus } from "@/lib/casinoGameLaunch";
import { getGameDisplayMetadata } from "@/lib/gameDisplay";
import { needsRotateHint } from "@/lib/casinoGameplayViewport";
import { GameLoading } from "./GameLoading";
import { GameError } from "./GameError";
import { GameUnavailable } from "./GameUnavailable";

// GameStage owns: the iframe/BetSwirlGame surface itself, the loading/
// error/unavailable overlay swap, per-game sizing (via lib/gameDisplay.js,
// unchanged from the previous CasinoGameplayFrame/GameLaunchSurface split),
// and its own visual adaptation while fullscreen. It does NOT own the
// outer page chrome (back button, title, toolbar, recommendations) — those
// are CasinoGamePage's siblings around this component, not wrapped inside
// it, per the spec's "no card inside card" rule: this is the one bordered
// box on the page.
//
// `children` mounts the instant a launch is genuinely in flight (REQUESTED/
// LOADING/READY), not only once ready — a provider game's own iframe
// onLoad IS the real ready signal (see useCasinoGameLaunch.js), so it must
// already be mounted (invisibly, under the loading overlay) for that
// signal to ever arrive. UNAVAILABLE/NOT_FOUND never mount it at all —
// there is no real game to initialize.
export function GameStage({
  stageRef,
  game,
  launch,
  isFullscreen,
  onRestartFromLoading,
  onRetryFailed,
  onBack,
  onBrowseGames,
  onReportIssue,
  onBusyChange,
  children,
}) {
  const { status, delayed, errorCode, orientation, viewportClass } = launch;
  const headingRef = useRef(null);

  // Only BetSwirlGame reads `onBusyChange` (reporting a pending on-chain
  // bet confirmation — the one real "abandoning this has a consequence"
  // case in this app); ProviderGame ignores the extra prop. CasinoGamePage
  // uses this to disable its "Back to Casino" header control while busy —
  // see that file. Same technique the previous GameLaunchSurface used.
  const content = isValidElement(children) ? cloneElement(children, { onBusyChange }) : children;

  // ACCESSIBILITY: a non-ready status's heading is the one focus target —
  // ready hands focus ownership to whatever the game surface itself wants
  // (BetSwirlGame/ProviderGame never grab focus programmatically, so this
  // simply leaves focus wherever the user's last action put it, e.g. the
  // Play/lobby-card control they clicked).
  useEffect(() => {
    if (status === GAME_LAUNCH_STATUS.READY || status === GAME_LAUNCH_STATUS.IDLE) return;
    headingRef.current?.focus();
  }, [status, errorCode]);

  const displayMeta = getGameDisplayMetadata(game);
  const rotateHint = needsRotateHint(game, orientation);
  const showChildren = status === GAME_LAUNCH_STATUS.REQUESTED || status === GAME_LAUNCH_STATUS.LOADING || status === GAME_LAUNCH_STATUS.READY;

  // "intrinsic" (Tribet Originals' compact profile): center content instead
  // of pinning it to the top, matching the previous GameLaunchSurface
  // behavior exactly (see lib/gameDisplay.js).
  const readyWrapperClassName = displayMeta.sizingMode === "intrinsic"
    ? "flex h-full w-full flex-col items-center justify-center"
    : "flex h-full w-full flex-col";

  return (
    <div
      ref={stageRef}
      data-test-id="game-stage"
      data-display-profile={displayMeta.displayProfile}
      data-viewport-class={viewportClass}
      data-orientation={orientation}
      // 8px radius, 1px subtle border, dark graphite — no glow, no heavy
      // border, no shadow (see VISUAL DESIGN). Fullscreen removes the max-
      // width/height caps and radius: native fullscreen already IS the
      // whole screen, so the box shouldn't visually stay "boxed" inside it.
      //
      // ROOT CAUSE FIX (game stage cropping): height behavior now branches
      // on `sizingMode` explicitly, one real case per mode, instead of
      // inferring from `preferredAspectRatio`'s truthiness:
      //   "fill"      (FLEXIBLE — most provider games, e.g. Tumble): NO
      //               height class at all. `flex-1` alone fills exactly
      //               100% of the hero wrapper's real height (see
      //               CasinoGamePage's useAvailableHeight) — this used to
      //               also carry `md:h-[min(100%,var(--gs-max-h))]`, an
      //               explicit height capped at a flat 720px left over
      //               from the old full-viewport-modal design, which is
      //               almost always shorter than the real available space
      //               on a normal desktop screen (the actual "shallow
      //               strip" bug — the box never got a chance to dominate
      //               the page because it was never asked to).
      //   "contain"   (LANDSCAPE_WIDE — aspect-ratio games, e.g. Crash):
      //               unchanged — letterbox from the declared aspect
      //               ratio, clamped so it can't exceed the (now genuinely
      //               resolvable) available height.
      //   "intrinsic" (COMPACT — Tribet Originals' small centered forms):
      //               unchanged — a real, deliberate max-size cap; these
      //               are simple bet forms that should stay small and
      //               centered (see readyWrapperClassName below), never
      //               "dominate" the page the way an iframe game should.
      className={
        "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-white/10 bg-[var(--neutral-900)] " +
        (isFullscreen ? "" : "mx-auto rounded-lg md:w-[min(100%,var(--gs-max-w))] " +
          (displayMeta.sizingMode === "contain"
            ? "md:h-auto md:max-h-[min(100%,var(--gs-max-h))]"
            : displayMeta.sizingMode === "intrinsic"
              ? "md:h-[min(100%,var(--gs-max-h))]"
              : ""))
      }
      style={
        isFullscreen
          // Edge-to-edge in real browser fullscreen — reserve the safe-area
          // insets here (the previous CasinoGameplayFrame did this at its
          // own outer, always-edge-to-edge level; this is the one place in
          // the new layout that's ever actually flush with the screen edge,
          // so it's the one place that still needs to ask).
          ? {
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }
          : {
              "--gs-max-w": `${displayMeta.contentBoxMaxWidthPx}px`,
              "--gs-max-h": `${displayMeta.contentBoxMaxHeightPx}px`,
              ...(displayMeta.sizingMode === "contain" ? { aspectRatio: displayMeta.preferredAspectRatio } : {}),
            }
      }
    >
      {rotateHint && (
        <div
          role="status"
          data-test-id="gameplay-rotate-hint"
          className="absolute inset-x-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs font-medium text-zinc-200"
        >
          <RotateCw className="size-4 shrink-0" aria-hidden="true" />
          For the best experience, rotate your device.
        </div>
      )}

      {showChildren && (
        <div className={status === GAME_LAUNCH_STATUS.READY ? readyWrapperClassName : "absolute inset-0 flex flex-col opacity-0"}>
          {content}
        </div>
      )}

      {isLoadingStatus(status) && (
        <GameLoading
          game={game}
          delayed={delayed}
          onRestart={onRestartFromLoading}
          // Matches the previous "Cancel" button exactly: a plain close,
          // keeping whatever Casino category was active — NOT the
          // Lobby-resetting `onBrowseGames` the terminal error/unavailable
          // states below use.
          onBack={onBack}
          onReportIssue={onReportIssue}
        />
      )}
      {status === GAME_LAUNCH_STATUS.FAILED && (
        <GameError status={status} errorCode={errorCode} onRetry={onRetryFailed} onBrowseGames={onBrowseGames} onReportIssue={onReportIssue} headingRef={headingRef} />
      )}
      {(status === GAME_LAUNCH_STATUS.UNAVAILABLE || status === GAME_LAUNCH_STATUS.NOT_FOUND) && (
        <GameUnavailable status={status} onBrowseGames={onBrowseGames} headingRef={headingRef} />
      )}
    </div>
  );
}
