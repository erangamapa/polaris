import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";
import { fmtCompact, fmtPct, fmtCents } from "@/lib/format";

export function MarketCard({ market, onOpen, onQuickBuy }) {
  return (
    <Card
      onClick={() => onOpen(market)}
      className="group cursor-pointer gap-0 overflow-hidden py-0 transition hover:border-ring/40"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* RESKIN: was bg-gradient-to-br ${market.hue} — an arbitrary
              rainbow swatch (8 unrelated Tailwind gradient pairs across
              predictionsData.js's markets) sitting beside two more colors
              in the footer below. "One card language... everything else
              becomes quieter" — flattened to a plain neutral swatch. */}
          <div className="size-10 shrink-0 rounded-lg bg-[var(--secondary)]" />
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm font-semibold leading-snug">{market.question}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" />
              {fmtCompact(market.volumeTotal)} Vol
            </div>
          </div>
          <div className="ml-auto shrink-0 text-right">
            <div className="text-lg font-bold tabular-nums">{fmtPct(market.yes)}</div>
            <div className="text-[11px] text-muted-foreground">chance</div>
          </div>
        </div>
      </CardContent>
      {/* CTA OWNERSHIP SYSTEM: quick-buy Yes/No is the same arena action as
          MarketDetail's "Buy Yes/Buy No" (just condensed for a list card)
          — both use Predictions Action Green via the shared "action"
          variant, not a semantic yes/no color pair, for the same reason
          MarketDetail's buttons do (see that file). Previously these also
          carried a stale hardcoded steel-cyan/rose color-mix as a
          left-over from before this system existed. */}
      <CardFooter className="grid grid-cols-2 gap-2 border-t bg-muted/30 p-3">
        <Button
          variant="action"
          onClick={(e) => { e.stopPropagation(); onQuickBuy(market, "Yes"); }}
        >
          Yes {fmtCents(market.yes)}
        </Button>
        <Button
          variant="action"
          onClick={(e) => { e.stopPropagation(); onQuickBuy(market, "No"); }}
        >
          No {fmtCents(market.no)}
        </Button>
      </CardFooter>
    </Card>
  );
}
