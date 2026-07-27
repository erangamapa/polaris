import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { FavStar, gameProviderName } from "./CasinoCatalog";

// Minimal, compact header (target 56-64px, see spec) — never a hero. The
// one place "where am I / how do I leave" is answered: back control,
// thumbnail, name, provider, favorite, and the "..." menu (opens
// GameInfoPanel — already a full game-details drawer, see App.jsx). No
// wallet/balance here — those live in the persistent TopBar above, which
// this page never covers or duplicates.
export function GameHeader({ game, onBack, backDisabled, isFav, onFav, onOpenMenu }) {
  // `game` is null for NOT_FOUND (a bad/unknown ?play= favId) — no real
  // game to check favorite status for, so this must short-circuit before
  // calling isFav (see CasinoCatalog.jsx's isFav implementations, which
  // assume a real game object).
  const faved = game ? isFav?.(game) : false;
  return (
    <div
      data-test-id="game-header"
      className="flex h-14 shrink-0 items-center gap-2 border-b border-white/5 px-1 sm:px-2"
    >
      <button
        type="button"
        onClick={onBack}
        disabled={backDisabled}
        data-test-id="game-header-back"
        className="grid size-10 shrink-0 place-items-center rounded-lg text-zinc-300 hover:bg-secondary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        aria-label="Back to Casino"
        title="Back to Casino"
      >
        <ArrowLeft className="size-5" aria-hidden="true" />
      </button>

      <div
        aria-hidden="true"
        className="size-8 shrink-0 rounded-md bg-cover bg-center"
        style={game?.image ? { backgroundImage: `url(${game.image})` } : { background: "var(--secondary)" }}
      />

      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold leading-tight text-white">{game?.title ?? "Game"}</div>
        {game && <div className="truncate text-[11px] leading-tight text-zinc-400">{gameProviderName(game)}</div>}
      </div>

      {game && (
        <FavStar
          faved={faved}
          onToggle={() => onFav(game)}
          title={game.title}
          className="static text-zinc-300 hover:text-white"
        />
      )}

      <button
        type="button"
        onClick={onOpenMenu}
        data-test-id="game-header-menu"
        className="grid size-10 shrink-0 place-items-center rounded-lg text-zinc-300 hover:bg-secondary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Game info"
        title="Game info"
      >
        <MoreHorizontal className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
