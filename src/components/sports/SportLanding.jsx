import { useEffect, useState } from "react";
import { sportById, rankEvents, groupByCountryLeague } from "@/lib/sportsModel";
import { EventRow } from "./EventRow";
import { track } from "@/lib/telemetry";

// Each of the five MVP sports gets this same page shape: a short "top
// matches" strip (sport-specific — a different concept from Sports Home's
// cross-sport version, see SportsHome.jsx), a Live/Upcoming toggle, then
// events grouped Country -> League. Empty leagues/countries are filtered
// out entirely rather than rendered as empty headings.
export function SportLanding({ sportId, events, loading, demoMode, onOpen, onOpenLeague, onPick, isSelected }) {
  const sport = sportById(sportId);
  const [tab, setTab] = useState("live"); // "live" | "upcoming"
  const sportEvents = events.filter((e) => e.sport.id === sportId);

  useEffect(() => { track("sports_sport_selected", { sport: sportId, eventCount: sportEvents.length }); }, [sportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const live = sportEvents.filter((e) => e.status === "live");
  const upcoming = sportEvents.filter((e) => e.status === "upcoming");
  useEffect(() => { setTab(live.length > 0 ? "live" : "upcoming"); }, [sportId]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranked = rankEvents(sportEvents);
  const topMatches = ranked.filter((e) => e.featured || (e.competitionPriority ?? 0) >= 85).slice(0, 5);
  const shownTab = tab === "live" ? live : upcoming;
  // "Avoid duplicating events immediately below when possible."
  const belowList = shownTab.filter((e) => !topMatches.some((t) => t.id === e.id));
  const groups = groupByCountryLeague(belowList);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <span className="text-xl" aria-hidden="true">{sport?.icon}</span>
        <h1 className="text-lg font-bold">{sport?.name}</h1>
      </div>

      {topMatches.length >= 2 && (
        <section>
          <h2 className="mb-2 text-sm font-bold">Top matches</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topMatches.map((e) => (
              <EventRow key={e.id} event={e} isSelected={isSelected} onOpen={onOpen} onPick={onPick} />
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-2" role="tablist" aria-label="Live or upcoming">
        <TabButton active={tab === "live"} onClick={() => setTab("live")} count={live.length}>Live</TabButton>
        <TabButton active={tab === "upcoming"} onClick={() => setTab("upcoming")} count={upcoming.length}>Upcoming</TabButton>
      </div>

      {loading && sportEvents.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl border bg-card" />)}
        </div>
      ) : groups.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {shownTab.length > 0
            // Every event in this tab is already shown in Top matches above —
            // real content, just deduplicated, not an empty-inventory state.
            ? `All ${tab} ${sport?.name} events are shown in Top matches above.`
            : demoMode
              ? `No ${tab} ${sport?.name} events right now.`
              : `No active ${sport?.name} events right now. Check Live, view upcoming events, or return to Sports Home.`}
        </p>
      ) : (
        groups.map((g) => (
          <section key={`${g.country.slug}-${g.league.slug}`}>
            <button
              onClick={() => onOpenLeague(g.events[0])}
              className="mb-2 flex items-center gap-1.5 text-sm font-bold hover:underline"
            >
              {g.country.name} <span className="text-muted-foreground">·</span> {g.league.name}
            </button>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.events.map((e) => (
                <EventRow key={e.id} event={e} isSelected={isSelected} onOpen={onOpen} onPick={onPick} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function TabButton({ active, onClick, count, children }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children} {count > 0 && <span className="tabular-nums text-muted-foreground">({count})</span>}
    </button>
  );
}
