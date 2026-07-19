import { Card, CardContent } from "@/components/ui/card";
import { OddsButton } from "./OddsButton";

// One market (a normalized SportsMarket) rendered as a labelled card of
// outcome buttons, used inside Event Detail's market-group tabs. Market-
// level suspension disables every outcome; an outcome can also be
// individually suspended (e.g. a line pulled mid-match) without the whole
// market disappearing.
export function MarketGroup({ event, market, selection, onPick }) {
  const cols = market.outcomes.length === 3 ? "grid-cols-3" : market.outcomes.length >= 4 ? "grid-cols-4" : "grid-cols-2";
  const marketSuspended = market.status === "suspended" || market.status === "closed";
  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{market.name}</span>
          {marketSuspended && <span className="shrink-0 text-[11px] font-medium text-muted-foreground">Suspended</span>}
        </div>
        <div className={`grid gap-2 ${cols}`}>
          {market.outcomes.map((o) => (
            <OddsButton
              key={o.id}
              label={o.name}
              odds={o.odds}
              disabled={marketSuspended || o.status === "suspended"}
              selected={selection?.marketId === market.id && selection?.outcomeId === o.id}
              onClick={() => onPick(event, market, o)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
