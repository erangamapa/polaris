import { useState } from "react";
import { Loader2, ExternalLink, Trophy } from "lucide-react";
import { useBettableGames, useAzuroBet } from "@/web3/useAzuro";
import { useWallet } from "@/web3/useWallet";
import { toast } from "@/lib/toast";

const STEP_LABEL = {
  switching: "Switching to Polygon Amoy…",
  funding: "Getting test USDT…",
  approving: "Approving relayer…",
  signing: "Sign the order in your wallet…",
  submitting: "Submitting to Azuro…",
};

// Real on-chain sports betting via Azuro. Lists every game that has active
// markets and shows ALL markets (each condition) with every outcome. Placing an
// outcome sends a gasless, affiliate-attributed order.
export function AzuroMarkets({ onBetPlaced }) {
  const { games, loading } = useBettableGames();
  const { ready, placeBet, mintUsdt } = useAzuroBet();
  const { sportsBalance, sportsGas } = useWallet();
  const [stake, setStake] = useState(1);
  const [busy, setBusy] = useState(null); // `${conditionId}-${outcomeId}`
  const [step, setStep] = useState(null);
  const [minting, setMinting] = useState(false);

  const getUsdt = async () => {
    if (!ready) { toast.error("Connect your wallet first"); return; }
    setMinting(true);
    try { await mintUsdt(100); toast.success("Minted 100 test USDT"); }
    catch (e) { toast.error(e.shortMessage || e.message || "Mint failed"); }
    finally { setMinting(false); }
  };

  const bet = async (game, market, outcome) => {
    if (!ready) { toast.error("Connect your wallet first"); return; }
    const key = `${market.conditionId}-${outcome.outcomeId}`;
    setBusy(key);
    try {
      const res = await placeBet({
        conditionId: market.conditionId,
        outcomeId: outcome.outcomeId,
        odds: outcome.odds,
        amountUsdt: stake,
        onStep: setStep,
      });
      toast.success(`Bet accepted (order ${String(res.id).slice(0, 8)}…)`);
      onBetPlaced?.({
        product: "sports", title: `${game.title} · ${market.title}`, selection: outcome.title,
        stake, potential: +(stake * Number(outcome.odds)).toFixed(6), status: "open", orderId: res.id,
      });
    } catch (e) {
      toast.error(e.shortMessage || e.message || "Bet failed");
    } finally {
      setBusy(null); setStep(null);
    }
  };

  const totalMarkets = games.reduce((s, g) => s + g.markets.length, 0);

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-[var(--global-cta)]" />
          <h2 className="text-sm font-bold">On-chain sports</h2>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">Azuro · Polygon Amoy</span>
          {totalMarkets > 0 && <span className="text-[11px] text-muted-foreground">{totalMarkets} markets · {games.length} games</span>}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          Stake (USDT)
          <input
            type="number" min={0} step={0.5} value={stake}
            onChange={(e) => setStake(Math.max(0, +e.target.value))}
            className="w-24 rounded-md border bg-background px-2 py-1 font-mono tabular-nums outline-none"
          />
        </label>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>USDT: <span className="font-mono">{sportsBalance.toFixed(2)}</span></span>
        <span>· POL gas: <span className="font-mono">{sportsGas.toFixed(4)}</span></span>
        <button
          onClick={getUsdt}
          disabled={minting}
          data-test-id="mint-usdt"
          className="ml-1 rounded-md border px-2 py-0.5 font-medium text-foreground hover:bg-secondary disabled:opacity-50"
        >
          {minting ? "Minting…" : "Get test USDT"}
        </button>
        <span className="w-full text-[11px]">Gasless bet on Polygon Amoy — you sign; a relayer submits. Winnings settle to your wallet.</span>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading live Azuro markets…
        </div>
      ) : games.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No active Azuro markets on the Base Sepolia dev feed right now. On-chain betting resumes when the
          testnet feed has a live or upcoming game.
          <a href="https://gem.azuro.org" target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[var(--global-cta)] hover:underline">
            <ExternalLink className="size-3.5" /> Azuro
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {games.map((g) => (
            <div key={g.gameId} className="rounded-lg border bg-background p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span>{g.sport?.name}</span>·<span>{g.league?.name}</span>
                <span className="ml-auto">{new Date(g.startsAt * 1000).toLocaleString()}</span>
              </div>
              <div className="mb-2 text-sm font-semibold">{g.title}</div>

              <div className="space-y-2">
                {g.markets.map((market) => (
                  <div key={market.conditionId}>
                    <div className="mb-1 text-xs text-muted-foreground">{market.title}</div>
                    <div className="flex flex-wrap gap-2">
                      {market.outcomes.map((o) => {
                        const key = `${market.conditionId}-${o.outcomeId}`;
                        const isBusy = busy === key;
                        return (
                          <button
                            key={o.outcomeId}
                            onClick={() => bet(g, market, o)}
                            disabled={Boolean(busy)}
                            data-test-id={`azuro-outcome-${o.outcomeId}`}
                            className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition hover:border-[var(--global-cta)] disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
                            <span>{o.title}</span>
                            <span className="font-mono font-semibold text-[var(--global-cta)]">{Number(o.odds).toFixed(2)}</span>
                          </button>
                        );
                      })}
                    </div>
                    {busy?.startsWith(`${market.conditionId}-`) && step && (
                      <div className="mt-1 text-xs text-[var(--global-cta)]">{STEP_LABEL[step]}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
