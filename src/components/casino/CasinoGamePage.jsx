import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GAME_LAUNCH_STATUS } from "@/lib/casinoGameLaunch";
import { GameHeader } from "./GameHeader";
import { GameStage } from "./GameStage";
import { GameToolbar } from "./GameToolbar";
import { GameRecommendations } from "./GameRecommendations";
import { getGameDisplayMetadata } from "@/lib/gameDisplay";

// Measures how much vertical space is available below this page's own top
// edge, down to the bottom of the viewport — not a hardcoded "viewport
// minus header minus toolbar" pixel guess (see GAME SIZE: "no arbitrary
// fixed height"). Because it reads the wrapper's real, rendered position
// (`getBoundingClientRect().top`), it automatically accounts for the
// TopBar's actual height, the safe-area inset, and the wrong-network
// banner when it's showing — none of which need to be known ahead of
// time or kept in sync with this file. Re-measures on resize/orientation
// change only (matching the app's one existing viewport-read convention,
// see lib/casinoGameplayViewport.js's own "do not introduce multiple
// competing resize systems" note) — not on every scroll frame.
function useAvailableHeight(ref) {
  const [height, setHeight] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setHeight(Math.max(320, Math.round(vh - top - 16)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [ref]);
  return height;
}

// The complete Casino game-launch experience — replaces the previous
// full-viewport CasinoGameplayFrame/GameLaunchSurface modal. Renders
// INLINE where CasinoLobby renders (see App.jsx: `product === "casino"`
// now branches between this and CasinoLobby, rather than this being a
// page-level overlay on top of everything). The persistent shell — top
// header, sidebar, wallet — is a sibling several levels up and is never
// touched, hidden, or remounted by anything in this file.
export function CasinoGamePage({
  game,
  launch,
  isFav,
  onFav,
  recentIds,
  onLaunchOnchain,
  onLaunchProvider,
  onRestartFromLoading,
  onRetryFailed,
  onBack,
  onBrowseGames,
  onOpenGameInfo,
  onReportIssue,
  children,
}) {
  const { status } = launch;
  const wrapperRef = useRef(null);
  const stageRef = useRef(null);
  const availableHeight = useAvailableHeight(wrapperRef);

  const [theatreMode, setTheatreMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Theatre/fullscreen reset whenever the actual game changes (a fresh
  // launch from Recommendations while already playing something else) —
  // neither preference should silently carry over to a different game.
  useEffect(() => {
    setTheatreMode(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [game?.favId]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else stageRef.current?.requestFullscreen?.().catch(() => {});
  };

  const supportsFullscreen = Boolean(game) && getGameDisplayMetadata(game).supportsFullscreen;
  const tileProps = { onLaunchOnchain, onLaunchProvider, isFav, onFav };

  return (
    <div
      ref={wrapperRef}
      data-test-id="casino-game-page"
      data-theatre-mode={theatreMode || undefined}
      className="animate-game-page-fade-in flex w-full flex-col"
      style={{ minHeight: availableHeight != null ? `${availableHeight}px` : undefined }}
    >
      {/* `onBack` (header) vs `onBrowseGames` (stage's error/unavailable
          actions) are deliberately different callbacks, matching the
          previous CasinoGameplayFrame/GameLaunchSurface split: leaving a
          READY game via the header keeps whatever Casino category you
          launched from; recovering from an error/unavailable game
          explicitly returns to the Lobby (see App.jsx's closeGame vs
          `() => { closeGame(); setCasinoCategory("Lobby"); }`). */}
      <GameHeader
        game={game}
        onBack={onBack}
        backDisabled={busy}
        isFav={isFav}
        onFav={onFav}
        onOpenMenu={onOpenGameInfo}
      />

      <div className={"flex min-h-0 flex-1 flex-col " + (theatreMode ? "py-1" : "py-3")}>
        <GameStage
          stageRef={stageRef}
          game={game}
          launch={launch}
          isFullscreen={isFullscreen}
          onRestartFromLoading={onRestartFromLoading}
          onRetryFailed={onRetryFailed}
          onBack={onBack}
          onBrowseGames={onBrowseGames}
          onReportIssue={onReportIssue}
          onBusyChange={setBusy}
        >
          {children}
        </GameStage>
      </div>

      <GameToolbar
        onOpenInfo={onOpenGameInfo}
        onReportIssue={onReportIssue}
        theatreMode={theatreMode}
        onToggleTheatre={() => setTheatreMode((v) => !v)}
        supportsFullscreen={supportsFullscreen}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {status === GAME_LAUNCH_STATUS.READY && !theatreMode && (
        <GameRecommendations game={game} recentIds={recentIds} tileProps={tileProps} />
      )}
    </div>
  );
}
