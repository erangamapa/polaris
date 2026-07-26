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
        {/* RESKIN: was bg-gradient-to-br ${market.hue} — same arbitrary
            rainbow swatch as MarketCard's list view, flattened to match
            (neutral, --radius-lg to align with MarketCard's own swatch). */}
        <div className="size-12 shrink-0 rounded-lg bg-[var(--secondary)]" />
        <div>
          {/* RESKIN (product-language unification): was .text-title-s — a
              one-off richer scale only Predictions' detail page used.
              Sports' equivalent single-item detail header (EventDetail.jsx)
              uses plain text-lg font-bold, same as every list-page h1
              across all three arenas; matching that instead of maintaining
              a second scale for one page. Simplicity over an unnecessary
              extra type role — see final report. */}
          <h1 className="text-lg font-bold">{market.question}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{market.category}</Badge>
            <span className="flex items-center gap-1"><TrendingUp className="size-3.5" />{fmtCompact(market.volumeTotal)} Vol</span>
            <span className="flex items-center gap-1"><Clock className="size-3.5" />Closes {market.closes}</span>
          </div>
        </div>
        <div className="ml-auto text-right">
          {/* RESKIN v2 CALIBRATION: was font-black (weight 900, unaffected
              by the app-wide font-weight-bold override) and a hardcoded
              #92D4DF — the OLD predictions steel-cyan text-accent, never
              updated to the token when the arena colors were recolored to
              racing green. A percentage is DATA (font-mono), not display. */}
          <div className="font-mono text-2xl font-semibold tabular-nums text-[var(--predictions-text-accent)]">{fmtPct(market.yes)}</div>
          <div className="text-[11px] text-muted-foreground">Yes chance</div>
        </div>
      </div>

      <Card>
        <CardContent className="pt-0">
          <ProbabilityChart data={market.series} />
        </CardContent>
      </Card>

      {/* CTA OWNERSHIP SYSTEM: "Buy YES / Buy NO" are both Predictions
          arena actions — the ownership rule cares who owns the action
          (Predictions), not which side of the trade it is, so both use
          the same Predictions Action Green rather than a semantic
          yes=green/no=red pair. The button label ("Buy Yes"/"Buy No")
          is what disambiguates the two, by design. */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          size="lg"
          className="h-12 bg-[var(--predictions-action)] text-base font-bold text-[var(--predictions-action-text)] hover:bg-[var(--predictions-action-hover)] active:bg-[var(--predictions-action-active)]"
          onClick={() => onBuy(market, "Yes")}
        >
          Buy Yes · {fmtCents(market.yes)}
        </Button>
        <Button
          size="lg"
          className="h-12 bg-[var(--predictions-action)] text-base font-bold text-[var(--predictions-action-text)] hover:bg-[var(--predictions-action-hover)] active:bg-[var(--predictions-action-active)]"
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
            <p className="mt-1 text-[var(--foreground)]">{market.resolutionSource}</p>
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
