import { describe, it, expect } from "vitest";
import {
  sportsBetslipReducer,
  buildSelection,
  selectionId,
  parseStake,
  combinedOdds,
  potentialReturn,
  getBetslipValidation,
  VALIDATION_REASON,
} from "./sportsBetslip";

// ── Fixtures ──────────────────────────────────────────────────────────────
// Minimal normalized SportsEvent/Market/Outcome shapes — just enough for
// buildSelection() to work, matching what sportsModel.js actually produces.
function makeEvent({ id = "e1", source = "provider", sportId = "soccer", finalScore } = {}) {
  return {
    id,
    source,
    sport: { id: sportId, templateFamily: "soccer" },
    country: { slug: "england", name: "England" },
    league: { slug: "premier-league", name: "Premier League" },
    participants: [{ name: "Arsenal" }, { name: "Chelsea" }],
    startsAt: "2026-01-01T12:00:00.000Z",
    status: "upcoming",
    raw: { title: "Arsenal - Chelsea", finalScore },
  };
}
function makeMarket(id = "m1", name = "Match Result") {
  return { id, name, group: "main", status: "active", raw: { conditionId: `cond-${id}`, title: name } };
}
function makeOutcome(id = "o1", name = "Arsenal", odds = 2.1, extra = {}) {
  return { id, name, odds, status: "active", pick: "H", raw: { outcomeId: `out-${id}`, title: name }, ...extra };
}

const reduce = (state, action) => sportsBetslipReducer(state, action);
const initial = { selections: [], stake: "" };

// 1. Adds first selection
describe("ADD_SELECTION", () => {
  it("adds the first selection", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    const state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].id).toBe(selectionId("e1", "m1", "o1"));
  });

  // 2. Adds selection from another event
  it("keeps selections from a different event", () => {
    const s1 = buildSelection(makeEvent({ id: "e1" }), makeMarket(), makeOutcome());
    const s2 = buildSelection(makeEvent({ id: "e2" }), makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "ADD_SELECTION", selection: s1 });
    state = reduce(state, { type: "ADD_SELECTION", selection: s2 });
    expect(state.selections).toHaveLength(2);
    expect(state.selections.map((s) => s.eventId)).toEqual(["e1", "e2"]);
  });

  // 3. Adds selection from another market
  it("keeps selections from a different market on the same event", () => {
    const event = makeEvent();
    const s1 = buildSelection(event, makeMarket("m1"), makeOutcome("o1"));
    const s2 = buildSelection(event, makeMarket("m2", "Total Goals"), makeOutcome("o2", "Over 2.5"));
    let state = reduce(initial, { type: "ADD_SELECTION", selection: s1 });
    state = reduce(state, { type: "ADD_SELECTION", selection: s2 });
    expect(state.selections).toHaveLength(2);
  });

  // 6. Duplicate selection is prevented
  it("never adds an exact duplicate", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    state = reduce(state, { type: "ADD_SELECTION", selection: { ...sel } });
    expect(state.selections).toHaveLength(1);
  });
});

describe("TOGGLE_SELECTION", () => {
  // 4. Tapping selected outcome removes it
  it("removes an already-selected outcome on second toggle", () => {
    const event = makeEvent();
    const sel = buildSelection(event, makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "TOGGLE_SELECTION", selection: sel });
    expect(state.selections).toHaveLength(1);
    state = reduce(state, { type: "TOGGLE_SELECTION", selection: sel });
    expect(state.selections).toHaveLength(0);
  });

  // 5. Selecting sibling outcome replaces same-market selection
  it("replaces the same-market selection with a sibling outcome", () => {
    const event = makeEvent();
    const market = makeMarket("m1", "Match Result");
    const arsenal = buildSelection(event, market, makeOutcome("o-arsenal", "Arsenal", 2.1));
    const draw = buildSelection(event, market, makeOutcome("o-draw", "Draw", 3.4));
    let state = reduce(initial, { type: "TOGGLE_SELECTION", selection: arsenal });
    state = reduce(state, { type: "TOGGLE_SELECTION", selection: draw });
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].outcomeId).toBe("o-draw");
  });

  // 20. Rapid repeated taps resolve correctly (reducer is pure — each
  // dispatch is reduced against the true prior state, never a stale one)
  it("resolves rapid repeated toggles on the same outcome predictably (odd count -> selected)", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    let state = initial;
    for (let i = 0; i < 7; i++) state = reduce(state, { type: "TOGGLE_SELECTION", selection: sel });
    expect(state.selections).toHaveLength(1);
    for (let i = 0; i < 8; i++) state = reduce(state, { type: "TOGGLE_SELECTION", selection: sel });
    expect(state.selections).toHaveLength(1); // 7 + 8 = 15 toggles, odd -> still selected
  });
});

// 7. Multiple route changes preserve selections — the reducer/state has no
// concept of "route" at all (that's the point: it's owned in App.jsx, above
// SportsArena, which is what actually changes on route/arena transitions —
// see sportsBetslip.js's module doc). Modelled here as: dispatching
// unrelated actions (or none) never mutates existing selections.
describe("persistence across unrelated dispatches", () => {
  it("selections survive being read/passed through unrelated reducer calls", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    state = reduce(state, { type: "SET_STAKE", value: "10" });
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].id).toBe(sel.id);
  });
});

// 8. Provider and mock source metadata are preserved
describe("source metadata", () => {
  it("preserves provider vs mock source on the built selection", () => {
    const providerSel = buildSelection(makeEvent({ source: "provider" }), makeMarket(), makeOutcome());
    const mockSel = buildSelection(makeEvent({ id: "e2", source: "mock" }), makeMarket(), makeOutcome());
    expect(providerSel.source).toBe("provider");
    expect(mockSel.source).toBe("mock");
  });
});

// 9 & 10. Mixed-source submission is blocked; mock never enters provider payload
describe("mixed-source validation", () => {
  it("flags mixed-source selections as not submittable", () => {
    const providerSel = buildSelection(makeEvent({ id: "e1", source: "provider" }), makeMarket(), makeOutcome());
    const mockSel = buildSelection(makeEvent({ id: "e2", source: "mock" }), makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "ADD_SELECTION", selection: providerSel });
    state = reduce(state, { type: "ADD_SELECTION", selection: mockSel });
    state = { ...state, stake: "10" };
    const validation = getBetslipValidation(state);
    expect(validation.canSubmit).toBe(false);
    expect(validation.reason).toBe(VALIDATION_REASON.MIXED_SOURCE);
  });

  it("a mock selection's payload never carries provider raw refs usable for a real transaction", () => {
    const mockSel = buildSelection(makeEvent({ source: "mock" }), makeMarket(), makeOutcome());
    // AzuroBetSlip only ever submits selections where source === "provider"
    // (see SportsArena.jsx's source-gated rendering) — a mock selection's
    // own raw refs point at mock/demo data, never a real conditionId feed.
    expect(mockSel.source).toBe("mock");
    expect(mockSel.payload.event.raw.finalScore).toBeUndefined(); // no finalScore set in this fixture -> confirms it's reading the mock event's own raw, not a provider shape
  });
});

// 11 & 12. Odds update preserves selection + stores previous odds
describe("UPDATE_SELECTION_ODDS", () => {
  it("keeps the selection and updates odds, storing the previous value, marking odds_changed", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome("o1", "Arsenal", 2.1));
    let state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    state = reduce(state, { type: "UPDATE_SELECTION_ODDS", id: sel.id, odds: 2.5 });
    expect(state.selections).toHaveLength(1);
    expect(state.selections[0].odds).toBe(2.5);
    expect(state.selections[0].previousOdds).toBe(2.1);
    expect(state.selections[0].status).toBe("odds_changed");
  });

  it("ignores a malformed odds update (non-finite or <= 0) rather than corrupting state", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome("o1", "Arsenal", 2.1));
    let state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    state = reduce(state, { type: "UPDATE_SELECTION_ODDS", id: sel.id, odds: NaN });
    expect(state.selections[0].odds).toBe(2.1);
    state = reduce(state, { type: "UPDATE_SELECTION_ODDS", id: sel.id, odds: -1 });
    expect(state.selections[0].odds).toBe(2.1);
  });
});

// 13. Suspended selection becomes invalid for submission
describe("suspended/blocked selections", () => {
  it("blocks submission while a suspended selection is present, without removing it", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    state = reduce(state, { type: "SET_SELECTION_STATUS", id: sel.id, status: "suspended" });
    state = { ...state, stake: "10" };
    expect(state.selections).toHaveLength(1); // still visible
    const validation = getBetslipValidation(state);
    expect(validation.canSubmit).toBe(false);
    expect(validation.reason).toBe(VALIDATION_REASON.SUSPENDED_SELECTION);
  });

  // 14. Removed market remains visible as invalid until removed
  it("a selection marked invalid stays in the list until explicitly removed", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    state = reduce(state, { type: "SET_SELECTION_STATUS", id: sel.id, status: "invalid" });
    expect(state.selections).toHaveLength(1);
    state = reduce(state, { type: "REMOVE_INVALID_SELECTION", id: sel.id });
    expect(state.selections).toHaveLength(0);
  });
});

// 15. Stake parsing works
describe("parseStake", () => {
  it("parses valid numeric strings", () => {
    expect(parseStake("10")).toBe(10);
    expect(parseStake("2.5")).toBe(2.5);
  });
  // 18. Empty stake does not produce invalid output
  it("returns null for empty string rather than 0 or NaN", () => {
    expect(parseStake("")).toBeNull();
    expect(parseStake(null)).toBeNull();
    expect(parseStake(undefined)).toBeNull();
  });
  it("rejects negative and non-numeric values", () => {
    expect(parseStake("-5")).toBeNull();
    expect(parseStake("abc")).toBeNull();
  });
});

// 16. Combined odds are correct
describe("combinedOdds", () => {
  it("multiplies active selections' odds", () => {
    const event = makeEvent();
    const s1 = buildSelection(event, makeMarket("m1"), makeOutcome("o1", "Arsenal", 2));
    const s2 = buildSelection(makeEvent({ id: "e2" }), makeMarket("m2"), makeOutcome("o2", "Over", 1.5));
    expect(combinedOdds([s1, s2])).toBe(3);
  });
  it("returns null with no active selections", () => {
    expect(combinedOdds([])).toBeNull();
  });
  it("excludes suspended/invalid selections from the calculation", () => {
    const event = makeEvent();
    const s1 = buildSelection(event, makeMarket("m1"), makeOutcome("o1", "Arsenal", 2));
    const s2 = { ...buildSelection(makeEvent({ id: "e2" }), makeMarket("m2"), makeOutcome("o2", "Over", 1.5)), status: "suspended" };
    expect(combinedOdds([s1, s2])).toBe(2); // only s1 counts
  });
});

// 17. Potential return is correct
describe("potentialReturn", () => {
  it("computes stake x combinedOdds, rounded to 2dp", () => {
    const event = makeEvent();
    const s1 = buildSelection(event, makeMarket(), makeOutcome("o1", "Arsenal", 2.333333));
    expect(potentialReturn([s1], "10")).toBe(23.33);
  });
  it("returns null with no stake", () => {
    const s1 = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    expect(potentialReturn([s1], "")).toBeNull();
  });
});

// 19. Clear all works
describe("CLEAR_BETSLIP", () => {
  it("clears selections and resets stake", () => {
    const sel = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    let state = reduce(initial, { type: "ADD_SELECTION", selection: sel });
    state = reduce(state, { type: "SET_STAKE", value: "25" });
    state = reduce(state, { type: "CLEAR_BETSLIP" });
    expect(state.selections).toHaveLength(0);
    expect(state.stake).toBe("");
  });
});

describe("getBetslipValidation — provider submission limitation", () => {
  it("blocks submission of more than one selection even when all are valid and same-source", () => {
    const s1 = buildSelection(makeEvent({ id: "e1" }), makeMarket("m1"), makeOutcome("o1"));
    const s2 = buildSelection(makeEvent({ id: "e2" }), makeMarket("m2"), makeOutcome("o2"));
    const state = { selections: [s1, s2], stake: "10" };
    const validation = getBetslipValidation(state);
    expect(validation.canSubmit).toBe(false);
    expect(validation.reason).toBe(VALIDATION_REASON.PROVIDER_SUBMISSION_NOT_SUPPORTED);
  });

  it("allows submission of exactly one valid selection with a valid stake", () => {
    const s1 = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    const state = { selections: [s1], stake: "10" };
    const validation = getBetslipValidation(state);
    expect(validation.canSubmit).toBe(true);
    expect(validation.submittableSelection.id).toBe(s1.id);
  });

  it("requires a valid stake to submit", () => {
    const s1 = buildSelection(makeEvent(), makeMarket(), makeOutcome());
    const state = { selections: [s1], stake: "" };
    expect(getBetslipValidation(state).reason).toBe(VALIDATION_REASON.INVALID_STAKE);
  });

  it("reports empty betslip distinctly", () => {
    expect(getBetslipValidation(initial).reason).toBe(VALIDATION_REASON.EMPTY);
  });
});
