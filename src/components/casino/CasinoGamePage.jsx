import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GameHeader } from "./GameHeader";
import { GameStage } from "./GameStage";
import { GameUtilityBar } from "./GameUtilityBar";
import { GamePlayerFrame } from "./GamePlayerFrame";
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
//
// ROOT CAUSE FIX (game stage cropping): this value used to be applied as
// the page wrapper's `minHeight` while the wrapper itself stayed a plain
// `flex flex-col` with an otherwise-auto height. A flex column with only a
// min-height FLOOR (not a definite height) never gives its `flex-1`
// children a real size to grow into — each flex-grow descendant instead
// falls back to its own intrinsic content size, and that collapse
// cascades all the way down through GameStage's `flex-1`/`h-full` chain to
// the iframe's native ~150px UA default (verified empirically: every
// ancestor down from this wrapper measured `height:auto`/small, and the
// iframe rendered at exactly 150px regardless of viewport size). The fix
// is applying this measured value as a real `height` (see below) on the
// one wrapper that actually needs to fill the viewport — not a CSS
// work-around on GameStage itself, which was never the actual problem.
function useAvailableHeight(ref) {
  const [height, setHeight] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const top = el.getBoundingClientRect().top;
      // Measure against the scroll container's content box, not the visual
      // viewport. The viewport bottom sits BELOW the mobile bottom nav and
      // below <main>'s own bottom padding, and the frame may occupy neither —
      // sizing to it overflowed the page by hundreds of pixels and pushed the
      // nav off-screen entirely. The container already accounts for the nav,
      // the padding and any safe-area inset, so nothing here needs hardcoding.
      const container = el.closest("main");
      const limit = container
        ? container.getBoundingClientRect().bottom - parseFloat(getComputedStyle(container).paddingBottom || "0")
        : window.visualViewport?.height ?? window.innerHeight;
      // Mirrors this page's own pb-[20px+safe] / sm:pb-8.
      const sm = window.matchMedia("(min-width: 640px)").matches;
      const ownBottomPadding = sm ? 32 : 20;
      setHeight(Math.max(280, Math.round(limit - top - ownBottomPadding)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const container = el.closest("main");
    const ro = container && typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(container);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      ro?.disconnect();
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
  onRestartFromLoading,
  onRetryFailed,
  onBack,
  onBrowseGames,
  onOpenGameInfo,
  onReportIssue,
  children,
}) {
  const wrapperRef = useRef(null);
  // PRODUCTION HARDENING — fullscreen target. This used to be GameStage's
  // own root element, but that made GameUtilityBar (a SIBLING of GameStage,
  // not a descendant) entirely unreachable while genuinely fullscreen: the
  // Fullscreen API makes everything outside the fullscreened element inert
  // — confirmed empirically (a real click, a forced click, and a
  // focus()+Enter keyboard activation on an element outside the
  // fullscreened subtree all failed to register while active). That broke
  // the task's own "exit through the Fullscreen control" requirement — the
  // button that was supposed to exit fullscreen was unreachable the moment
  // fullscreen began. Targeting this wrapper (Stage + UtilityBar together,
  // NOT the Header — Back/Favorite/More staying outside fullscreen matches
  // "fullscreen is about the game surface," not the whole contained page)
  // keeps Game Info/Report Issue/Fullscreen itself reachable throughout.
  const fullscreenTargetRef = useRef(null);
  const availableHeight = useAvailableHeight(wrapperRef);

  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === fullscreenTargetRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Fullscreen resets whenever the actual game changes (a fresh launch
  // while already playing something else) — the preference shouldn't
  // silently carry over to a different game.
  useEffect(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, [game?.favId]);

  // COMPONENT UNMOUNT SAFETY (ARENA-SWITCH TEARDOWN) — this page can
  // disappear for reasons that never touch `game?.favId` at all: an arena
  // switch, Casino-internal navigation while playing, or any other route
  // change that unmounts this component wholesale (see App.jsx's
  // `<ArenaErrorBoundary key={product}>` — a different `product` remounts
  // the whole subtree). Without this, real browser fullscreen would only
  // ever get exited via the browser's OWN "element removed from DOM" fail-
  // safe (which does fire, but as an uncontrolled side effect after the
  // fact, not a deliberate part of teardown) rather than a proactive exit.
  // Captures the fullscreen target at mount time (not re-read from the ref
  // inside the cleanup — react-hooks/exhaustive-deps flags that pattern
  // since a ref's `.current` isn't guaranteed stable by the time cleanup
  // runs) so this never exits a fullscreen element that belongs to
  // something else.
  useEffect(() => {
    const targetEl = fullscreenTargetRef.current;
    return () => {
      if (document.fullscreenElement === targetEl) document.exitFullscreen?.().catch(() => {});
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    else fullscreenTargetRef.current?.requestFullscreen?.().catch(() => {});
  };

  const displayMeta = getGameDisplayMetadata(game);
  const supportsFullscreen = Boolean(game) && displayMeta.supportsFullscreen;

  return (
    // GAME PAGE POLISH — the active game page now ends after
    // GameUtilityBar: no recommendation rows, carousels, or any other
    // content below it (see the removed GameRecommendations/GameToolbar).
    // Bottom padding here is just enough to keep the utility bar off the
    // viewport edge — not a reserved section for anything else. Mobile
    // adds the safe-area inset on top of the base amount (home-indicator/
    // gesture-bar clearance); desktop has no such concern, so it's a flat
    // value there.
    <div
      data-test-id="casino-game-page"
      className="animate-game-page-fade-in flex w-full flex-col pb-[calc(20px+env(safe-area-inset-bottom,0px))] sm:pb-8"
    >
      {/* `onBack` (header) vs `onBrowseGames` (stage's error/unavailable
          actions) are deliberately different callbacks, matching the
          previous CasinoGameplayFrame/GameLaunchSurface split: leaving a
          READY game via the header keeps whatever Casino category you
          launched from; recovering from an error/unavailable game
          explicitly returns to the Lobby (see App.jsx's closeGame vs
          `() => { closeGame(); setCasinoCategory("Lobby"); }`). */}
      <GamePlayerFrame
        frameRef={wrapperRef}
        height={availableHeight}
        maxWidthPx={displayMeta.contentBoxMaxWidthPx}
      >
        <div className="mb-2.5 shrink-0">
          <GameHeader
            game={game}
            onBack={onBack}
            isFav={isFav}
            onFav={onFav}
            onOpenMenu={onOpenGameInfo}
          />
        </div>

        {/* TOOLBAR REDESIGN: no gap between the stage wrapper and
            GameUtilityBar — they dock flush, sharing one border silhouette
            (see GameStage's rounded-t-lg/border-b-0 and GameUtilityBar's
            rounded-b-lg/border-t-0), reading as one continuous card.
            PRODUCTION HARDENING: this wrapper (not GameStage alone) is the
            actual fullscreen target — see fullscreenTargetRef above. */}
        <div ref={fullscreenTargetRef} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            <GameStage
              game={game}
              launch={launch}
              isFullscreen={isFullscreen}
              onRestartFromLoading={onRestartFromLoading}
              onRetryFailed={onRetryFailed}
              onBack={onBack}
              onBrowseGames={onBrowseGames}
              onReportIssue={onReportIssue}
            >
              {children}
            </GameStage>
          </div>

          <GameUtilityBar
            onOpenInfo={onOpenGameInfo}
            onReportIssue={onReportIssue}
            supportsFullscreen={supportsFullscreen}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </div>
      </GamePlayerFrame>
    </div>
  );
}
