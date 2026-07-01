import { fmtCents } from "@/lib/format";

function Row({ price, size, max, side }) {
  const pct = Math.min(100, (size / max) * 100);
  const isAsk = side === "ask";
  return (
    <div className="relative grid grid-cols-2 px-3 py-1 text-xs tabular-nums">
      <div
        className={`absolute inset-y-0 right-0 ${isAsk ? "bg-rose-500/10" : "bg-emerald-500/10"}`}
        style={{ width: `${pct}%` }}
      />
      <span className={`relative font-medium ${isAsk ? "text-rose-400" : "text-emerald-400"}`}>
        {fmtCents(price)}
      </span>
      <span className="relative text-right text-muted-foreground">{size.toLocaleString()}</span>
    </div>
  );
}

export function OrderBook({ orderbook }) {
  const max = Math.max(
    ...orderbook.asks.map((r) => r.size),
    ...orderbook.bids.map((r) => r.size)
  );
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-2 border-b bg-muted/40 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Price (Yes)</span>
        <span className="text-right">Shares</span>
      </div>
      <div>
        {orderbook.asks.map((r, i) => (
          <Row key={`a${i}`} {...r} max={max} side="ask" />
        ))}
      </div>
      <div className="border-y bg-muted/20 px-3 py-1 text-center text-[11px] text-muted-foreground">
        spread
      </div>
      <div>
        {orderbook.bids.map((r, i) => (
          <Row key={`b${i}`} {...r} max={max} side="bid" />
        ))}
      </div>
    </div>
  );
}
