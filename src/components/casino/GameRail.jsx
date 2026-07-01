import { useRef } from "react";
import { GameTile } from "./GameTile";

export function GameRail({ rail, onLaunch, onFav, isFav }) {
  const scroller = useRef(null);
  const nudge = (dir) =>
    scroller.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <span className="text-zinc-500">{rail.icon}</span>
          {rail.title}
        </h2>
        <div className="flex items-center gap-1">
          <button className="text-xs text-zinc-500 hover:text-white">See all</button>
          <button onClick={() => nudge(-1)} aria-label="Scroll left" className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 text-zinc-400 hover:text-white">‹</button>
          <button onClick={() => nudge(1)} aria-label="Scroll right" className="grid h-7 w-7 place-items-center rounded-lg bg-zinc-900 text-zinc-400 hover:text-white">›</button>
        </div>
      </div>
      <div ref={scroller} className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {rail.games.map((g, i) => (
          <GameTile key={`${rail.id}-${g.title}-${i}`} game={g} onLaunch={onLaunch} faved={isFav?.(g)} onFav={onFav} />
        ))}
      </div>
    </section>
  );
}
