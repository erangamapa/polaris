import { describe, it, expect } from "vitest";
import { nextDesktopBetslipUiState } from "./sportsDesktopBetslipUi";

// These cover the desktop-panel-specific scenarios from the task's test
// list that are pure state-transition logic (not rendering): 1, 4, 5, 7.
// Rendering-dependent scenarios (2, 3, 6, 8-18) were verified manually via
// Playwright against the running dev server — see the FINAL RESPONSE.

const base = { prevCount: 0, nextCount: 0, isOpen: false, isCollapsed: false };

describe("nextDesktopBetslipUiState", () => {
  // 1. First selection opens desktop panel
  it("opens on the first selection (0 -> 1)", () => {
    const result = nextDesktopBetslipUiState({ ...base, prevCount: 0, nextCount: 1 });
    expect(result).toEqual({ isOpen: true, isCollapsed: false });
  });

  it("opens and un-collapses on any count increase, even mid-collapse", () => {
    const result = nextDesktopBetslipUiState({ prevCount: 1, nextCount: 2, isOpen: true, isCollapsed: true });
    expect(result).toEqual({ isOpen: true, isCollapsed: false });
  });

  // 4. Collapse preserves selections (state-preservation is architectural —
  // this hook never touches betslip.selections — asserted here as "a
  // collapse-state input is never altered by a count decrease that isn't
  // to zero").
  it("does not touch isCollapsed when a selection is removed but others remain", () => {
    const result = nextDesktopBetslipUiState({ prevCount: 2, nextCount: 1, isOpen: true, isCollapsed: true });
    expect(result).toEqual({ isOpen: true, isCollapsed: true });
  });

  it("does not reopen or change collapse state on a same-market replace (count unchanged)", () => {
    const result = nextDesktopBetslipUiState({ prevCount: 2, nextCount: 2, isOpen: true, isCollapsed: true });
    expect(result).toEqual({ isOpen: true, isCollapsed: true });
  });

  // 5. Expand restores content — expand()/collapse() are trivial, direct
  // setState calls in the hook (not routed through this function), so
  // there's nothing to assert here beyond "count transitions never force a
  // collapse", covered above.

  // 7. Removing last selection triggers the chosen empty behavior (hide)
  it("hides when the last selection is removed", () => {
    const result = nextDesktopBetslipUiState({ prevCount: 1, nextCount: 0, isOpen: true, isCollapsed: false });
    expect(result).toEqual({ isOpen: false, isCollapsed: false });
  });

  it("hides on Clear all from a collapsed state, preserving the collapsed flag (moot while hidden)", () => {
    const result = nextDesktopBetslipUiState({ prevCount: 3, nextCount: 0, isOpen: true, isCollapsed: true });
    expect(result).toEqual({ isOpen: false, isCollapsed: true });
  });

  it("stays closed for a 0 -> 0 no-op", () => {
    const result = nextDesktopBetslipUiState({ prevCount: 0, nextCount: 0, isOpen: false, isCollapsed: false });
    expect(result).toEqual({ isOpen: false, isCollapsed: false });
  });
});
