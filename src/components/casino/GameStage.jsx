import { useEffect, useRef } from "react";
import { RotateCw } from "lucide-react";
import { GAME_LAUNCH_STATUS, isLoadingStatus } from "@/lib/casinoGameLaunch";
import { getGameDisplayMetadata } from "@/lib/gameDisplay";
import { needsRotateHint } from "@/lib/casinoGameplayViewport";
import { GameLoading } from "./GameLoading";
import { GameError } from "./GameError";
import { GameUnavailable } from "./GameUnavailable";

// GameStage owns: the game iframe surface itself, the loading/
// error/unavailable overlay swap, per-game sizing (via lib/gameDisplay.js,
// unchanged from the previous CasinoGameplayFrame/GameLaunchSurface split),
// and its own visual adaptation while fullscreen. It does NOT own the
// outer page chrome (back button, title, utility bar) — those are
// CasinoGamePage's siblings around this component, not wrapped inside it,
// per the spec's "no card inside card" rule: this is the one bordered box
// on the page. The active game page has no recommendation/discovery
// content of any kind below it — removed entirely, not just kept outside
// GameStage's own scope.
//
// `children` mounts the instant a launch is genuinely in flight (REQUESTED/
// LOADING/READY), not only once ready — a provider game's own iframe
// onLoad IS the real ready signal (see useCasinoGameLaunch.js), so it must
// already be mounted (invisibly, under the loading overlay) for that
// signal to ever arrive. UNAVAILABLE/NOT_FOUND never mount it at all —
// there is no real game to initialize.
export function GameStage({
  game,
  launch,
  isFullscreen,
  onRestartFromLoading,
  onRetryFailed,
  onBack,
  onBrowseGames,
  onReportIssue,
  children,
}) {
  const { status, delayed, errorCode, orientation, viewportClass } = launch;
  const headingRef = useRef(null);

  // ACCESSIBILITY: a non-ready status's heading is the one focus target —
  // ready hands focus ownership to whatever the game surface itself wants
  // (ProviderGame never grabs focus programmatically, so this simply
  // leaves focus wherever the user's last action put it, e.g. the
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
      data-test-id="game-stage"
      data-display-profile={displayMeta.displayProfile}
      data-viewport-class={viewportClass}
      data-orientation={orientation}
      // 8px radius, 1px subtle border, dark graphite — no glow, no heavy
      // border, no shadow (see VISUAL DESIGN). Fullscreen removes the
      // height cap and top radius: the fullscreen TARGET is now the
      // Stage+UtilityBar wrapper in CasinoGamePage.jsx (see that file's
      // fullscreenTargetRef note — GameStage itself is no longer the
      // literal fullscreened element, so it doesn't own that ref
      // directly), so this box no longer needs its own bottom safe-area
      // padding — GameUtilityBar is what's flush against the physical
      // bottom edge in fullscreen now; this box only touches the top/
      // left/right edges.
      //
      // TOOLBAR REDESIGN: only the TOP corners round (`rounded-t-lg`, not
      // `rounded-lg`) and there's no bottom border — GameUtilityBar docks
      // flush against this box's bottom edge with zero gap, rounds only
      // its OWN bottom corners, and shares this exact border color/
      // background, so the two read as one continuous card rather than a
      // stage floating above a separate toolbar pill.
      //
      // GAME PAGE POLISH: width is no longer computed here at all — GAME
      // PLAYER FRAME (CasinoGamePage's shared wrapper) now owns the outer
      // width for GameHeader/GameStage/GameUtilityBar alike, so all three
      // always share exactly the same left/right edges. GameStage is
      // always `w-full` of that frame; a COMPACT game's smallness comes
      // entirely from GamePlayerFrame using a narrower max-width for that
      // profile, not from GameStage shrinking independently within a
      // wider frame.
      //
      // ROOT CAUSE FIX (game stage cropping — still applies): height
      // behavior branches on `sizingMode`, one real case per mode:
      //   "fill"      (FLEXIBLE — most provider games, e.g. Tumble): NO
      //               height class at all. `flex-1` alone fills exactly
      //               100% of the hero wrapper's real height (see
      //               CasinoGamePage's useAvailableHeight).
      //   "contain"   (LANDSCAPE_WIDE — aspect-ratio games, e.g. Crash):
      //               letterbox from the declared aspect ratio, clamped so
      //               it can't exceed the available height.
      //   "intrinsic" (COMPACT — Tribet Originals' small centered forms):
      //               a real, deliberate max-height cap; these are simple
      //               bet forms that should stay small and centered (see
      //               readyWrapperClassName below), never "dominate" the
      //               page the way an iframe game should.
      className={
        "relative flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-white/10 bg-[var(--neutral-900)] " +
        (isFullscreen ? "" : "rounded-t-lg border-b-0 " +
          (displayMeta.sizingMode === "contain"
            ? "md:h-auto md:max-h-[var(--gs-max-h)]"
            : displayMeta.sizingMode === "intrinsic"
              ? "md:h-[var(--gs-max-h)]"
              : ""))
      }
      style={
        isFullscreen
          // Edge-to-edge in real browser fullscreen on three sides — top/
          // left/right are this box's own physical screen edges now;
          // bottom belongs to GameUtilityBar (see that component).
          ? {
              paddingTop: "env(safe-area-inset-top, 0px)",
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }
          : {
              "--gs-max-h": `min(100%, ${displayMeta.contentBoxMaxHeightPx}px)`,
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
          {children}
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
