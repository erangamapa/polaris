import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ExternalLink } from "lucide-react";
import { useWallet } from "@/web3/useWallet";
import { baseSepolia } from "@shared/chains";

const txUrl = (hash) => `${baseSepolia.blockExplorers.default.url}/tx/${hash}`;

// On-chain "My Bets": casino rounds settle instantly with a VRF tx link; sports
// bets are read from the Azuro subgraph via /api/history. Reconnecting the same
// wallet restores history from chain — nothing is stored by us.
export function BetHistoryDialog({ open, onClose, casinoRounds = [] }) {
  const { address, isConnected } = useWallet();
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !isConnected || !address) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/history?address=${address}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setSports(d.bets ?? []); })
      .catch(() => { if (!cancelled) setSports([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, isConnected, address]);

  const casino = casinoRounds.filter((r) => r.product === "casino");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>My bets</DialogTitle>
          <DialogDescription>On-chain history — restored from chain for the connected wallet.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="casino">
          <TabsList className="w-full">
            <TabsTrigger value="casino" className="flex-1">Casino ({casino.length})</TabsTrigger>
            <TabsTrigger value="sports" className="flex-1">Sports ({sports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="casino" className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
            {casino.length === 0 ? (
              <Empty text="No casino rounds yet. Play an on-chain game to see VRF-verified results here." />
            ) : (
              casino.map((r, i) => (
                <div key={r.txnHash ?? i} className="rounded-lg border bg-card p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className={`text-[11px] font-medium ${r.status === "won" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                      {r.status === "won" ? `Won ${r.potential} ETH` : "Lost"}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">stake {r.stake} ETH</span>
                    {r.txnHash && (
                      <a href={txUrl(r.txnHash)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[var(--global-cta)] hover:underline">
                        <ExternalLink className="size-3" /> VRF proof
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="sports" className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
            {loading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading Azuro subgraph…</div>
            ) : sports.length === 0 ? (
              <Empty text="No on-chain sports bets for this wallet yet." />
            ) : (
              sports.map((b) => (
                <div key={b.betId} className="rounded-lg border bg-card p-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">Bet #{b.betId}</div>
                    <div className="text-[11px] font-medium text-muted-foreground">{b.status}{b.result ? ` · ${b.result}` : ""}</div>
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">stake {Number(b.stake).toFixed(5)} @ {Number(b.odds).toFixed(2)}</span>
                    {b.txHash && (
                      <a href={txUrl(b.txHash)} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[var(--global-cta)] hover:underline">
                        <ExternalLink className="size-3" /> on-chain
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ text }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
