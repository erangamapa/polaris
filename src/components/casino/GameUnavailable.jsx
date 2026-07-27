import { Ban, SearchX } from "lucide-react";
import { GAME_LAUNCH_STATUS } from "@/lib/casinoGameLaunch";

// UNAVAILABLE (a known game that isn't launchable right now — not wired up
// yet, or a Developer Panel simulation of a provider-side outage) and
// NOT_FOUND (an unknown/malformed favId — a bad `?play=` link) get their
// own presentation, distinct from GameError's FAILED states: nothing was
// ever attempted here, so there is no "try again" — see App.jsx's
// checkGameAvailability, which already resolves this BEFORE any loading
// state is shown (per the task's own "do not open a loading state first
// when availability is already known").
export function resolveUnavailableOutcome(status) {
  if (status === GAME_LAUNCH_STATUS.NOT_FOUND) {
    return {
      icon: SearchX,
      heading: "Game not found",
      message: "The game link may be invalid or no longer available.",
    };
  }
  if (status === GAME_LAUNCH_STATUS.UNAVAILABLE) {
    return {
      icon: Ban,
      heading: "Game unavailable",
      message: "This game is not available right now — check back soon or explore something else.",
    };
  }
  return null;
}

export function GameUnavailable({ status, onBrowseGames, headingRef }) {
  const outcome = resolveUnavailableOutcome(status);
  if (!outcome) return null;
  const Icon = outcome.icon;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center" data-test-id="game-unavailable">
      <Icon className="size-8 text-zinc-500" aria-hidden="true" />
      <h2 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-white outline-none">{outcome.heading}</h2>
      <p className="max-w-xs text-sm text-zinc-400">{outcome.message}</p>
      <button
        type="button"
        onClick={onBrowseGames}
        data-test-id="game-unavailable-browse"
        className="mt-2 rounded-lg bg-[var(--global-cta)] px-4 py-2 text-sm font-bold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Browse games
      </button>
    </div>
  );
}
