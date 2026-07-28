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
// Favorite is intentionally NOT duplicated here — it already lives in
// GameHeader (this app's existing favorite placement everywhere else).
export function GameUtilityBar({ onOpenInfo, onReportIssue, supportsFullscreen, isFullscreen, onToggleFullscreen }) {
  return (
    <div
      data-test-id="game-utility-bar"
      className={cn(
        "grid w-full shrink-0 overflow-hidden rounded-b-lg border border-t-0 border-white/10 bg-[var(--neutral-900)]",
        supportsFullscreen ? "grid-cols-3" : "grid-cols-2"
      )}
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
