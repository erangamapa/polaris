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
    <div data-test-id="game-toolbar" className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-white/5 py-2">
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

// Every action shares one button recipe — same height (h-9, a real 36px hit
// area, consistent with the app's other compact icon+label controls), same
// icon size, same gap, same rest/hover/pressed/focus treatment — so the
// four actions read as one aligned toolbar rather than separate floating
// links. Muted at rest (text-zinc-400); hover and pressed both step up to
// the same "lit" white-on-secondary treatment so a toggled-on state
// (Theatre/Fullscreen) and a hovered one are visually consistent with each
// other, not two different visual languages.
function ToolbarButton({ icon: Icon, label, onClick, pressed, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed || undefined}
      data-test-id={testId}
      className={
        "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
        (pressed ? "bg-secondary text-white" : "text-zinc-400 hover:bg-secondary/60 hover:text-white")
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sr-only sm:hidden">{label}</span>
    </button>
  );
}
