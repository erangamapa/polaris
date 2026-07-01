import { BETSWIRL_GAMES } from "@/web3/useBetSwirl";

// The real BetSwirl catalog as portrait tiles (self-hosted BetSwirl card art).
// Replaces the mock game grid — every tile launches an on-chain game.
export function CasinoCatalog({ onLaunch }) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold">On-chain casino</h2>
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
          BetSwirl · Base Sepolia · Chainlink VRF
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {BETSWIRL_GAMES.map((game) => (
          <GameTile key={game.key} game={game} onLaunch={onLaunch} />
        ))}
      </div>
    </section>
  );
}

function GameTile({ game, onLaunch }) {
  return (
    <button
      onClick={() => onLaunch(game)}
      disabled={!game.playable}
      data-test-id={`onchain-${game.key}`}
      className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition hover:ring-[var(--casino-primary)] disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      {!game.playable && (
        <span className="absolute right-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-semibold text-white/80">
          Testnet n/a
        </span>
      )}
    </button>
  );
}
