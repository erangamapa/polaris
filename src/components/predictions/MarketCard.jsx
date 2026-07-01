import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, TrendingUp } from "lucide-react";
import { fmtCompact, fmtPct, fmtCents } from "@/lib/format";

export function MarketCard({ market, onOpen, onQuickBuy }) {
  return (
    <Card
      onClick={() => onOpen(market)}
      className="group cursor-pointer gap-0 overflow-hidden py-0 transition hover:border-ring/40"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`size-10 shrink-0 rounded-lg bg-gradient-to-br ${market.hue}`} />
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
      <CardFooter className="grid grid-cols-2 gap-2 border-t bg-muted/30 p-3">
        <Button
          variant="ghost"
          className="bg-[rgba(79,167,184,0.16)] text-[#78CAD7] hover:bg-[rgba(79,167,184,0.24)] hover:text-[#92D4DF]"
          onClick={(e) => { e.stopPropagation(); onQuickBuy(market, "Yes"); }}
        >
          Yes {fmtCents(market.yes)}
        </Button>
        <Button
          variant="ghost"
          className="bg-[rgba(214,90,112,0.14)] text-[#E17B8D] hover:bg-[rgba(214,90,112,0.22)] hover:text-[#eb93a3]"
          onClick={(e) => { e.stopPropagation(); onQuickBuy(market, "No"); }}
        >
          No {fmtCents(market.no)}
        </Button>
      </CardFooter>
    </Card>
  );
}
