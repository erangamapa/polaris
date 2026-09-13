import { Loader2 } from "lucide-react";
import { gameProviderName } from "./CasinoCatalog";

// Tribet's own loading presentation — never the provider's. Shown the
// whole time a launch is REQUESTED/LOADING (the provider iframe is already
// mounted underneath, invisible, so its own onLoad can actually fire — see
// GameStage.jsx), so a slow or broken provider document is never visible
// mid-load.
//
// `delayed` (~10s in, from useCasinoGameLaunch's own timer) adds the
// spec's "Slow Loading" sub-state: a non-alarming "still working" note
// with real ways out. "Retry" here restarts the launch from scratch
// (close + relaunch) rather than the reducer's own RETRY action, which is
// reserved for a genuinely FAILED launch (see GameError.jsx) — the launch
// is still technically in flight at this point, not failed, so there is
// nothing for the state machine itself to "retry".
export function GameLoading({ game, delayed, onRestart, onBack, onReportIssue }) {
  const title = game?.title ?? "Game";
  return (
    <div
      role="status"
      aria-live="polite"
      data-test-id="game-loading"
      className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center"
    >
      <div
        aria-hidden="true"
        className="size-16 rounded-xl bg-cover bg-center shadow-[var(--elevation-low)]"
        style={game?.image ? { backgroundImage: `url(${game.image})` } : undefined}
      />
      <div>
        <div className="text-base font-semibold text-white">{title}</div>
        {game && <div className="text-xs text-zinc-400">{gameProviderName(game)}</div>}
      </div>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        Launching game…
      </div>
      {delayed && (
        <div className="mt-2 max-w-xs rounded-lg border border-white/10 bg-[var(--neutral-900)] p-4" data-test-id="game-loading-delayed">
          <p className="text-sm font-semibold text-white">Still loading</p>
          <p className="mt-1 text-xs text-zinc-400">The provider is taking longer than expected.</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={onRestart}
              data-test-id="game-loading-retry"
              className="rounded-lg [background-image:var(--global-cta-gradient)] px-3 py-1.5 text-xs font-bold text-[var(--global-cta-text)] hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={onBack}
              data-test-id="game-loading-back"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to Casino
            </button>
            <button
              type="button"
              onClick={onReportIssue}
              data-test-id="game-loading-report"
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Report Issue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
