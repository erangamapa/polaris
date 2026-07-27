import { useRef, useState } from "react";
import { Ticket } from "lucide-react";
import { SPORTS_DEMO_MODE } from "@/lib/sportsDemo";
import { useIsDesktopBetslipLayout } from "@/lib/sportsDesktopBetslipUi";
import { shouldShowReopenPill } from "@/lib/sportsMobileBetslipUi";
import { StatusBadge } from "@/components/ui/status-badge";
import { MobileBetslipSheet } from "./MobileBetslipSheet";
import { ArenaPageColumn } from "@/components/shell/ArenaPageColumn";
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
  onBetslipWillOpen,
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
  // Captured at the moment the sheet opens (the odds button the user just
  // tapped) so MobileBetslipSheet can restore focus there on close — Radix
  // has nothing to auto-return to here since this isn't opened via a
  // <DialogTrigger> (see ACCESSIBILITY: "closing restores focus to the
  // betslip trigger or selected odds control").
  const triggerRef = useRef(null);

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
    if (document.activeElement instanceof HTMLElement) triggerRef.current = document.activeElement;
    // OVERLAY OWNERSHIP: not reachable via normal UI today (odds buttons
    // only exist on Sports pages, which the mobile menu / other App-level
    // overlays already fully cover while open), but defensive rather than
    // assumed — see App.jsx's closeOtherOverlays for the other direction.
    onBetslipWillOpen?.();
    betslip.toggleSelection(event, market, outcome);
    setSlipOpen(true);
  };
  const closeSlip = () => setSlipOpen(false);

  // "Continue betting" / "View My Bets" from the sheet's success screen —
  // both remove only the just-submitted selection (never a blanket
  // clearSelections()), so any other selection that happened to be present
  // and blocking submission stays exactly where it was (see PLACE BET FLOW:
  // "preserves unplaced or invalid selections where appropriate"). Today the
  // provider's one-selection-at-a-time limit means a submission can only
  // ever succeed when it's the sole selection, so this is equivalent in
  // practice — but it's the architecturally correct call, not a shortcut.
  const continueBetting = (selectionId) => {
    betslip.removeSelection(selectionId);
    setSlipOpen(false);
  };
  const viewMyBets = (selectionId) => {
    betslip.removeSelection(selectionId);
    setSlipOpen(false);
    onNavigate({ view: "my-bets", sport: null, country: null, league: null, eventId: null });
  };

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

  // Reopen affordance for when the user closed the sheet with selections
  // still pending (see OPENING THE BETSLIP: "clearly expose the populated
  // betslip access point, show the current selection count") — a
  // contextual floating pill, not a fifth bottom-nav item: it only exists
  // while there's something to review, and disappears the moment the
  // betslip is opened or emptied.
  const showReopenPill = shouldShowReopenPill({ isDesktopLayout, slipOpen, selectionCount: betslip.selectionCount });

  // LAYOUT STABILITY: the shared content column is wrapped ONCE here, for
  // every view this component routes to (home/live/sport/league/event/
  // my-bets/dev) — see ArenaPageColumn.jsx for why. Previously each of
  // SportsHome/SportLanding/LeaguePage/LivePage duplicated an identical
  // `mx-auto max-w-6xl space-y-6` wrapper by hand, MyBets/
  // ProviderDiagnostics each had their own narrower (and inconsistent)
  // max-w-3xl copy, and EventDetail/EmptyEventFallback had no width cap
  // at all — six independently-authored copies of geometry that should
  // never have differed. `showReopenPill`'s button is a `fixed`-position
  // floating element, not page content, so it stays outside the column.
  return (
    <>
      <ArenaPageColumn>{body}</ArenaPageColumn>

      {showReopenPill && (
        <button
          onClick={() => setSlipOpen(true)}
          data-test-id="betslip-reopen-pill"
          className="fixed inset-x-4 z-[85] flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--global-cta)] px-4 text-sm font-semibold text-[var(--global-cta-text)] shadow-lg shadow-black/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:hidden"
          style={{ bottom: "calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px) + 12px)" }}
        >
          <Ticket className="size-4" aria-hidden="true" />
          View betslip
          <StatusBadge variant="neutral" size="small" count={betslip.selectionCount} ariaLabel={`${betslip.selectionCount} selection${betslip.selectionCount === 1 ? "" : "s"}`} />
        </button>
      )}

      <MobileBetslipSheet
        open={slipOpen && !isDesktopLayout}
        betslip={betslip}
        onClose={closeSlip}
        onBrowseSports={closeSlip}
        onBetPlaced={onBetPlaced}
        onDemoBetPlaced={onDemoBetPlaced}
        onContinueBetting={continueBetting}
        onViewMyBets={viewMyBets}
        restoreFocusRef={triggerRef}
      />
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
