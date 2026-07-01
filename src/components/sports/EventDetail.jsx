import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Radio, Clock } from "lucide-react";
import { MARKET_GROUPS } from "@/lib/sportsData";
import { MarketCard } from "./MarketCard";

export function EventDetail({ event, selection, onBack, onPick }) {
  const groups = MARKET_GROUPS.filter((g) => event.markets.some((m) => m.group === g));
  const [group, setGroup] = useState(groups[0] ?? "Popular");
  const markets = event.markets.filter((m) => m.group === group);

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="size-4" /> All events
      </Button>

      <div>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{event.league}</Badge>
          {event.live ? (
            <span className="flex items-center gap-1 text-rose-400"><Radio className="size-3.5" /> Live · {event.clock}</span>
          ) : (
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {event.time}</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{event.home} v {event.away}</h1>
          {event.live && event.score && (
            <span className="font-mono text-lg font-bold tabular-nums text-emerald-400">
              {event.score[0]}–{event.score[1]}
            </span>
          )}
        </div>
      </div>

      {/* market-group tabs (simple pill row) */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              group === g ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {markets.map((m) => (
          <MarketCard key={m.key} event={event} market={m} selection={selection} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}
