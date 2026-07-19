import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Clock } from "lucide-react";
import { OddsButton } from "./OddsButton";
import { primaryMarket, teamQuickMarkets } from "./eventTemplates";

// One shared compact-row shell for all three event-layout families (soccer /
// tennis / team-sport). Basketball, Baseball and American Football all
// render through the "team" branch below — they differ only in which real
// quick-bet markets exist for a given event, never in component identity.
// Never renders every market — see COMPACT EVENT ROW / "detailed markets
// exist only on Event Detail."
export function EventRow({ event, selection, onOpen, onPick }) {
  const family = event.sport.templateFamily;
  const [p1, p2] = event.participants;
  const isLive = event.status === "live";
  const isSuspended = event.status === "suspended";
  const timeLabel = formatStartTime(event.startsAt, event.timeLabel);

  const isPicked = (marketId, outcomeId) => selection?.marketId === marketId && selection?.outcomeId === outcomeId;

  return (
    <Card className="py-0">
      <CardContent className="p-3">
        <button onClick={() => onOpen(event)} className="mb-2 flex w-full items-center gap-2 text-left text-xs text-muted-foreground">
          {isLive ? (
            <StatusBadge
              variant="live"
              icon="dot"
              label={event.clock ? `Live · ${event.clock}` : "Live"}
              ariaLabel={`Live${event.clock ? `, ${event.clock}` : ""}`}
            />
          ) : (
            <span className="flex items-center gap-1"><Clock className="size-3.5" aria-hidden="true" />{timeLabel}</span>
          )}
          <span className="ml-auto truncate">{event.league.name}</span>
        </button>

        <button onClick={() => onOpen(event)} className="mb-3 block w-full space-y-0.5 text-left">
          <Participant name={p1.name} score={event.score?.[0]} show={isLive} />
          <Participant name={p2.name} score={event.score?.[1]} show={isLive} />
        </button>

        {family === "team" ? (
          <TeamOddsGrid event={event} isPicked={isPicked} onPick={onPick} suspended={isSuspended} />
        ) : (
          <PrimaryMarketOdds event={event} isPicked={isPicked} onPick={onPick} suspended={isSuspended} />
        )}

        <ExtraMarketsLink event={event} family={family} onOpen={onOpen} />
      </CardContent>
    </Card>
  );
}

function Participant({ name, score, show }) {
  return (
    <div className="flex items-center justify-between">
      <span className="truncate text-sm font-medium">{name}</span>
      {show && score != null && <span className="font-mono text-sm font-bold tabular-nums text-foreground">{score}</span>}
    </div>
  );
}

// Soccer (1X2) and tennis (two-way) both show one market's outcomes as a
// row of 2-3 buttons — the difference is just outcome count.
function PrimaryMarketOdds({ event, isPicked, onPick, suspended }) {
  const market = primaryMarket(event);
  if (!market || market.outcomes.length === 0) return <NoMarketsNotice />;
  const cols = market.outcomes.length === 3 ? "grid-cols-3" : "grid-cols-2";
  const symbols = market.outcomes.length === 3 ? ["1", "X", "2"] : ["1", "2"];
  return (
    <div className={`grid gap-2 ${cols}`}>
      {market.outcomes.map((o, i) => (
        <OddsButton
          key={o.id}
          label={symbols[i] ?? o.name}
          odds={o.odds}
          disabled={suspended || o.status === "suspended"}
          selected={isPicked(market.id, o.id)}
          onClick={() => onPick(event, market, o)}
        />
      ))}
    </div>
  );
}

// Team-sport quick-bet columns: Moneyline / Spread / Total, each column
// showing whichever outcomes that market actually has. A column is simply
// omitted if that market doesn't exist for this event (never a forced
// empty slot — real provider inventory won't always have all three).
function TeamOddsGrid({ event, isPicked, onPick, suspended }) {
  const { moneyline, spread, total } = teamQuickMarkets(event);
  const columns = [
    { key: "moneyline", label: "Moneyline", market: moneyline },
    { key: "spread", label: "Spread", market: spread },
    { key: "total", label: "Total", market: total },
  ].filter((c) => c.market?.outcomes?.length);

  if (columns.length === 0) return <NoMarketsNotice />;

  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((c) => (
        <div key={c.key} className="space-y-1">
          <div className="truncate text-center text-[10px] font-medium text-muted-foreground">{c.label}</div>
          {c.market.outcomes.slice(0, 2).map((o) => (
            <OddsButton
              key={o.id}
              label={o.name}
              odds={o.odds}
              disabled={suspended || o.status === "suspended"}
              selected={isPicked(c.market.id, o.id)}
              onClick={() => onPick(event, c.market, o)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function NoMarketsNotice() {
  return <p className="rounded-lg border border-dashed py-3 text-center text-xs text-muted-foreground">No markets available right now.</p>;
}

function ExtraMarketsLink({ event, family, onOpen }) {
  const shown = family === "team" ? Object.values(teamQuickMarkets(event)).filter(Boolean).length : 1;
  const extra = event.markets.length - shown;
  if (extra <= 0) return null;
  return (
    <button
      onClick={() => onOpen(event)}
      className="mt-2 w-full rounded-lg bg-muted/40 py-1.5 text-xs text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      +{extra} more market{extra !== 1 ? "s" : ""}
    </button>
  );
}

function formatStartTime(isoString, fallbackLabel) {
  if (!isoString) return fallbackLabel ?? "TBD";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return fallbackLabel ?? "TBD";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + ` ${time}`;
}

export { formatStartTime };
