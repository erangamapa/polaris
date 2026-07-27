import { Info, Flag, Rows3, Maximize, Minimize } from "lucide-react";

// Immediately below the stage, one compact row. Deliberately excludes
// wallet/balance/support/chat/provider-logo — those already live in the
// persistent shell or GameHeader (see spec's own exclusion list).
//
// Favorite is intentionally NOT duplicated here — it already lives in
// GameHeader (the standard placement this app's card/rail iconography
// already uses everywhere else), and the spec's own COMPONENTS section
// says "do not duplicate implementations." Disclosed as a judgment call
// in the final report rather than rendering two separate favorite
// controls for the same game.
export function GameToolbar({ onOpenInfo, onReportIssue, theatreMode, onToggleTheatre, supportsFullscreen, isFullscreen, onToggleFullscreen }) {
  return (
    <div data-test-id="game-toolbar" className="flex shrink-0 flex-wrap items-center gap-1 py-2">
      <ToolbarButton icon={Info} label="Game Info" onClick={onOpenInfo} testId="game-toolbar-info" />
      <ToolbarButton icon={Flag} label="Report Issue" onClick={onReportIssue} testId="game-toolbar-report" />
      <ToolbarButton
        icon={Rows3}
        label="Theatre Mode"
        onClick={onToggleTheatre}
        pressed={theatreMode}
        testId="game-toolbar-theatre"
      />
      {supportsFullscreen && (
        <ToolbarButton
          icon={isFullscreen ? Minimize : Maximize}
          label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          onClick={onToggleFullscreen}
          pressed={isFullscreen}
          testId="game-toolbar-fullscreen"
        />
      )}
    </div>
  );
}

function ToolbarButton({ icon: Icon, label, onClick, pressed, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed || undefined}
      data-test-id={testId}
      className={
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (pressed ? "bg-secondary text-white" : "text-zinc-400 hover:bg-secondary/60 hover:text-white")
      }
    >
      <Icon className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}
