import { useState } from "react";
import { Star } from "lucide-react";
import { BETSWIRL_GAMES } from "@/web3/useBetSwirl";
import { PROVIDER_GAMES } from "./ProviderGame";

// Sparkle burst angles (degrees) fired once when a game is favorited.
const SPARKS = [0, 60, 120, 180, 240, 300];

// Games carry a namespaced favId so the on-chain "dice" and the provider "dice"
// never collide in the favorites set.
const ONCHAIN = BETSWIRL_GAMES.map((g) => ({ ...g, favId: `casino:${g.key}`, kind: "onchain" }));
const PROVIDER = PROVIDER_GAMES.map((g) => ({ ...g, favId: `provider:${g.key}`, kind: "provider" }));
const ALL_GAMES = [...ONCHAIN, ...PROVIDER];

// Favorite star overlay: pop animation on toggle + a one-shot sparkle burst on add.
// Sits above the launch button (z-20) and stops propagation so favoriting never
// launches the game. Animations reuse the fav-pop / fav-spark keyframes in index.css.
function FavStar({ faved, onToggle, title }) {
  const [burst, setBurst] = useState(0);

  const handle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!faved) setBurst((b) => b + 1); // burst only when adding
    onToggle();
  };

  return (
    <span
      role="button"
      tabIndex={0}
      data-fav
      aria-label={faved ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      aria-pressed={faved}
      onClick={handle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handle(e); }}
      className="group/fav absolute right-1.5 top-1.5 z-20 grid size-8 cursor-pointer place-items-center rounded-md bg-black/40 text-white/90 transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
    >
      <span className="relative grid place-items-center">
        {burst > 0 && (
          <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden>
            {SPARKS.map((a, i) => (
              <span
                key={i}
                className="fav-spark absolute size-1 rounded-full bg-amber-300"
                style={{ left: "50%", top: "50%", marginLeft: -2, marginTop: -2, "--ang": `${a}deg` }}
              />
            ))}
          </span>
        )}
        <Star
          key={`${faved}-${burst}`}
          className={`size-4 transition-transform group-hover/fav:scale-125 ${faved ? "fav-pop fill-amber-400 text-amber-400" : ""}`}
        />
      </span>
    </span>
  );
}

function OnchainTile({ game, onLaunch, faved, onFav }) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition hover:ring-[var(--casino-primary)]">
      <button
        onClick={() => onLaunch(game)}
        disabled={!game.playable}
        data-test-id={`onchain-${game.key}`}
        aria-label={`Play ${game.title}`}
        className="absolute inset-0 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${game.playable ? "" : "opacity-40 grayscale"}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="text-xs font-bold text-white">{game.title}</div>
        </div>
      </button>
      {!game.playable && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white/80">
          Testnet n/a
        </span>
      )}
      {onFav && <FavStar faved={faved} onToggle={() => onFav(game)} title={game.title} />}
    </div>
  );
}

function ProviderTile({ game, onLaunch, faved, onFav }) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition hover:ring-[var(--casino-primary)]">
      <button
        onClick={() => onLaunch(game)}
        data-test-id={`provider-${game.key}`}
        aria-label={`Play ${game.title}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </button>
      {onFav && <FavStar faved={faved} onToggle={() => onFav(game)} title={game.title} />}
    </div>
  );
}

// Renders a game with the tile that matches its kind, wiring favorites through.
function Tile({ game, onLaunchOnchain, onLaunchProvider, isFav, onFav }) {
  const faved = isFav?.(game);
  return game.kind === "onchain" ? (
    <OnchainTile game={game} onLaunch={onLaunchOnchain} faved={faved} onFav={onFav} />
  ) : (
    <ProviderTile game={game} onLaunch={onLaunchProvider} faved={faved} onFav={onFav} />
  );
}

function FavHeader() {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Star className="size-4 fill-amber-400 text-amber-400" />
      <h2 className="text-sm font-bold">Your favorites</h2>
    </div>
  );
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

// Casino catalog: on-chain BetSwirl games (portrait art tiles) + vendored
// provider games (embedded, loaded on demand). Each launches via its callback.
// Favorites (persisted upstream) get a star on every tile, a "Your favorites"
// rail, and a dedicated view when the Favorites category is selected.
export function CasinoCatalog({ category, onLaunch, onLaunchProvider, isFav, onFav }) {
  const tileProps = { onLaunchOnchain: onLaunch, onLaunchProvider, isFav, onFav };
  const favorites = isFav ? ALL_GAMES.filter((g) => isFav(g)) : [];

  if (category === "Favorites") {
    return (
      <section>
        <FavHeader />
        {favorites.length ? (
          <div className={GRID}>
            {favorites.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
            No favorites yet — tap the star on any game to save it here.
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {favorites.length > 0 && (
        <section>
          <FavHeader />
          <div className={GRID}>
            {favorites.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold">On-chain casino</h2>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
            BetSwirl · Base Sepolia · Chainlink VRF
          </span>
        </div>
        <div className={GRID}>
          {ONCHAIN.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold">Provider games</h2>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">embedded · loads on open</span>
        </div>
        <div className={GRID}>
          {PROVIDER.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
        </div>
      </section>
    </div>
  );
}
