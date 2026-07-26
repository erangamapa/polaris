import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { fmt, fmtCents } from "@/lib/format";

export function PositionTicket({ market, side, setSide, open, onOpenChange, balance, onConfirm }) {
  const [amount, setAmount] = useState(10);

  if (!market) return null;
  const price = side === "Yes" ? market.yes : market.no;
  const shares = price > 0 ? amount / price : 0;
  const maxPayout = shares * 1; // each share pays $1 if correct
  const ret = amount > 0 ? ((maxPayout - amount) / amount) * 100 : 0;
  const insufficient = amount > balance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base leading-snug">{market.question}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={side === "Yes" ? "default" : "outline"}
            className={side === "Yes" ? "bg-[var(--predictions-primary)] text-[var(--predictions-cta-text)] hover:bg-[var(--predictions-primary-hover)]" : ""}
            onClick={() => setSide("Yes")}
          >
            Yes {fmtCents(market.yes)}
          </Button>
          <Button
            variant={side === "No" ? "default" : "outline"}
            className={side === "No" ? "bg-[var(--danger)] text-[var(--danger-foreground)] hover:brightness-110" : ""}
            onClick={() => setSide("No")}
          >
            No {fmtCents(market.no)}
          </Button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount (USDT)</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              value={amount}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setAmount(Math.max(0, +e.target.value))}
              className="font-mono tabular-nums"
            />
            {[10, 50, 100].map((v) => (
              <Button key={v} variant="secondary" size="sm" onClick={() => setAmount(v)}>
                {v}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5 text-sm">
          <Line label="Avg price" value={fmtCents(price)} />
          <Line label="Shares" value={shares.toFixed(2)} />
          <Line label="Potential return" value={`${ret.toFixed(0)}%`} accent />
          <Line label="Max payout" value={`$${fmt(maxPayout)}`} accent />
        </div>

        <DialogFooter>
          {/* CTA OWNERSHIP SYSTEM: this is the actual "Buy Yes/Buy No"
              action (the toggle above just picks which side you're
              viewing) — Predictions Action Green regardless of side, same
              as MarketDetail/MarketCard's buy buttons. */}
          <Button
            variant="action"
            className="w-full"
            disabled={insufficient || amount <= 0}
            onClick={() => onConfirm({ market, side, amount, shares, price })}
          >
            {insufficient ? "Insufficient balance" : `Buy ${side} · $${fmt(amount)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${accent ? "font-semibold text-[var(--success)]" : ""}`}>{value}</span>
    </div>
  );
}
