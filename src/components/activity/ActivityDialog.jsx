import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useCurrency } from "@/lib/currency";

// ONE-BRAND UNIFICATION: this resolves the "KNOWN INCONSISTENCY" the
// codebase previously flagged (a second, separate arena-color palette that
// disagreed with Sidebar.jsx's own arena accents) — per the new Chips rule
// ("neutral by default; only semantic chips get colour"), an arena-identity
// chip isn't a semantic signal (unlike Live/Warning/Success), so it's
// neutral now, with the arena distinguished by its label alone.
const PRODUCT_LABEL = { casino: "Casino", predictions: "Predictions", sports: "Sports" };

function Chip({ product }) {
  const label = PRODUCT_LABEL[product] ?? product;
  return (
    <span className="rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ color: "var(--badge-neutral-text)", background: "var(--badge-neutral-bg)" }}>
      {label}
    </span>
  );
}

function Row({ a, cashing, onCash, cashoutValue }) {
  const { fmtMoney } = useCurrency();
  const open = a.status === "open";
  const canCash = open && a.product === "sports";
  const won = a.status === "won";
  const voided = a.status === "void";
  const cashed = a.status === "cashedout";

  return (
    <div className="rounded-lg border bg-card p-2.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center gap-1.5">
            <Chip product={a.product} />
            {a.ref && <span className="font-mono text-[10px] text-muted-foreground">{a.ref}</span>}
            <span className="truncate text-[11px] text-muted-foreground">{a.time}</span>
          </div>
          <div className="truncate text-sm font-medium">{a.title}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm tabular-nums">{fmtMoney(a.stake)}</div>
          {open ? (
            !canCash && (
              <div className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> settling
              </div>
            )
          ) : cashed ? (
            <div className="text-[11px] font-medium text-[var(--warning)]">Cashed out {fmtMoney(a.cashout)}</div>
          ) : voided ? (
            <div className="text-[11px] font-medium text-muted-foreground">Void · stake returned</div>
          ) : (
            <div className={`text-[11px] font-medium ${won ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
              {won ? `Won ${fmtMoney(a.potential)}` : "Lost"}
            </div>
          )}
        </div>
      </div>

      {canCash && (
        <div className="mt-2 border-t pt-2">
          {cashing ? (
            <div className="flex items-center justify-center gap-1.5 py-1 text-[11px] text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Cashing out…
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground">To return {fmtMoney(a.potential)}</span>
              <button
                onClick={() => onCash(a.id, 0.5)}
                className="ml-auto rounded-md bg-secondary px-2 py-1 text-[11px] font-medium hover:bg-secondary/70"
              >
                50%
              </button>
              <button
                onClick={() => onCash(a.id, 1)}
                className="rounded-md bg-[var(--success-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--success)] hover:bg-[rgba(73,184,137,0.24)]"
              >
                Cash out {fmtMoney(cashoutValue(a))}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ActivityDialog({ open, onClose, activity, onCashOut, cashoutValue }) {
  const [cashingId, setCashingId] = useState(null);
  const openBets = activity.filter((a) => a.status === "open");
  const settled = activity.filter((a) => a.status !== "open");

  // Short time-delay on cash-out (Stake applies one), then apply.
  const startCash = (id, fraction) => {
    setCashingId(id);
    setTimeout(() => {
      onCashOut?.(id, fraction);
      setCashingId((c) => (c === id ? null : c));
    }, 900);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>My bets</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="open">
          <TabsList className="w-full">
            <TabsTrigger value="open" className="flex-1">Open ({openBets.length})</TabsTrigger>
            <TabsTrigger value="settled" className="flex-1">Settled ({settled.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open" className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
            {openBets.length === 0 ? (
              <Empty text="No open bets. Place a sports bet or prediction to see it here." />
            ) : (
              openBets.map((a) => (
                <Row key={a.id} a={a} cashing={cashingId === a.id} onCash={startCash} cashoutValue={cashoutValue} />
              ))
            )}
          </TabsContent>

          <TabsContent value="settled" className="mt-3 max-h-[55vh] space-y-2 overflow-y-auto">
            {settled.length === 0 ? (
              <Empty text="Nothing settled yet — casino rounds and resolved bets appear here." />
            ) : (
              settled.map((a) => <Row key={a.id} a={a} cashoutValue={cashoutValue} />)
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ text }) {
  return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{text}</div>;
}
