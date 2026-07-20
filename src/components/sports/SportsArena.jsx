import { useState } from "react";
import { SPORTS_DEMO_MODE } from "@/lib/sportsDemo";
import { useIsDesktopBetslipLayout } from "@/lib/sportsDesktopBetslipUi";
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

// Owns view routing and the odds-pick -> shared betslip dispatch. `events`/
// `loading` are the merged, normalized inventory (real Azuro + demo-mode
// placeholders — see sportsDemo.js) fetched *once* in App.jsx, not here —
// the sidebar/mobile-menu live-count badges need the same data, so it's
// fetched at the one shared point rather than twice. Routes to one of six
// page components based on `view` (derived from the URL in App.jsx); none
// of those pages fetch or normalize data themselves.
//
// `betslip` is the shared SportsBetslipApi (see lib/sportsBetslip.js),
// owned in App.jsx — NOT here — specifically so selections survive leaving
// Sports for Casino/Predictions and coming back (this component remounts on
// every arena switch; the betslip must not).
export function SportsArena({
  view, sport, country, league, eventId,
  events, loading, betslip,
  onNavigate, activity, onBetPlaced, onDemoBetPlaced,
}) {
  // Whether the slip presentation is showing — UI-only, deliberately
  // separate from betslip.selections so closing it never clears selections
  // (see EMPTY AND CLEAR BEHAVIOUR: "closing or hiding a betslip
  // presentation must not clear selections"). Only meaningful below the
  // desktop breakpoint — at >=1024px the persistent DesktopBetslipPanel
  // (rendered in App.jsx, a flex sibling of this arena, not inside it)
  // takes over and this modal is never mounted, so the two presentations
  // can never render at the same time.
  const [slipOpen, setSlipOpen] = useState(false);
  const isDesktopLayout = useIsDesktopBetslipLayout();

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
    betslip.toggleSelection(event, market, outcome);
    setSlipOpen(true);
  };
  const closeSlip = () => setSlipOpen(false);
  // Only the "Done" path (after a real/demo bet is actually accepted)
  // clears the betslip — closing via X/backdrop must not (see above).
  const finishSlip = () => { setSlipOpen(false); betslip.clearSelections(); };

  const isSelected = betslip.isSelected;

  const body = (() => {
    switch (view) {
      case "live":
        return <LivePage events={events} loading={loading} onOpen={openEvent} onPick={pick} isSelected={isSelected} />;
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
            isSelected={isSelected}
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
            isSelected={isSelected}
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
            isSelected={isSelected}
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
            isSelected={isSelected}
          />
        );
    }
  })();

  // Mixed source is prevented at add-time (see useSportsBetslip), so
  // `selections` is guaranteed single-source whenever non-empty — exactly
  // one of these two ever renders, never both, never a merged list.
  const source = betslip.selections[0]?.source;

  return (
    <>
      {body}
      {slipOpen && !isDesktopLayout && source === "provider" && (
        <AzuroBetSlip
          selections={betslip.selections}
          stake={betslip.stake}
          setStake={betslip.setStake}
          removeSelection={betslip.removeSelection}
          combinedOdds={betslip.combinedOdds}
          potentialReturn={betslip.potentialReturn}
          validation={betslip.validation}
          onClose={closeSlip}
          onDone={finishSlip}
          onBetPlaced={onBetPlaced}
        />
      )}
      {slipOpen && !isDesktopLayout && source === "mock" && (
        <DemoBetSlip
          selections={betslip.selections}
          stake={betslip.stake}
          setStake={betslip.setStake}
          removeSelection={betslip.removeSelection}
          combinedOdds={betslip.combinedOdds}
          potentialReturn={betslip.potentialReturn}
          validation={betslip.validation}
          onClose={closeSlip}
          onDone={finishSlip}
          onBetPlaced={onDemoBetPlaced}
        />
      )}
    </>
  );
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
