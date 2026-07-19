import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { outcomeResult } from "@/lib/sportsData";
import { toast } from "@/lib/toast";

// Bet slip for fully-mocked fixtures only — never touches the wallet or any
// real transaction flow (see PLACEHOLDER ODDS / DEMO MODE). Visually mirrors
// AzuroBetSlip so switching between a real and a placeholder fixture feels
// like the same product, but every field below is local state; nothing here
// signs, submits, or costs real funds. Settlement is instant and
// deterministic against the mock event's simulated final score, logged into
// the same activity/My Bets list as real bets so the destination is
// consistent — only the *source* differs, tagged via `source: "mock"`.
export function DemoBetSlip({ selection, onClose, onBetPlaced }) {
  const [stake, setStake] = useState(1);
  const [phase, setPhase] = useState("idle"); // idle | placed

  if (!selection) return null;
  const { event, market, outcome } = selection;
  const odds = Number(outcome.odds);
  const potential = stake > 0 ? (stake * odds).toFixed(2) : "0.00";
  const [p1, p2] = event.participants;

  const submit = () => {
    if (stake <= 0) return;
    setPhase("placed");
    const finalScore = event.raw?.finalScore;
    const result = finalScore ? outcomeResult(market.raw ?? market, outcome.pick, finalScore) : undefined;
    toast.success("Demo bet placed");
    // Routed through App.jsx's placeBet (not logRound) — placeBet is what
    // schedules the open -> won/lost/void auto-settlement, using this
    // predetermined `result` (score-driven, like other sports bets) instead
    // of the generic random winProb fallback.
    onBetPlaced?.({
      product: "sports",
      title: `${p1?.name} v ${p2?.name} · ${market.name}`,
      selection: outcome.name,
      stake,
      potential: +(stake * odds).toFixed(2),
      result,
      source: "mock",
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Demo bet slip</DialogTitle>
          <DialogDescription className="truncate">{p1?.name} v {p2?.name} — placeholder fixture, not a real bet</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">{market.name}</div>
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{outcome.name}</span>
            <span className="font-mono text-sm font-bold text-[var(--global-cta)]">{odds.toFixed(2)}</span>
          </div>
        </div>

        {phase === "placed" ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <CheckCircle2 className="size-8 text-[var(--success)]" />
            <div className="text-sm font-semibold">Demo bet placed</div>
            <div className="text-xs text-muted-foreground">See it in My Bets.</div>
            <button onClick={onClose} className="mt-2 rounded-lg bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/70">Done</button>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-muted-foreground">Stake (demo USDT)</span>
              <div className="flex items-center rounded-lg border bg-background px-3">
                <input
                  type="number" min={0} step={0.5} value={stake}
                  onFocus={(e) => e.target.select()} onChange={(e) => setStake(Math.max(0, +e.target.value))}
                  className="w-full bg-transparent py-2.5 font-mono tabular-nums outline-none"
                />
                {[1, 5, 25].map((v) => (
                  <button key={v} onClick={() => setStake(v)} className="px-2 text-xs text-muted-foreground hover:text-foreground">{v}</button>
                ))}
              </div>
            </label>

            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Potential payout</span>
              <span className="font-mono font-semibold">{potential} USDT</span>
            </div>

            <button
              onClick={submit}
              disabled={stake <= 0}
              className="rounded-lg bg-[var(--global-cta)] py-2.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] disabled:opacity-50"
            >
              Place demo bet
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
