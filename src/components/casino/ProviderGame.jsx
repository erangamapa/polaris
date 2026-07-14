import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { attachMockHost } from "@/lib/gameBridge";

// Vendored provider games (self-contained apps under public/games/*).
// Served as static assets and embedded via iframe, loaded on demand.
export const PROVIDER_GAMES = [
  { key: "crash", title: "Vector Crash", src: "/games/crash/index.html", badge: "TriBet Studio", image: "/img/games/vector-crash.svg" },
  { key: "dice", title: "Vector Dice", src: "/games/dice/index.html", badge: "TriBet Studio", image: "/img/games/vector-dice.svg" },
  // Reference game built from skills/build-casino-game — runs on mock balance via the bridge.
  { key: "coinflip", title: "Coin Flip", src: "/games/coinflip/index.html", badge: "TriBet Studio", image: "/img/games/coinflip.svg" },
  { key: "nova-wheel", title: "Nova Wheel", src: "/games/nova-wheel/index.html", badge: "TriBet Studio", image: "/img/games/nova-wheel.svg" },
];

// Provider games run inside a sandboxed iframe (loaded only when opened). Games
// that speak the TriBet Game Bridge (src/lib/gameBridge) get a MOCK balance host
// wired here automatically. To settle on-chain instead, pass a `settle` handler
// to attachMockHost (see skills/build-casino-game/reference/on-chain-extension.md).
export function ProviderGame({ game, onClose }) {
  const iframeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (!loaded || !iframeRef.current) return;
    const detach = attachMockHost(iframeRef.current, { currency: "TBET", onBalance: setBalance });
    return detach;
  }, [loaded]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
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

      <div className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading {game.title}…</div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          title={game.title}
          src={game.src}
          onLoad={() => setLoaded(true)}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          className="h-full w-full border-0"
          data-test-id={`provider-iframe-${game.key}`}
        />
      </div>
    </div>
  );
}
