import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Ticket } from "lucide-react";
import { fmt } from "@/lib/format";
import { useOddsFormat } from "@/lib/odds";

const QUICK = [10, 50, 100];

export function BetSlip({
  selections, mode, setMode, multiStake, setMultiStake,
  updateStake, removeSelection, clear, balance, onPlace,
  acceptChanges, setAcceptChanges, onAcceptChanges,
}) {
  const { fmtOdds } = useOddsFormat();
  const [confirming, setConfirming] = useState(false);
  const hasPending = selections.some((s) => s.pendingOdds != null);
  const canMulti = selections.length >= 2;
  const combinedOdds = selections.reduce((acc, s) => acc * s.odds, 1);

  const singleStake = selections.reduce((a, s) => a + (s.stake || 0), 0);
  const singlePayout = selections.reduce((a, s) => a + (s.stake || 0) * s.odds, 0);
  const totalStake = mode === "multi" ? (multiStake || 0) : singleStake;
  const totalPayout = mode === "multi" ? (multiStake || 0) * combinedOdds : singlePayout;
  const insufficient = totalStake > balance;
  const empty = selections.length === 0;

  const placeLabel = insufficient
    ? "Insufficient balance"
    : totalStake <= 0
      ? "Enter a stake"
      : `Place bet · $${fmt(totalStake)}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <span className="text-sm font-bold">Bet slip</span>
        {!empty && (
          <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-xs font-medium text-zinc-950">
            {selections.length}
          </span>
        )}
        {!empty && (
          <button onClick={clear} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
        )}
      </div>

      {empty ? (
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div className="space-y-2 text-muted-foreground">
            <Ticket className="mx-auto size-7 opacity-60" />
            <p className="text-sm">Tap any odds to add a selection.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2 p-3 pb-0">
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList className="w-full">
                <TabsTrigger value="single" className="flex-1">Singles</TabsTrigger>
                <TabsTrigger value="multi" className="flex-1" disabled={!canMulti}>Multi</TabsTrigger>
              </TabsList>
            </Tabs>
            <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={!!acceptChanges}
                onChange={(e) => setAcceptChanges?.(e.target.checked)}
                className="size-3.5 accent-emerald-500"
              />
              Accept odds changes automatically
            </label>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {selections.map((s) => (
              <div key={s.key} className="rounded-lg border bg-card p-2.5">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold">{s.outcomeLabel}</span>
                  <span className="ml-auto rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-medium tabular-nums">
                    {fmtOdds(s.odds)}
                  </span>
                  {s.pendingOdds != null && (
                    <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-amber-400">
                      → {fmtOdds(s.pendingOdds)}
                    </span>
                  )}
                  <button
                    onClick={() => removeSelection(s.key)}
                    aria-label="Remove selection"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{s.eventLabel}</div>

                {mode === "single" && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex flex-1 items-center rounded-md border bg-background px-2">
                      <span className="text-xs text-muted-foreground">$</span>
                      <Input
                        type="number" min={0} value={s.stake ?? ""}
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => updateStake(s.key, Math.max(0, +e.target.value))}
                        className="h-8 border-0 bg-transparent px-1.5 font-mono tabular-nums shadow-none focus-visible:ring-0"
                      />
                    </div>
                    <span className="whitespace-nowrap text-xs text-muted-foreground">
                      Returns <span className="font-medium text-emerald-400">${fmt((s.stake || 0) * s.odds)}</span>
                    </span>
                  </div>
                )}
              </div>
            ))}

            {mode === "multi" && (
              <div className="space-y-2 rounded-lg border bg-card p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{selections.length} legs · combined odds</span>
                  <span className="font-mono text-lg font-semibold tabular-nums text-amber-400">{fmtOdds(combinedOdds)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex w-28 items-center rounded-md border bg-background px-2">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      type="number" min={0} value={multiStake ?? ""}
                      placeholder="0"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setMultiStake(Math.max(0, +e.target.value))}
                      className="h-8 border-0 bg-transparent px-1.5 font-mono tabular-nums shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <span className="whitespace-nowrap text-xs text-muted-foreground">
                    Returns <span className="font-medium text-emerald-400">${fmt((multiStake || 0) * combinedOdds)}</span>
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {QUICK.map((v) => (
                    <button
                      key={v}
                      onClick={() => setMultiStake(v)}
                      className="flex-1 rounded-md bg-secondary py-1.5 text-xs hover:bg-secondary/70"
                    >
                      ${v}
                    </button>
                  ))}
                  <button
                    onClick={() => setMultiStake(+balance.toFixed(2))}
                    className="flex-1 rounded-md bg-secondary py-1.5 text-xs hover:bg-secondary/70"
                  >
                    Max
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Total stake</span>
              <span className="font-mono tabular-nums">${fmt(totalStake)}</span>
            </div>
            <div className="mb-2.5 mt-0.5 flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Potential payout</span>
              <span className="font-mono text-xl font-semibold tabular-nums text-emerald-400">${fmt(totalPayout)}</span>
            </div>

            {hasPending && !acceptChanges ? (
              <Button
                className="w-full bg-amber-500 font-bold text-zinc-950 hover:bg-amber-400"
                onClick={() => { onAcceptChanges?.(); setConfirming(false); }}
              >
                Odds changed — accept
              </Button>
            ) : !confirming ? (
              <Button
                className="w-full bg-emerald-500 font-bold text-zinc-950 hover:bg-emerald-400 disabled:bg-zinc-700 disabled:text-zinc-400"
                disabled={totalStake <= 0 || insufficient}
                onClick={() => setConfirming(true)}
              >
                {placeLabel}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="rounded-md border bg-card p-2 text-xs text-muted-foreground">
                  Price accepted{mode === "multi" ? ` at ${fmtOdds(combinedOdds)}` : ""}. You’ll receive
                  <span className="font-medium text-emerald-400"> ${fmt(totalPayout)}</span> if it wins.
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirming(false)}>Back</Button>
                  <Button
                    className="flex-1 bg-emerald-500 font-bold text-zinc-950 hover:bg-emerald-400"
                    onClick={() => { onPlace(); setConfirming(false); }}
                  >
                    Confirm bet
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
