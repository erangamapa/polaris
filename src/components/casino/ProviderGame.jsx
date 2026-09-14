import { useEffect, useRef, useState } from "react";
import { attachMockHost } from "@/lib/gameBridge";
import { LAUNCH_EXTERNAL } from "@/lib/catalog/game";
import { MicroLabel } from "@/components/ui/micro-label";
import { CASINO_PROVIDERS } from "@/lib/casinoCategories";

// Provider games run inside a sandboxed iframe (loaded only when opened). Games
// that speak the TriBet Game Bridge (src/lib/gameBridge) get a MOCK balance host
// wired here automatically. To settle on-chain instead, pass a `settle` handler
// to attachMockHost (see skills/build-casino-game/reference/on-chain-extension.md).
// Renders only its own inner content — the outer page chrome (header,
// title, back control) lives in GameHeader.jsx, and the box/sizing/status
// overlay live in GameStage.jsx (see GAME CONTAINER task: "outer frame
// ownership should be shared" / "do not show multiple competing close
// buttons"). Its own "Loading {title}…" text is gone too — GameStage's
// shared GameLoading overlay already covers this exact element the whole
// time `loaded` is false (see that file), so showing a second loading
// label here was dead weight, never actually visible to a player.
export function ProviderGame({ game, onReady, onFailed }) {
  const iframeRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [balance, setBalance] = useState(null);

  // A third-party studio's demo runs its own play-money economy inside the
  // frame, and it does not speak our bridge. Attaching the mock host to it
  // would hang a TBET figure above a game showing entirely different credits,
  // so external games get the iframe and nothing else.
  const isExternal = game.launch?.kind === LAUNCH_EXTERNAL;

  useEffect(() => {
    if (isExternal || !loaded || !iframeRef.current) return;
    const detach = attachMockHost(iframeRef.current, { currency: "TBET", onBalance: setBalance });
    return detach;
  }, [isExternal, loaded]);

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-3 py-1.5 sm:px-4 sm:py-2">
        <MicroLabel>{game.studio ?? CASINO_PROVIDERS.find((p) => p.id === game.providerId)?.name ?? "Provider game"}</MicroLabel>
        {balance !== null && (
          <div className="rounded-lg bg-zinc-800 px-2.5 py-1 font-mono text-xs tabular-nums text-white sm:px-3 sm:py-1.5 sm:text-sm">{balance.toFixed(2)} TBET</div>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
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
          // External studio demos need a little more room than a vendored app:
          // popups for their help/paytable windows and forms for in-game
          // controls. `allow-same-origin` on a cross-origin frame grants the
          // frame its OWN origin, never ours, so this does not hand a third
          // party access to our page.
          sandbox={isExternal
            ? "allow-scripts allow-same-origin allow-pointer-lock allow-popups allow-forms allow-orientation-lock"
            : "allow-scripts allow-same-origin allow-pointer-lock"}
          className="h-full w-full border-0"
          data-test-id={`provider-iframe-${game.key}`}
        />
      </div>
    </div>
  );
}
