// Shared multi-selection Sports betslip state — the one authoritative model
// consumed by every Sports page and both bet-slip presentations (real Azuro,
// demo). Lifted to App.jsx (not owned inside SportsArena) because
// SportsArena remounts on every arena switch (see App.jsx's
// `<ArenaErrorBoundary key={product}>`) — selections must survive leaving
// Sports for Casino/Predictions and coming back.
//
// This file is deliberately split into pure, non-React functions (fully
// unit-testable without rendering anything — see sportsBetslip.test.js) plus
// one thin `useSportsBetslip()` hook that wires them to useReducer.
//
// Shapes (JSDoc — this repo is plain JS, not TypeScript):
//
// SportsSelectionSource = "provider" | "mock"
// SportsSelectionStatus = "active" | "odds_changed" | "suspended"
//   | "removed" | "event_started" | "event_finished" | "invalid"
//
// SportsSelection = {
//   id, eventId, marketId, outcomeId, source,
//   sportId, countrySlug?, leagueSlug?,
//   eventLabel, marketLabel, outcomeLabel,
//   odds, previousOdds?, eventStartsAt?, status,
//   payload, // { event, market, outcome } — the normalized objects this
//            // selection was built from; AzuroBetSlip/DemoBetSlip pull
//            // whatever raw provider/mock refs they need from here.
// }
//
// SportsBetslipState = { selections: SportsSelection[], stake: string }

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { track } from "./telemetry";
import { toast } from "./toast";

const BLOCKED_STATUSES = new Set(["suspended", "removed", "event_started", "event_finished", "invalid"]);

export function selectionId(eventId, marketId, outcomeId) {
  return `${eventId}:${marketId}:${outcomeId}`;
}

// (event, market, outcome) are the normalized objects from sportsModel.js —
// already carry stable, deterministic ids (never random, never index-based).
export function buildSelection(event, market, outcome) {
  const [p1, p2] = event.participants ?? [];
  const eventLabel = p1 && p2 ? `${p1.name} v ${p2.name}` : (p1?.name ?? event.id ?? "Event");
  return {
    id: selectionId(event.id, market.id, outcome.id),
    eventId: event.id,
    marketId: market.id,
    outcomeId: outcome.id,
    source: event.source,
    sportId: event.sport?.id,
    countrySlug: event.country?.slug,
    leagueSlug: event.league?.slug,
    eventLabel,
    marketLabel: market.name ?? "Market",
    outcomeLabel: outcome.name ?? "Outcome",
    odds: Number(outcome.odds),
    previousOdds: undefined,
    eventStartsAt: event.startsAt ?? null,
    status: "active",
    payload: { event, market, outcome },
  };
}

const initialState = { selections: [], stake: "" };

function removeSameMarket(selections, eventId, marketId, exceptId) {
  return selections.filter((s) => !(s.eventId === eventId && s.marketId === marketId && s.id !== exceptId));
}

// Rule 3 (replace mutually exclusive outcome) lives here, shared by both
// ADD and REPLACE — adding always implies "replace whatever else was
// selected in this same event+market," which is exactly what a replace is.
function addOrReplace(selections, selection) {
  if (selections.some((s) => s.id === selection.id)) return selections; // duplicate guard (rule 6)
  const withoutSameMarket = removeSameMarket(selections, selection.eventId, selection.marketId, selection.id);
  return [...withoutSameMarket, selection];
}

export function sportsBetslipReducer(state, action) {
  switch (action.type) {
    case "ADD_SELECTION":
    case "REPLACE_MARKET_SELECTION":
      return { ...state, selections: addOrReplace(state.selections, action.selection) };

    case "REMOVE_SELECTION":
    case "REMOVE_INVALID_SELECTION":
      return { ...state, selections: state.selections.filter((s) => s.id !== action.id) };

    case "TOGGLE_SELECTION": {
      const sel = action.selection;
      const exists = state.selections.some((s) => s.id === sel.id);
      return {
        ...state,
        selections: exists
          ? state.selections.filter((s) => s.id !== sel.id)
          : addOrReplace(state.selections, sel),
      };
    }

    case "UPDATE_SELECTION_ODDS": {
      const { id, odds } = action;
      if (!Number.isFinite(odds) || odds <= 0) return state; // malformed provider odds — ignore, keep prior odds
      return {
        ...state,
        selections: state.selections.map((s) =>
          s.id === id && odds !== s.odds
            ? { ...s, previousOdds: s.odds, odds, status: s.status === "active" ? "odds_changed" : s.status }
            : s
        ),
      };
    }

    case "SET_SELECTION_STATUS":
      return { ...state, selections: state.selections.map((s) => (s.id === action.id ? { ...s, status: action.status } : s)) };

    case "SET_STAKE":
      return { ...state, stake: action.value };

    case "CLEAR_BETSLIP":
      // Documented choice: clear all selections AND reset stake — a fresh
      // betslip, not a stake left dangling from a cleared/submitted set.
      return { ...initialState };

    default:
      return state;
  }
}

// ── Stake / odds / return calculations ──────────────────────────────────

// Stake is stored as a string end-to-end (preserves "1." while typing "1.5"
// instead of coercing every keystroke). Returns null for anything that
// isn't a valid, non-negative number — including empty string.
export function parseStake(stakeStr) {
  if (stakeStr === "" || stakeStr == null) return null;
  const n = Number(stakeStr);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

// Only "active"/"odds_changed" selections count toward the numeric preview —
// a suspended/invalid/removed selection stays visible in the list (never
// silently dropped) but never skews combinedOdds/potentialReturn.
export function activeSelections(selections) {
  return selections.filter((s) => s.status === "active" || s.status === "odds_changed");
}

export function combinedOdds(selections) {
  const active = activeSelections(selections);
  if (active.length === 0) return null;
  if (active.some((s) => !Number.isFinite(s.odds) || s.odds <= 0)) return null; // malformed odds guard
  return active.reduce((acc, s) => acc * s.odds, 1);
}

// Preview only — see getBetslipValidation for whether this can actually be
// submitted (the real provider accepts one selection per transaction; see
// PROVIDER_SUBMISSION_NOT_SUPPORTED below). Rounded to 2dp to avoid
// float-artifact digits in the UI (e.g. 12.000000000000002).
export function potentialReturn(selections, stakeStr) {
  const stake = parseStake(stakeStr);
  const odds = combinedOdds(selections);
  if (stake === null || stake <= 0 || odds === null) return null;
  return Math.round(stake * odds * 100) / 100;
}

// ── Validation ───────────────────────────────────────────────────────────

export const VALIDATION_REASON = {
  EMPTY: "empty",
  INVALID_STAKE: "invalid_stake",
  SUSPENDED_SELECTION: "suspended_selection",
  INVALID_SELECTION: "invalid_selection",
  MIXED_SOURCE: "mixed_source",
  SAME_EVENT_NOT_SUPPORTED: "same_event_not_supported",
  PROVIDER_SUBMISSION_NOT_SUPPORTED: "provider_submission_not_supported",
  COMPATIBLE: "compatible",
};

// One clear behavior, documented: a blocked (suspended/removed/started/
// finished/invalid) selection never disappears on its own — it stays in the
// list with a remove action, and blocks submission until removed. Mixed
// source is defensively checked here too even though it's prevented at
// add-time (see useSportsBetslip) — belt and suspenders, never silent.
export function getBetslipValidation(state) {
  const { selections, stake } = state;

  if (selections.length === 0) {
    return { canSubmit: false, reason: VALIDATION_REASON.EMPTY, message: "Add a selection to get started.", submittableSelection: null };
  }

  const sources = new Set(selections.map((s) => s.source));
  if (sources.size > 1) {
    return {
      canSubmit: false,
      reason: VALIDATION_REASON.MIXED_SOURCE,
      message: "Demo selections can't be placed with live selections.",
      submittableSelection: null,
    };
  }

  const blocked = selections.filter((s) => BLOCKED_STATUSES.has(s.status));
  if (blocked.length > 0) {
    return {
      canSubmit: false,
      reason: VALIDATION_REASON.SUSPENDED_SELECTION,
      message: "Remove unavailable selections before continuing.",
      submittableSelection: null,
    };
  }

  // PROVIDER SUBMISSION LIMITATIONS: the real Azuro transaction layer
  // (useAzuroBet().placeBet in web3/useAzuro.js) accepts exactly one
  // { conditionId, outcomeId } pair per call — createBet's `bet` argument
  // is a single object, never an array. There is no parlay/accumulator/
  // batch path anywhere in that layer today. So even a fully valid,
  // single-source betslip can only submit ONE selection at a time — the
  // multi-selection UI state exists to power the future combined-bet
  // presentation, not to fake one now.
  if (selections.length > 1) {
    return {
      canSubmit: false,
      reason: VALIDATION_REASON.PROVIDER_SUBMISSION_NOT_SUPPORTED,
      message: "Multiple selections aren't submittable together yet — remove all but one to place a bet.",
      submittableSelection: null,
    };
  }

  const stakeValue = parseStake(stake);
  if (stakeValue === null || stakeValue <= 0) {
    return { canSubmit: false, reason: VALIDATION_REASON.INVALID_STAKE, message: "Enter a stake to continue.", submittableSelection: null };
  }

  return { canSubmit: true, reason: VALIDATION_REASON.COMPATIBLE, message: null, submittableSelection: selections[0] };
}

// Analytics must never throw or block selection behavior.
function safeTrack(event, props) {
  try { track(event, props); } catch { /* ignore */ }
}

const STAKE_TRACK_DEBOUNCE_MS = 500;

// The public API presentation components consume. One source of truth —
// call this once (in App.jsx, alongside favs/activity/recentIds, which are
// lifted for the same "must survive arena switches" reason) and thread the
// returned object down; never create a second local copy of this state.
export function useSportsBetslip() {
  const [state, dispatch] = useReducer(sportsBetslipReducer, initialState);

  const addSelection = useCallback((event, market, outcome) => {
    const sel = buildSelection(event, market, outcome);
    const existingSource = state.selections[0]?.source;
    if (existingSource && existingSource !== sel.source) {
      toast.error(
        sel.source === "mock" ? "Demo selections can't be placed with live selections." : "Live selections can't be placed with demo selections."
      );
      safeTrack("sports_betslip_validation_failed", { reason: VALIDATION_REASON.MIXED_SOURCE, sport: sel.sportId });
      return;
    }
    dispatch({ type: "ADD_SELECTION", selection: sel });
    safeTrack("sports_selection_added", { eventId: sel.eventId, marketId: sel.marketId, outcomeId: sel.outcomeId, source: sel.source, sport: sel.sportId, selectionCount: state.selections.length + 1 });
  }, [state.selections]);

  const removeSelection = useCallback((id) => {
    dispatch({ type: "REMOVE_SELECTION", id });
    safeTrack("sports_selection_removed", { selectionId: id });
  }, []);

  // The one entry point OddsButton clicks actually use — decides add vs
  // remove vs same-market-replace, all inside the reducer (so rapid taps
  // always resolve against the latest state, never a stale closure; see
  // CORE SELECTION RULES §7 "latest intent wins").
  const toggleSelection = useCallback((event, market, outcome) => {
    const sel = buildSelection(event, market, outcome);
    const wasSelected = state.selections.some((s) => s.id === sel.id);

    if (!wasSelected) {
      const existingSource = state.selections[0]?.source;
      if (existingSource && existingSource !== sel.source) {
        toast.error(
          sel.source === "mock" ? "Demo selections can't be placed with live selections." : "Live selections can't be placed with demo selections."
        );
        safeTrack("sports_betslip_validation_failed", { reason: VALIDATION_REASON.MIXED_SOURCE, sport: sel.sportId });
        return;
      }
    }

    dispatch({ type: "TOGGLE_SELECTION", selection: sel });

    if (wasSelected) {
      safeTrack("sports_selection_removed", { selectionId: sel.id, eventId: sel.eventId, marketId: sel.marketId, outcomeId: sel.outcomeId });
    } else {
      const sameMarketExists = state.selections.some((s) => s.eventId === sel.eventId && s.marketId === sel.marketId);
      safeTrack(sameMarketExists ? "sports_selection_replaced" : "sports_selection_added", {
        eventId: sel.eventId, marketId: sel.marketId, outcomeId: sel.outcomeId, source: sel.source, sport: sel.sportId,
      });
    }
  }, [state.selections]);

  const clearSelections = useCallback(() => {
    dispatch({ type: "CLEAR_BETSLIP" });
    safeTrack("sports_betslip_cleared", { selectionCount: state.selections.length });
  }, [state.selections.length]);

  const updateSelectionOdds = useCallback((id, odds) => {
    dispatch({ type: "UPDATE_SELECTION_ODDS", id, odds });
  }, []);

  const setSelectionStatus = useCallback((id, status) => {
    dispatch({ type: "SET_SELECTION_STATUS", id, status });
  }, []);

  // Debounced (matches the existing casino_search_zero_results precedent in
  // PromoStrip.jsx) — a stake input firing one event per keystroke is noise,
  // not signal.
  const stakeTrackTimer = useRef(null);
  const setStake = useCallback((value) => {
    dispatch({ type: "SET_STAKE", value });
    clearTimeout(stakeTrackTimer.current);
    stakeTrackTimer.current = setTimeout(() => safeTrack("sports_stake_changed", { stake: value }), STAKE_TRACK_DEBOUNCE_MS);
  }, []);
  useEffect(() => () => clearTimeout(stakeTrackTimer.current), []);

  const isSelected = useCallback(
    (eventId, marketId, outcomeId) => state.selections.some((s) => s.id === selectionId(eventId, marketId, outcomeId)),
    [state.selections]
  );

  const validation = useMemo(() => getBetslipValidation(state), [state]);
  const odds = useMemo(() => combinedOdds(state.selections), [state.selections]);
  const returnPreview = useMemo(() => potentialReturn(state.selections, state.stake), [state.selections, state.stake]);

  return {
    selections: state.selections,
    stake: state.stake,
    addSelection,
    removeSelection,
    toggleSelection,
    clearSelections,
    setStake,
    updateSelectionOdds,
    setSelectionStatus,
    isSelected,
    selectionCount: state.selections.length,
    combinedOdds: odds,
    potentialReturn: returnPreview,
    validation,
  };
}
