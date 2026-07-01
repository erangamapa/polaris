import { GameTile } from "./GameTile";

export function CategoryGrid({ category, games, onLaunch, onFav, isFav }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-white">{category}</h2>
      {games.length ? (
        <div className="flex flex-wrap gap-3">
          {games.map((g) => (
            <GameTile key={`${g.title}-${g.provider}`} game={g} onLaunch={onLaunch} faved={isFav?.(g)} onFav={onFav} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
          {category === "Favorites"
            ? "No favorites yet — tap the star on any game to save it here."
            : "Nothing here yet. Check back soon."}
        </div>
      )}
    </section>
  );
}
