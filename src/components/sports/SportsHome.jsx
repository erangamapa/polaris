import { ArenaTileRow } from "@/components/shell/ArenaTileRow";
import { SPORTS_PROMOS } from "@/lib/arenaPromos";
import { MVP_SPORTS, rankEvents } from "@/lib/sportsModel";
import { EventRow } from "./EventRow";
import { useEffect, useState } from "react";
import { track } from "@/lib/telemetry";

const POPULAR_COMPETITIONS = [
  { sport: "soccer", country: "england", league: "premier-league", label: "Premier League" },
  { sport: "soccer", country: "international", league: "champions-league", label: "Champions League" },
  { sport: "basketball", country: "usa", league: "nba", label: "NBA" },
  { sport: "baseball", country: "usa", league: "mlb", label: "MLB" },
  { sport: "american-football", country: "usa", league: "nfl", label: "NFL" },
  { sport: "tennis", country: "international", league: "atp-masters", label: "ATP" },
];

const ROW_LIMIT = 6;

// Cross-sport aggregation surface — pools the best inventory across all
// five MVP sports. Deliberately a different concept from a per-sport
// landing page's "Top matches" strip (see SportLanding.jsx): this page
// picks the best events *regardless* of sport, that one picks the best
// events *within* one sport. Sections are deduplicated against each other
// (an event never appears in two of Live now / Top matches / Starting
// soon) and hidden entirely when empty rather than showing a dead box.
export function SportsHome({ events, loading, demoMode, onOpen, onOpenSport, onOpenLeague, onPick, isSelected }) {
  const [query, setQuery] = useState("");

  useEffect(() => { track("sports_home_viewed", { eventCount: events.length }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const q = query.trim().toLowerCase();
  const searchMatches = q
    ? events.filter((e) => [e.sport.name, e.country.name, e.league.name, ...e.participants.map((p) => p.name)].some((s) => s?.toLowerCase().includes(q)))
    : [];

  const used = new Set();
  const take = (list, n) => {
    const out = [];
    for (const e of list) {
      if (used.has(e.id)) continue;
      out.push(e);
      used.add(e.id);
      if (out.length >= n) break;
    }
    return out;
  };

  const ranked = rankEvents(events);
  const liveNow = take(ranked.filter((e) => e.status === "live"), ROW_LIMIT);
  const topMatches = take(ranked.filter((e) => e.featured || (e.competitionPriority ?? 0) >= 85), ROW_LIMIT);
  const startingSoon = take(
    [...ranked].filter((e) => e.status === "upcoming").sort((a, b) => (Date.parse(a.startsAt) || Infinity) - (Date.parse(b.startsAt) || Infinity)),
    ROW_LIMIT
  );

  const popularCompetitions = POPULAR_COMPETITIONS
    .map((c) => ({ ...c, count: events.filter((e) => e.sport.id === c.sport && e.country.slug === c.country && e.league.slug === c.league).length }))
    .filter((c) => demoMode || c.count > 0);

  // LAYOUT STABILITY: no longer its own mx-auto max-w-6xl wrapper here —
  // SportsArena.jsx now wraps every view in the one shared ArenaPageColumn.
  return (
    <>
      <ArenaTileRow arena="sports" promos={SPORTS_PROMOS} query={query} onQuery={setQuery} />

      {q ? (
        <SearchResults query={query} matches={searchMatches} onOpen={onOpen} onPick={onPick} isSelected={isSelected} />
      ) : (
        <>
          <EventSection title="Live now" events={liveNow} onOpen={onOpen} onPick={onPick} isSelected={isSelected} />
          <EventSection title="Starting soon" events={startingSoon} onOpen={onOpen} onPick={onPick} isSelected={isSelected} />
          <EventSection title="Top matches" events={topMatches} onOpen={onOpen} onPick={onPick} isSelected={isSelected} />

          {popularCompetitions.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">Popular competitions</h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {popularCompetitions.map((c) => (
                  <button
                    key={`${c.sport}-${c.league}`}
                    onClick={() => onOpenLeague({ sport: { id: c.sport }, country: { slug: c.country }, league: { slug: c.league } })}
                    className="shrink-0 rounded-lg border bg-card px-4 py-3 text-left transition hover:border-[var(--global-cta)]"
                  >
                    <div className="text-sm font-semibold">{c.label}</div>
                    <div className="text-[11px] text-muted-foreground">{c.count > 0 ? `${c.count} event${c.count === 1 ? "" : "s"}` : "Explore"}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 text-sm font-bold">Sports</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {MVP_SPORTS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => onOpenSport(s.id)}
                    className="flex flex-col items-center gap-1.5 rounded-lg border bg-card py-3 transition-colors hover:border-[var(--global-cta)]"
                  >
                    <Icon className="size-5 text-[var(--ink-dim)]" aria-hidden="true" />
                    <span className="text-xs font-medium">{s.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {loading && events.length === 0 && <HomeSkeleton />}
          {!loading && events.length === 0 && (
            <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No events are available right now. Check back shortly.
            </p>
          )}
        </>
      )}
    </>
  );
}

function EventSection({ title, events, onOpen, onPick, isSelected }) {
  if (events.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e) => (
          <EventRow key={e.id} event={e} isSelected={isSelected} onOpen={onOpen} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}

function SearchResults({ query, matches, onOpen, onPick, isSelected }) {
  if (matches.length === 0) {
    return <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">No results for “{query}”.</p>;
  }
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold">Results for “{query}”</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {matches.slice(0, 12).map((e) => (
          <EventRow key={e.id} event={e} isSelected={isSelected} onOpen={onOpen} onPick={onPick} />
        ))}
      </div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl border bg-card" />
      ))}
    </div>
  );
}
