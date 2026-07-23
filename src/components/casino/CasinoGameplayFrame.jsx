import { useEffect, useRef } from "react";
import { RotateCw } from "lucide-react";
import { useCasinoViewportInfo, needsRotateHint } from "@/lib/casinoGameplayViewport";
import { track } from "@/lib/telemetry";

// The one outer chrome every Casino launch state renders inside — loading,
// delayed, unavailable, failed, timeout, AND ready gameplay all mount the
// SAME frame instance with the SAME header/content-box bounds (see
// GameLaunchSurface.jsx, which decides only what goes in `children`). That's
// what makes the status-to-ready transition not jump: previously the
// loading/error chrome and the real BetSwirlGame/ProviderGame each owned
// their own separate `fixed inset-0` wrapper and close button — two
// different layouts at two different times, not one frame (see GAME
// CONTAINER task: "same outer frame dimensions... no changing overlay
// bounds"). Game-specific rendering (BetSwirlGame's bet controls,
// ProviderGame's iframe) still differs — only the outer chrome is shared,
// per that task's own "outer frame ownership should be shared" instruction.
//
// Desktop sizing is plain CSS (min()/percentages), not JS-computed pixels —
// the content box caps at a comfortable max but shrinks with the real
// available area (viewport minus this header minus gutters), so short-height
// desktop (e.g. 1280x650) naturally gets a smaller box without a second,
// breakpoint-specific number anywhere (see DESKTOP SIZING RULES). No
// ResizeObserver is needed for this: CSS already reacts to viewport/zoom
// changes on its own, and the only JS viewport read here
// (useCasinoViewportInfo) is for analytics + the rotate hint, not sizing —
// see RESIZE HANDLING: "do not introduce multiple competing resize systems."
export function CasinoGameplayFrame({ game, mode, onClose, closeDisabled, children }) {
  const headerTitle = game?.title ?? "Game";
  const frameRef = useRef(null);
  const { orientation, viewportClass } = useCasinoViewportInfo();
  const rotateHint = needsRotateHint(game, orientation);

  // ACCESSIBILITY: focus lands on the frame itself when it opens (not deep
  // inside whatever status content happens to be showing first) — a stable,
  // predictable target regardless of which status the launch starts in.
  useEffect(() => {
    frameRef.current?.focus();
  }, []);

  // Escape closes the frame from any status — except while `closeDisabled`
  // (e.g. BetSwirlGame mid on-chain confirmation, see that file's
  // onBusyChange) is set, the one real "abandoning this has a consequence"
  // case in this app today (see ESCAPE AND BROWSER BACK: "do not close if
  // another critical confirmation owns Escape").
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape" && !closeDisabled) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, closeDisabled]);

  // One frame-open event per real game, not per re-render — analytics-only,
  // no resize/orientation spam (see ANALYTICS: "do not add noisy
  // resize-event tracking"). Block-disabled (not eslint-disable-next-line) —
  // oxlint anchors this rule's diagnostic at the `track(...)` line itself,
  // not the dependency array below (same fix as useCasinoGameLaunch.js's
  // identical case) — deliberately keyed only on [game], not
  // viewportClass/orientation/mode, so this never re-fires on an unrelated
  // resize while a game is open.
  /* eslint-disable react-hooks/exhaustive-deps */
  const openedForRef = useRef(null);
  useEffect(() => {
    if (!game || openedForRef.current === game.favId) return;
    openedForRef.current = game.favId;
    track("casino_game_frame_opened", { gameId: game.favId, mode, viewportClass, orientation });
  }, [game]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const lastOrientationRef = useRef(orientation);
  useEffect(() => {
    if (lastOrientationRef.current === orientation) return;
    lastOrientationRef.current = orientation;
    if (game) track("casino_game_orientation_changed", { gameId: game.favId, orientation });
  }, [orientation, game]);

  const handleClose = () => {
    if (closeDisabled) return;
    if (game) track("casino_game_frame_closed", { gameId: game.favId, mode });
    onClose();
  };

  return (
    <div
      ref={frameRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
      data-test-id="casino-gameplay-frame"
      data-viewport-class={viewportClass}
      data-orientation={orientation}
      className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-zinc-950 outline-none"
    >
      <header
        className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-white/5 px-3"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
      >
        <span className="min-w-0 truncate text-sm font-bold text-white">{headerTitle}</span>
        <button
          type="button"
          onClick={handleClose}
          disabled={closeDisabled}
          aria-label="Close game"
          data-test-id="gameplay-frame-close"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          ✕
        </button>
      </header>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-0 md:p-4"
        style={{ paddingLeft: "env(safe-area-inset-left, 0px)", paddingRight: "env(safe-area-inset-right, 0px)" }}
      >
        {rotateHint && (
          <div
            role="status"
            data-test-id="gameplay-rotate-hint"
            className="absolute inset-x-3 top-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-xs font-medium text-zinc-200"
            style={{ top: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}
          >
            <RotateCw className="size-4 shrink-0" aria-hidden="true" />
            For the best experience, rotate your device.
          </div>
        )}
        <div
          data-test-id="gameplay-content-box"
          className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-900 md:mx-auto md:h-[min(100%,720px)] md:w-[min(92vw,1100px)] md:rounded-2xl md:ring-1 md:ring-white/5"
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
