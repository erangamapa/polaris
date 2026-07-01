import { Star } from "lucide-react";

export function GameTile({ game, onLaunch, faved, onFav }) {
  return (
    <button
      onClick={() => onLaunch(game)}
      aria-label={`Play ${game.title}`}
      className="group relative w-[136px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/5 transition hover:-translate-y-1 hover:ring-emerald-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
    >
      <div className={`relative h-[180px] w-full bg-gradient-to-br ${game.hue}`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="absolute left-2 top-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] font-medium text-white/90">
          {game.provider}
        </div>

        {onFav && (
          <span
            role="button"
            tabIndex={0}
            aria-label={faved ? `Remove ${game.title} from favourites` : `Add ${game.title} to favourites`}
            onClick={(e) => { e.stopPropagation(); onFav(game); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onFav(game); } }}
            className="absolute right-2 top-2 grid size-6 cursor-pointer place-items-center rounded-md bg-black/40 text-white/90 hover:bg-black/60"
          >
            <Star className={`size-3.5 ${faved ? "fill-amber-400 text-amber-400" : ""}`} />
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 p-2 text-left">
          <div className="flex items-center gap-1">
            {game.new && (
              <span className="rounded bg-emerald-500 px-1 text-[9px] font-bold uppercase leading-tight text-zinc-950">New</span>
            )}
            <div className="truncate text-sm font-bold leading-tight text-white drop-shadow">{game.title}</div>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-white/80">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
            {game.players.toLocaleString()} playing
          </div>
        </div>

        <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-500 text-zinc-950">▶</span>
        </div>
      </div>
    </button>
  );
}
