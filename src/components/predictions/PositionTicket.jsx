import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OutcomeButton } from "./OutcomeButton";
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

        {/* The one place this file has a real "selected" state: exactly one
            side is ever visually selected (solid fill), the other stays in
            the resting soft treatment — never both. */}
        <div className="grid grid-cols-2 gap-2">
          <OutcomeButton side="Yes" selected={side === "Yes"} onClick={() => setSide("Yes")}>
            Yes {fmtCents(market.yes)}
          </OutcomeButton>
          <OutcomeButton side="No" selected={side === "No"} onClick={() => setSide("No")}>
            No {fmtCents(market.no)}
          </OutcomeButton>
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
          {/* This is the actual "commit" action (the toggle above just
              picks which side you're viewing) — rendered `selected` always,
              matching whichever side is currently chosen, since committing
              to buy is exactly the "solid fill" moment the design calls
              for. */}
          <OutcomeButton
            side={side}
            selected
            className="h-10 w-full text-base font-semibold"
            disabled={insufficient || amount <= 0}
            onClick={() => onConfirm({ market, side, amount, shares, price })}
          >
            {insufficient ? "Insufficient balance" : `Buy ${side} · $${fmt(amount)}`}
          </OutcomeButton>
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
