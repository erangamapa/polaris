import { useState } from "react";
import { Loader2, ExternalLink, Trophy } from "lucide-react";
import { useBettableGames } from "@/web3/useAzuro";
import { useWallet } from "@/web3/useWallet";
import { AzuroBetSlip } from "./AzuroBetSlip";

// Real on-chain sports betting via Azuro. Lists every game that has active
// markets and shows ALL markets (each condition) with every outcome. Clicking an
// outcome opens the bet slip modal — that's where the stake is set and the bet
// is submitted (with all progress shown in the modal, not on the odds button).
export function AzuroMarkets({ onBetPlaced }) {
  const { games, loading, bettableCount } = useBettableGames();
  const { sportsBalance, sportsGas } = useWallet();
  const [slip, setSlip] = useState(null); // { game, market, outcome }

  const totalMarkets = games.reduce((s, g) => s + g.markets.length, 0);

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-[var(--global-cta)]" />
          <h2 className="text-sm font-bold">On-chain sports</h2>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">Azuro · Polygon Amoy</span>
          {totalMarkets > 0 && <span className="text-[11px] text-muted-foreground">{totalMarkets} markets · {bettableCount} open</span>}
        </div>
        <div className="text-xs text-muted-foreground">
          USDT <span className="font-mono">{sportsBalance.toFixed(2)}</span> · POL <span className="font-mono">{sportsGas.toFixed(3)}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading live Azuro markets…
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No active Azuro markets on the Polygon Amoy dev feed right now. On-chain betting resumes when the
          testnet feed has a live or upcoming game.
          <a href="https://gem.azuro.org" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[var(--global-cta)] hover:underline">
            <ExternalLink className="size-3.5" /> Azuro
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {bettableCount === 0 && (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Heads up: the testnet feed only has games that already started, so Azuro will likely reject the
              bet with "Game is not active" — but you can still run the full flow. This list auto-refreshes.
            </div>
          )}
          {games.map((g) => (
            <div key={g.gameId} className="rounded-lg border bg-background p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{g.sport?.name}</span>·<span>{g.league?.name}</span>
                {!g.bettable && <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">Started</span>}
                <span className="ml-auto">{new Date(g.startsAt * 1000).toLocaleString()}</span>
              </div>
              <div className="mb-2 text-sm font-semibold">{g.title}</div>

              <div className="space-y-2">
                {g.markets.map((market) => (
                  <div key={market.conditionId}>
                    <div className="mb-1 text-xs text-muted-foreground">{market.title}</div>
                    <div className="flex flex-wrap gap-2">
                      {market.outcomes.map((o) => (
                        <button
                          key={o.outcomeId}
                          onClick={() => setSlip({ game: g, market, outcome: o })}
                          data-test-id={`azuro-outcome-${o.outcomeId}`}
                          className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition hover:border-[var(--global-cta)]"
                        >
                          <span>{o.title}</span>
                          <span className="font-mono font-semibold text-[var(--global-cta)]">{Number(o.odds).toFixed(2)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {slip && (
        <AzuroBetSlip
          selection={slip}
          onClose={() => setSlip(null)}
          onBetPlaced={(b) => { onBetPlaced?.(b); }}
        />
      )}
    </section>
  );
}
