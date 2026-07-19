import { useState } from "react";
import { SPORTS_DEMO_MODE } from "@/lib/sportsDemo";
import { AzuroBetSlip } from "./AzuroBetSlip";
import { DemoBetSlip } from "./DemoBetSlip";
import { SportsHome } from "./SportsHome";
import { LivePage } from "./LivePage";
import { SportLanding } from "./SportLanding";
import { LeaguePage } from "./LeaguePage";
import { EventDetail } from "./EventDetail";
import { MyBets } from "./MyBets";
import { ProviderDiagnostics } from "./ProviderDiagnostics";
import { track } from "@/lib/telemetry";

// Owns the odds-pick -> betslip dispatch and view routing. `events`/
// `loading` are the merged, normalized inventory (real Azuro + demo-mode
// placeholders — see sportsDemo.js) fetched *once* in App.jsx, not here —
// the sidebar/mobile-menu live-count badges need the same data, so it's
// fetched at the one shared point rather than twice. Routes to one of six
// page components based on `view` (derived from the URL in App.jsx); none
// of those pages fetch or normalize data themselves.
export function SportsArena({
  view, sport, country, league, eventId,
  events, loading,
  onNavigate, activity, onBetPlaced, onDemoBetPlaced,
}) {
  const [selection, setSelection] = useState(null); // { event, market, outcome }

  const openEvent = (event) => {
    track("sports_event_selected", { sport: event.sport.id, eventId: event.id, source: event.source, route: `/sports/${event.sport.id}/event/${event.id}` });
    onNavigate({ view: "event", sport: event.sport.id, eventId: event.id, country: null, league: null });
  };
  const openLeague = (event) => {
    track("sports_league_selected", { sport: event.sport.id, country: event.country.slug, league: event.league.slug });
    onNavigate({ view: "league", sport: event.sport.id, country: event.country.slug, league: event.league.slug, eventId: null });
  };
  const openSport = (sportId) => {
    track("sports_sport_selected", { sport: sportId });
    onNavigate({ view: "sport", sport: sportId, country: null, league: null, eventId: null });
  };

  // Provider bets are never gated here — AzuroBetSlip already handles its
  // own connection state and chain-switching internally (Sports runs on
  // Polygon Amoy, not the Base Sepolia chain App.jsx's generic ensureAuth
  // checks for Casino, so reusing it here would incorrectly prompt a
  // Casino-chain switch for a Sports bet).
  const pick = (event, market, outcome) => {
    track("sports_market_selected", { sport: event.sport.id, eventId: event.id, source: event.source, marketGroup: market.group });
    setSelection({ event, market, outcome });
  };
  const closeSlip = () => setSelection(null);

  const body = (() => {
    switch (view) {
      case "live":
        return <LivePage events={events} loading={loading} onOpen={openEvent} onPick={pick} selection={selectionFor(selection)} />;
      case "sport":
        return (
          <SportLanding
            sportId={sport}
            events={events}
            loading={loading}
            demoMode={SPORTS_DEMO_MODE}
            onOpen={openEvent}
            onOpenLeague={openLeague}
            onPick={pick}
            selection={selectionFor(selection)}
          />
        );
      case "league":
        return (
          <LeaguePage
            sportId={sport}
            countrySlug={country}
            leagueSlug={league}
            events={events}
            onOpen={openEvent}
            onOpenSport={openSport}
            onPick={pick}
            selection={selectionFor(selection)}
          />
        );
      case "event": {
        const event = events.find((e) => e.id === eventId);
        if (!event) {
          return (
            <EmptyEventFallback sportId={sport} onOpenSport={() => openSport(sport)} />
          );
        }
        return (
          <EventDetail
            event={event}
            selection={selectionFor(selection)}
            onBack={() => openSport(event.sport.id)}
            onPick={pick}
          />
        );
      }
      case "my-bets":
        return <MyBets activity={activity} />;
      case "dev":
        return <ProviderDiagnostics />;
      case "home":
      default:
        return (
          <SportsHome
            events={events}
            loading={loading}
            demoMode={SPORTS_DEMO_MODE}
            onOpen={openEvent}
            onOpenSport={openSport}
            onOpenLeague={openLeague}
            onPick={pick}
            selection={selectionFor(selection)}
          />
        );
    }
  })();

  return (
    <>
      {body}
      {selection && selection.event.source === "provider" && (
        <AzuroBetSlip
          selection={{ game: selection.event.raw, market: selection.market.raw, outcome: selection.outcome.raw }}
          onClose={closeSlip}
          onBetPlaced={onBetPlaced}
        />
      )}
      {selection && selection.event.source === "mock" && (
        <DemoBetSlip selection={selection} onClose={closeSlip} onBetPlaced={onDemoBetPlaced} />
      )}
    </>
  );
}

function selectionFor(selection) {
  if (!selection) return null;
  return { marketId: selection.market.id, outcomeId: selection.outcome.id };
}

function EmptyEventFallback({ sportId, onOpenSport }) {
  return (
    <div className="space-y-3 rounded-lg border border-dashed py-10 text-center">
      <p className="text-sm text-muted-foreground">This event isn't available right now — it may have finished or been removed.</p>
      <button onClick={onOpenSport} className="text-sm font-semibold text-[var(--global-cta)] hover:underline">
        Back to {sportId ?? "Sports"}
      </button>
    </div>
  );
}
