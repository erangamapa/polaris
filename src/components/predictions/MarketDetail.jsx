import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, TrendingUp, ChevronDown } from "lucide-react";
import { fmtCompact, fmtPct, fmtCents } from "@/lib/format";
import { ProbabilityChart } from "./ProbabilityChart";
import { OrderBook } from "./OrderBook";

export function MarketDetail({ market, onBack, onBuy }) {
  const [showBook, setShowBook] = useState(false);
  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="size-4" /> All markets
      </Button>

      <div className="flex items-start gap-3">
        <div className={`size-12 shrink-0 rounded-xl bg-gradient-to-br ${market.hue}`} />
        <div>
          <h1 className="text-lg font-bold leading-snug">{market.question}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{market.category}</Badge>
            <span className="flex items-center gap-1"><TrendingUp className="size-3.5" />{fmtCompact(market.volumeTotal)} Vol</span>
            <span className="flex items-center gap-1"><Clock className="size-3.5" />Closes {market.closes}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-black tabular-nums text-emerald-400">{fmtPct(market.yes)}</div>
          <div className="text-[11px] text-muted-foreground">Yes chance</div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-0">
          <ProbabilityChart data={market.series} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-12 bg-emerald-500 text-base font-bold text-zinc-950 hover:bg-emerald-400"
          onClick={() => onBuy(market, "Yes")}
        >
          Buy Yes · {fmtCents(market.yes)}
        </Button>
        <Button
          size="lg"
          className="h-12 bg-rose-500 text-base font-bold text-zinc-950 hover:bg-rose-400"
          onClick={() => onBuy(market, "No")}
        >
          Buy No · {fmtCents(market.no)}
        </Button>
      </div>

      {/* Basic mode shows rules + resolution; the order book is advanced-only. */}
      <Card>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resolution rules</div>
            <p className="mt-1">{market.rules}</p>
          </div>
          <Separator />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resolution source</div>
            <p className="mt-1 text-emerald-400">{market.resolutionSource}</p>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-muted-foreground">
            <span>Closes</span>
            <span>{market.closes}</span>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setShowBook((v) => !v)}
        >
          <ChevronDown className={`size-4 transition-transform ${showBook ? "rotate-180" : ""}`} />
          {showBook ? "Hide" : "Show"} order book · advanced
        </Button>
        {showBook && (
          <div className="mt-2">
            <OrderBook orderbook={market.orderbook} />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Yes + No always settle to $1.00. Price shown is the implied probability.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
