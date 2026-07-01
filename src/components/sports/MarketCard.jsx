import { Card, CardContent } from "@/components/ui/card";
import { OddsButton } from "./OddsButton";

export function MarketCard({ event, market, selection, onPick }) {
  const cols = market.outcomes.length === 3 ? "grid-cols-3" : "grid-cols-2";
  const suspended = event.suspended;
  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium">{market.name}</span>
          {suspended && <span className="text-[11px] font-medium text-muted-foreground">Suspended</span>}
        </div>
        <div className={`grid gap-2 ${cols}`}>
          {market.outcomes.map((o) => (
            <OddsButton
              key={o.pick}
              label={o.label}
              odds={o.odds}
              dir={o.dir}
              disabled={suspended}
              selected={selection?.marketKey === market.key && selection?.outcomeLabel === o.label}
              onClick={() => onPick(event, market, o)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
