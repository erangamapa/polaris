import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ExternalLink, RefreshCw, Blocks } from "lucide-react";
import { useWallet } from "@/web3/useWallet";
import { baseSepolia, polygonAmoy } from "@shared/chains";

const CASINO = { name: "Base Sepolia", explorer: baseSepolia.blockExplorers.default.url, dot: "#0052ff", unit: "ETH" };
const SPORTS = { name: "Polygon Amoy", explorer: polygonAmoy.blockExplorers.default.url, dot: "#8247e5", unit: "USDT" };

const GAME_LABEL = { dice: "Dice", "coin-toss": "Coin Toss", roulette: "Roulette", keno: "Keno" };
const fmtTime = (ms) => (ms ? new Date(ms).toLocaleString() : "");

// On-chain "My Bets" explorer. Both tabs read directly from chain — casino from
// BetSwirl Roll events (/api/casino-history), sports from the Azuro subgraph
// (/api/history). Each bet is rendered as a linked block in a chain with its
// decoded details and a tx link. Reconnecting restores everything from chain.
export function BetHistoryDialog({ open, onClose }) {
  const { address, isConnected } = useWallet();
  const [casino, setCasino] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        fetch(`/api/casino-history?address=${address}`).then((r) => r.json()).catch(() => ({ bets: [] })),
        fetch(`/api/history?address=${address}`).then((r) => r.json()).catch(() => ({ bets: [] })),
      ]);
      setCasino(c.bets ?? []);
      setSports(s.bets ?? []);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => { if (open) load(); }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2"><Blocks className="size-4" /> On-chain bets</DialogTitle>
            <button onClick={load} disabled={loading} aria-label="Refresh" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <DialogDescription>Read live from chain for {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "your wallet"} — nothing is stored by us.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="casino">
          <TabsList className="w-full">
            <TabsTrigger value="casino" className="flex-1">Casino ({casino.length})</TabsTrigger>
            <TabsTrigger value="sports" className="flex-1">Sports ({sports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="casino" className="mt-3 max-h-[58vh] overflow-y-auto">
            <BetChain loading={loading} bets={casino} chain={CASINO}
              empty="No on-chain casino bets in the recent window. Play a game and hit refresh."
              render={(b) => ({
                title: GAME_LABEL[b.game] ?? b.game,
                sub: b.outcome,
                stake: `${trim(b.stake)} ETH`,
                win: b.isWin,
                result: b.isWin ? `Won ${trim(b.payout)} ETH` : "Lost",
                tx: b.txHash, block: b.blockNumber, at: b.placedAt,
              })} />
          </TabsContent>

          <TabsContent value="sports" className="mt-3 max-h-[58vh] overflow-y-auto">
            <BetChain loading={loading} bets={sports} chain={SPORTS}
              empty="No on-chain sports bets for this wallet yet."
              render={(b) => ({
                title: `Bet #${b.betId}`,
                sub: `odds ${Number(b.odds).toFixed(2)}${b.result ? ` · ${b.result}` : ""}`,
                stake: `${trim(b.stake)} USDT`,
                win: b.status === "Won" || b.result === "Won",
                result: b.status ?? "—",
                tx: b.txHash, block: b.blockNumber, at: b.placedAt,
              })} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Renders bets as a vertical chain of linked blocks (node + connector line).
function BetChain({ loading, bets, chain, render, empty }) {
  if (loading && bets.length === 0) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading chain…</div>;
  }
  if (bets.length === 0) {
    return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="relative space-y-2 pl-6">
      {/* the chain line */}
      <div className="absolute bottom-3 left-[9px] top-3 w-px bg-border" aria-hidden />
      {bets.map((raw, i) => {
        const b = render(raw);
        return (
          <div key={b.tx ?? i} className="relative">
            {/* chain node */}
            <span className="absolute -left-[1.35rem] top-4 size-3 rounded-full ring-4 ring-background" style={{ background: chain.dot }} aria-hidden />
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{b.title}</div>
                  {b.sub && <div className="truncate text-xs text-muted-foreground">{b.sub}</div>}
                </div>
                <div className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${b.win ? "bg-[var(--success-bg,rgba(73,184,137,0.16))] text-[var(--success)]" : "bg-secondary text-muted-foreground"}`}>
                  {b.result}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block size-1.5 rounded-full" style={{ background: chain.dot }} /> {chain.name}
                </span>
                <span className="font-mono">stake {b.stake}</span>
                {b.block ? <span className="font-mono">block #{b.block}</span> : null}
                {b.at ? <span>{fmtTime(b.at)}</span> : null}
                {b.tx && (
                  <a href={`${chain.explorer}/tx/${b.tx}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[var(--global-cta)] hover:underline">
                    <ExternalLink className="size-3" /> {b.tx.slice(0, 8)}…{b.tx.slice(-4)}
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Trim a decimal string to at most 6 significant fractional places, no trailing zeros.
function trim(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toFixed(6).replace(/\.?0+$/, "");
}
