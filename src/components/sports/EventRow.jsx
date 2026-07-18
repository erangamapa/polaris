import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Clock, ChevronRight } from "lucide-react";
import { mainMarket } from "@/lib/sportsData";
import { OddsButton } from "./OddsButton";

export function EventRow({ event, selection, onPick, onOpen }) {
  const m = mainMarket(event);
  const cols = m.outcomes.length === 3 ? "grid-cols-3" : "grid-cols-2";
  const extra = event.markets.length - 1;

  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <button onClick={() => onOpen(event)} className="mb-2 flex w-full items-center gap-2 text-left text-xs text-muted-foreground">
          {event.live ? (
            <StatusBadge
              variant="live"
              icon="dot"
              label={`Live · ${event.clock}`}
              ariaLabel={`Live, ${event.clock} elapsed`}
            />
          ) : (
            <span className="flex items-center gap-1"><Clock className="size-3.5" />{event.time}</span>
          )}
          <span className="ml-auto flex items-center gap-0.5">{m.name} <ChevronRight className="size-3.5" /></span>
        </button>

        <button onClick={() => onOpen(event)} className="mb-3 block w-full space-y-0.5 text-left">
          <Team name={event.home} score={event.score?.[0]} live={event.live} />
          <Team name={event.away} score={event.score?.[1]} live={event.live} />
        </button>

        <div className={`grid gap-2 ${cols}`}>
          {m.outcomes.map((o) => (
            <OddsButton
              key={o.pick}
              label={o.label}
              odds={o.odds}
              dir={o.dir}
              disabled={event.suspended}
              selected={selection?.marketKey === m.key && selection?.outcomeLabel === o.label}
              onClick={() => onPick(event, m, o)}
            />
          ))}
        </div>

        {extra > 0 && (
          <button
            onClick={() => onOpen(event)}
            className="mt-2 w-full rounded-lg bg-muted/40 py-1.5 text-xs text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            +{extra} more market{extra !== 1 ? "s" : ""}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function Team({ name, score, live }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium">{name}</span>
      {live && score != null && (
        <span className="font-mono text-sm font-bold tabular-nums text-foreground">{score}</span>
      )}
    </div>
  );
}
