import { Info, Flag, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";
import { GameUtilityAction } from "./GameUtilityAction";

// TOOLBAR REDESIGN — Theatre Mode is gone; the bar is down to Game Info /
// Report Issue / Fullscreen, laid out as genuine equal-width columns (CSS
// Grid `grid-cols-3`, or `grid-cols-2` when fullscreen isn't supported —
// see lib/gameDisplay.js's COMPACT profile) rather than a compact
// content-sized row. Same grid at every breakpoint — mobile and desktop
// share one layout, only the label text shortens below `sm:` to avoid
// clipping (verified at 360px, this toolbar's narrowest tested width).
//
// "Permanently attached, not floating": docks directly beneath GameStage
// with zero gap (see CasinoGamePage.jsx — no margin/padding between the
// stage wrapper and this bar), sharing GameStage's exact border color and
// background and only rounding its OWN bottom corners (GameStage rounds
// only its top corners) — together they read as one continuous card, a
// game viewport with a thin action dock fused to its bottom edge, not two
// separate floating elements.
//
// PRODUCTION HARDENING — this bar (together with GameStage) is now the
// actual fullscreen target (see CasinoGamePage.jsx's fullscreenTargetRef):
// GameStage alone used to be fullscreened, which made this ENTIRE bar —
// including its own Fullscreen button — unreachable while active (a
// confirmed Fullscreen API constraint: elements outside the fullscreened
// subtree are inert to click, forced click, and keyboard focus alike).
// While fullscreen, this bar owns the bottom safe-area inset (it's now
// the element flush against the screen's physical bottom edge) and drops
// its own bottom rounding, matching GameStage's top-edge treatment.
//
// Favorite is intentionally NOT duplicated here — it already lives in
// GameHeader (this app's existing favorite placement everywhere else).
export function GameUtilityBar({ onOpenInfo, onReportIssue, supportsFullscreen, isFullscreen, onToggleFullscreen }) {
  return (
    <div
      data-test-id="game-utility-bar"
      className={cn(
        // SURFACE HIERARCHY POLISH: border-white/10 -> /8.
        "grid w-full shrink-0 overflow-hidden border border-t-0 border-white/8 bg-[var(--neutral-900)]",
        isFullscreen ? "" : "rounded-b-lg",
        supportsFullscreen ? "grid-cols-3" : "grid-cols-2"
      )}
      style={
        isFullscreen
          ? {
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              paddingLeft: "env(safe-area-inset-left, 0px)",
              paddingRight: "env(safe-area-inset-right, 0px)",
            }
          : undefined
      }
    >
      <GameUtilityAction icon={Info} label="Game Info" mobileLabel="Info" onClick={onOpenInfo} testId="game-utility-info" />
      <GameUtilityAction icon={Flag} label="Report Issue" mobileLabel="Report" onClick={onReportIssue} testId="game-utility-report" dividerLeft />
      {supportsFullscreen && (
        <GameUtilityAction
          icon={isFullscreen ? Minimize : Maximize}
          label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          mobileLabel={isFullscreen ? "Exit" : "Full"}
          onClick={onToggleFullscreen}
          pressed={isFullscreen}
          testId="game-utility-fullscreen"
          dividerLeft
        />
      )}
    </div>
  );
}
