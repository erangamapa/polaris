import { useState } from "react";
import { Loader2 } from "lucide-react";

// Vendored provider games (self-contained vanilla apps under public/games/*).
// Served as static assets and embedded via iframe, loaded on demand.
export const PROVIDER_GAMES = [
  { key: "crash", title: "Vector Crash", src: "/games/crash/index.html", badge: "TriBet Studio", image: "/img/games/vector-crash.svg" },
  { key: "dice", title: "Vector Dice", src: "/games/dice/index.html", badge: "TriBet Studio", image: "/img/games/vector-dice.svg" },
];

// Provider games (vendored vanilla apps under public/games/*) run inside a
// sandboxed iframe. The iframe — and thus the game's HTML/JS — only loads when
// this modal is mounted, i.e. only when the player opens the game (lazy).
// A postMessage bridge is stubbed for a future wallet/on-chain integration.
export function ProviderGame({ game, onClose }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{game.title}</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{game.badge ?? "Provider game"}</span>
        </div>
        <button onClick={onClose} aria-label="Close game" className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white">✕</button>
      </div>

      <div className="relative flex-1">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-white/70">
            <div className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" /> Loading {game.title}…</div>
          </div>
        )}
        <iframe
          title={game.title}
          src={game.src}
          onLoad={() => setLoaded(true)}
          // sandbox keeps the vendored game isolated from the host app.
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          className="h-full w-full border-0"
          data-test-id={`provider-iframe-${game.key}`}
        />
      </div>
    </div>
  );
}
