import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { groupAndOrderMarkets } from "./eventTemplates";
import { MarketGroup } from "./MarketCard";
import { formatStartTime } from "./EventRow";

// Market depth lives here, not on any listing page — the old "On-chain
// Sports" block used to dump every market inline; this is where that depth
// moved to. Tab set is configurable per template family (see
// eventTemplates.js), not five separate Event Detail components.
export function EventDetail({ event, isSelected, onBack, onPick }) {
  const family = event.sport.templateFamily;
  const groups = groupAndOrderMarkets(event.markets, family);
  const [activeGroup, setActiveGroup] = useState(groups[0]?.group);
  const active = groups.find((g) => g.group === activeGroup) ?? groups[0];
  const isLive = event.status === "live";
  const isStarted = event.status === "started";
  const [p1, p2] = event.participants;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="size-4" /> All events
      </Button>

      <div>
        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{event.league.name}</Badge>
          {isLive ? (
            <StatusBadge variant="live" icon="dot" label={event.clock ? `Live · ${event.clock}` : "Live"} ariaLabel={`Live${event.clock ? `, ${event.clock}` : ""}`} />
          ) : isStarted ? (
            <span className="text-muted-foreground">Started</span>
          ) : (
            <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{formatStartTime(event.startsAt, event.timeLabel)}</span>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 truncate text-lg font-bold">{p1?.name} v {p2?.name}</h1>
          {isLive && event.score && (
            <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-foreground">
              {event.score[0]}–{event.score[1]}
            </span>
          )}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
          No markets on this event right now.
        </p>
      ) : (
        <>
          <div role="tablist" aria-label="Market category" className="flex gap-2 overflow-x-auto pb-1">
            {groups.map((g) => (
              <button
                key={g.group}
                role="tab"
                aria-selected={active?.group === g.group}
                onClick={() => setActiveGroup(g.group)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active?.group === g.group ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {active?.markets.map((m) => (
              <MarketGroup key={m.id} event={event} market={m} isSelected={isSelected} onPick={onPick} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
