import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { attachMockHost } from "@/lib/gameBridge";

// Vendored provider games (self-contained apps under public/games/*).
// Served as static assets and embedded via iframe, loaded on demand.
export const PROVIDER_GAMES = [
  { key: "crash", title: "Warpout", src: "/games/crash/index.html", badge: "TriBet Studio", image: "/img/games/warpout.jpg", tags: ["new", "popular"] },
  { key: "dice", title: "Vector Dice", src: "/games/dice/index.html", badge: "TriBet Studio", image: "/img/games/vector-dice.svg", tags: ["popular"] },
  // Reference game built from skills/build-casino-game — runs on mock balance via the bridge.
  { key: "coinflip", title: "Coin Flip", src: "/games/coinflip/index.html", badge: "TriBet Studio", image: "/img/games/coinflip.svg", tags: ["popular"] },
  { key: "nova-wheel", title: "Nova Wheel", src: "/games/nova-wheel/index.html", badge: "TriBet Studio", image: "/img/games/nova-wheel.svg", tags: ["game-shows"] },
  { key: "spacex-rush", title: "SpaceX Rush", src: "/games/spacex-rush/index.html", badge: "TriBet Studio", image: "/img/games/spacex-rush.svg", tags: ["new"] },
  // Imported via skills/import-casino-game — self-contained crash game (own mock economy).
  { key: "tumble", title: "Tumble", src: "/games/tumble/index.html", badge: "TriBet Studio", image: "/img/games/tumble.svg", tags: ["new"] },
  // Imported from aquistsang GitHub — self-contained (own mock economy).
  { key: "coin-fighters", title: "Coin Fighters", src: "/games/coin-fighters/index.html", badge: "TriBet Studio", image: "/img/games/coin-fighters.svg", tags: ["new", "game-shows"] },
  { key: "raiders-escape", title: "Raider's Escape", src: "/games/raiders-escape/index.html", badge: "TriBet Studio", image: "/img/games/raiders-escape.svg", tags: ["new", "popular"] },
  { key: "keymines-v2", title: "KeyMines V2", src: "/games/keymines-v2/index.html", badge: "TriBet Studio", image: "/img/games/keymines-v2.svg", tags: ["new"] },
  { key: "drunken-pirate", title: "Drunken Pirate", src: "/games/drunken-pirate/index.html", badge: "TriBet Studio", image: "/img/games/drunken-pirate.svg", tags: ["live-casino"] },
  // Self-contained crash-style bubble inflate (own mock economy).
  { key: "bubble-girl", title: "Bubble Girl", src: "/games/bubble-girl/index.html", badge: "TriBet Studio", image: "/img/games/bubble-girl.svg", tags: ["new"] },
];

// Provider games run inside a sandboxed iframe (loaded only when opened). Games
// that speak the TriBet Game Bridge (src/lib/gameBridge) get a MOCK balance host
// wired here automatically. To settle on-chain instead, pass a `settle` handler
// to attachMockHost (see skills/build-casino-game/reference/on-chain-extension.md).
export function ProviderGame({ game, onClose, onReady, onFailed }) {
  const iframeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!loaded || !iframeRef.current) return;
    const detach = attachMockHost(iframeRef.current, { currency: "TBET", onBalance: setBalance });
    return detach;
  }, [loaded]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{game.title}</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{game.badge ?? "Provider game"}</span>
        </div>
        <div className="flex items-center gap-3">
          {balance !== null && (
            <div className="rounded-lg bg-zinc-800 px-3 py-1.5 font-mono text-sm tabular-nums text-white">{balance.toFixed(2)} TBET</div>
          )}
          <button onClick={onClose} aria-label="Close game" className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white">✕</button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading {game.title}…</div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          title={game.title}
          src={game.src}
          onLoad={() => { setLoaded(true); onReady?.(); }}
          // Real browsers rarely fire iframe onError for content-level
          // failures (a 404 still resolves to a same-origin document, so
          // onLoad fires regardless of what the game actually rendered) —
          // the launch surface's own timeout is the one reliable failure
          // signal for provider games (see useCasinoGameLaunch.js's
          // hasAsyncInit/TIMEOUT_MS). This is kept as defense in depth for
          // the genuine network-level failures a browser does report this
          // way, not the primary detection path.
          onError={() => onFailed?.()}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          className="h-full w-full border-0"
          data-test-id={`provider-iframe-${game.key}`}
        />
      </div>
    </div>
  );
}
