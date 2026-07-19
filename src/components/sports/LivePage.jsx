import { useEffect } from "react";
import { MVP_SPORTS } from "@/lib/sportsModel";
import { EventRow } from "./EventRow";
import { track } from "@/lib/telemetry";

// Live events across all five MVP sports, grouped by sport. A sport with no
// live events simply doesn't get a heading — never a dead empty group.
export function LivePage({ events, loading, onOpen, onPick, isSelected }) {
  useEffect(() => { track("sports_live_viewed", { liveCount: events.filter((e) => e.status === "live").length }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const live = events.filter((e) => e.status === "live");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-lg font-bold">Live</h1>

      {loading && live.length === 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl border bg-card" />)}
        </div>
      ) : live.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No live events right now. Check Sports Home for starting-soon fixtures.
        </p>
      ) : (
        MVP_SPORTS.map((sport) => {
          const sportEvents = live.filter((e) => e.sport.id === sport.id);
          if (sportEvents.length === 0) return null;
          return (
            <section key={sport.id}>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <span aria-hidden="true">{sport.icon}</span> {sport.name}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sportEvents.map((e) => (
                  <EventRow key={e.id} event={e} isSelected={isSelected} onOpen={onOpen} onPick={onPick} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
