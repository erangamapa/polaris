import { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { useWallet } from "@/web3/useWallet";
import { polygonAmoy } from "@shared/chains";
import { track } from "@/lib/telemetry";

const SPORTS = { name: "Polygon Amoy", explorer: polygonAmoy.blockExplorers.default.url, dot: "#8247e5", unit: "USDT" };

const fmtTime = (ms) => (ms ? new Date(ms).toLocaleString() : "");

// On-chain "My Bets" — Sports only. Casino used to have its own tab here
// (real BetSwirl Roll events via /api/casino-history, merged with in-tab
// pending/live results — see lib/casinoRounds.js), removed along with the
// BetSwirl on-chain games themselves: BGaming's iframe demos aren't tracked
// by any backend, so there is no data source left for a Casino tab. This
// renders the Sports (BetChain) content directly instead of inside a Tabs
// wrapper — unchanged from before this task ("do not redesign Sports'
// receipt model").
export function BetHistoryDialog({ open, onClose, onCloseAutoFocus }) {
  const { address, isConnected } = useWallet();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoading(true);
    try {
      const s = await fetch(`/api/history?address=${address}`).then((r) => r.json()).catch(() => ({ bets: [] }));
      setSports(s.bets ?? []);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (open) { load(); track("casino_activity_viewed", {}); }
  }, [open, load]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2">My Bets</DialogTitle>
            <button onClick={load} disabled={loading} aria-label="Refresh" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <DialogDescription>Read live from chain for {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "your wallet"} — nothing is stored by us.</DialogDescription>
        </DialogHeader>

        <div className="mt-3 max-h-[58vh] overflow-y-auto">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Renders SPORTS bets as a vertical chain of linked blocks — unchanged from
// before this task (see CASINO-ONLY ACTIVITY SCOPE: "do not redesign
// [Sports'] receipt models").
function BetChain({ loading, bets, chain, render, empty }) {
  if (loading && bets.length === 0) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading chain…</div>;
  }
  if (bets.length === 0) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="relative space-y-2 pl-6">
      <div className="absolute bottom-3 left-[9px] top-3 w-px bg-border" aria-hidden />
      {bets.map((raw, i) => {
        const b = render(raw);
        return (
          <div key={b.tx ?? i} className="relative">
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
                  <a href={`${chain.explorer}/tx/${b.tx}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[var(--global-cta-hover)] hover:underline">
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
