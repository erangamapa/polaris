import { useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { sportById } from "@/lib/sportsModel";
import { EventRow } from "./EventRow";
import { track } from "@/lib/telemetry";

// Breadcrumb -> league header -> date groups -> event rows. Preserves sport
// and country context (breadcrumb links back up the hierarchy) and never
// silently redirects on an empty league — it shows a real empty state.
export function LeaguePage({ sportId, countrySlug, leagueSlug, events, onOpen, onOpenSport, onPick, selection }) {
  const sport = sportById(sportId);
  const leagueEvents = events.filter(
    (e) => e.sport.id === sportId && e.country.slug === countrySlug && e.league.slug === leagueSlug
  );
  const countryName = leagueEvents[0]?.country.name ?? countrySlug;
  const leagueName = leagueEvents[0]?.league.name ?? leagueSlug;

  useEffect(() => {
    track("sports_league_selected", { sport: sportId, country: countrySlug, league: leagueSlug, eventCount: leagueEvents.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sportId, countrySlug, leagueSlug]);

  const groups = groupByDate(leagueEvents);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <button onClick={onOpenSport} className="hover:text-foreground hover:underline">{sport?.name}</button>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span>{countryName}</span>
        <ChevronRight className="size-3" aria-hidden="true" />
        <span className="text-foreground">{leagueName}</span>
      </nav>

      <h1 className="text-lg font-bold">{sport?.name} / {countryName} / {leagueName}</h1>

      {leagueEvents.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No active events in {leagueName} right now.
        </p>
      ) : (
        groups.map(([label, evs]) => (
          <section key={label}>
            <h2 className="mb-2 text-sm font-bold">{label}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {evs.map((e) => (
                <EventRow key={e.id} event={e} selection={selection} onOpen={onOpen} onPick={onPick} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function groupByDate(events) {
  const map = new Map();
  for (const e of events) {
    const label = e.status === "live" ? "Live" : dateLabel(e.startsAt);
    if (!map.has(label)) map.set(label, []);
    map.get(label).push(e);
  }
  // Live first, then chronological groups in the order first encountered.
  const entries = [...map.entries()];
  entries.sort((a, b) => (a[0] === "Live" ? -1 : b[0] === "Live" ? 1 : 0));
  return entries;
}

function dateLabel(isoString) {
  if (!isoString) return "TBD";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "TBD";
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return "Today";
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}
