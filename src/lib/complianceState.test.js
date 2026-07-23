import { describe, it, expect } from "vitest";
import { COMPLIANCE_STATUS, canPerformAction, getComplianceState } from "./complianceState";

// RESPONSIBLE GAMING AND COMPLIANCE ACCESS — this task's own TESTS list (32
// scenarios) is mostly rendering/access-point/routing behavior, which needs
// a DOM (see the project's established testing stack — no jsdom/React
// Testing Library, same constraint as every prior UI task this session).
// The two genuine pieces of decision logic this task introduces
// (canPerformAction, getComplianceState) are unit-tested here; everything
// else was verified manually via Playwright against the running dev
// server, driven through the Developer Panel's new Compliance preset (see
// the FINAL RESPONSE for exactly what was checked):
//
//  1.  Responsible Gaming uses one shared destination         -> code review (single ResponsibleGamblingDialog, one App.jsx state)
//  2.  Profile menu opens shared destination                    -> Playwright (pre-existing, re-verified)
//  3.  Account opens shared destination                           -> Playwright (pre-existing, re-verified)
//  4.  Mobile menu opens shared destination                         -> Playwright (pre-existing, re-verified)
//  5.  Footer opens shared destination                                -> Playwright
//  6.  Logged-out users can access overview                            -> Playwright
//  7.  Session-expired users can access overview                         -> Playwright
//  8.  Support remains accessible                                         -> unit test (canPerformAction) + Playwright
//  9.  Unsupported limits do not render editable controls                   -> code review (no <input>/<select> in the hub)
//  10. Real limits render only when supported                                 -> code review (none exist; informational only)
//  11. Cool-off action renders only when supported                              -> code review (no action button; informational only)
//  12. Self-exclusion renders only when supported                                  -> code review (no action button; informational only)
//  13. KYC required state blocks relevant action                                     -> unit test (canPerformAction)
//  14. KYC pending state renders correctly                                              -> Playwright
//  15. KYC failed state uses safe copy                                                    -> unit test (getComplianceState copy) + Playwright
//  16. Restricted state blocks only specified actions                                        -> unit test (canPerformAction)
//  17. Region block renders only from real signal                                              -> code review (GeoBlock/useGeoCheck; region-blocked compliance status is Dev-Panel-only)
//  18. Age restriction renders only when supported                                                -> code review (Dev-Panel-only preview, no real signal)
//  19. Compliance loading avoids unrestricted flash                                                  -> unit test (canPerformAction blocks during "loading")
//  20. Compliance error fails safely                                                                   -> unit test (canPerformAction blocks during "error")
//  21. Self-excluded state preserves activity access                                                     -> unit test (canPerformAction)
//  22. Cool-off state preserves support access                                                             -> unit test (canPerformAction)
//  23. Game launch uses shared compliance gate                                                                -> Playwright (App.jsx attemptLaunch)
//  24. Bet submission uses shared compliance gate                                                                -> N/A — Casino has no separate bet-submission step; launching a playable onchain game IS the bet (see complianceState.js's SENSITIVE_ACTIONS comment)
//  25. Blocked launch does not update Recently Played                                                             -> Playwright
//  26. Blocked bet does not create activity round                                                                   -> Playwright (same launch path as #25)
//  27. Browser Back restores previous context                                                                        -> Playwright
//  28. Focus returns after close                                                                                       -> Playwright
//  29. Mobile fits at 320px                                                                                              -> Playwright
//  30. Sports and Predictions remain untouched                                                                             -> code review (no files touched)
//  31. No duplicate compliance store is introduced                                                                          -> code review (single complianceState.js, single devMock.complianceStatus field)
//  32. No fake regulatory or KYC functionality is added                                                                       -> code review (no document upload, no invented regulator/hotline names)

describe("canPerformAction", () => {
  it("allows sensitive actions when compliance status is clear", () => {
    expect(canPerformAction({ action: "launch-real-game", complianceStatus: "clear" })).toBe(true);
    expect(canPerformAction({ action: "launch-real-game", complianceStatus: undefined })).toBe(true);
  });

  it("blocks launch-real-game for every blocking compliance status", () => {
    for (const status of [
      COMPLIANCE_STATUS.KYC_REQUIRED, COMPLIANCE_STATUS.KYC_PENDING, COMPLIANCE_STATUS.KYC_FAILED,
      COMPLIANCE_STATUS.RESTRICTED, COMPLIANCE_STATUS.REGION_BLOCKED, COMPLIANCE_STATUS.AGE_RESTRICTED,
      COMPLIANCE_STATUS.SELF_EXCLUDED, COMPLIANCE_STATUS.COOL_OFF, COMPLIANCE_STATUS.LOADING, COMPLIANCE_STATUS.ERROR,
    ]) {
      expect(canPerformAction({ action: "launch-real-game", complianceStatus: status })).toBe(false);
    }
  });

  it("never blocks browsing, history, support, Responsible Gaming or account access, regardless of status", () => {
    for (const status of [COMPLIANCE_STATUS.SELF_EXCLUDED, COMPLIANCE_STATUS.COOL_OFF, COMPLIANCE_STATUS.RESTRICTED, COMPLIANCE_STATUS.ERROR]) {
      expect(canPerformAction({ action: "browse-casino", complianceStatus: status })).toBe(true);
      expect(canPerformAction({ action: "view-history", complianceStatus: status })).toBe(true);
      expect(canPerformAction({ action: "open-support", complianceStatus: status })).toBe(true);
      expect(canPerformAction({ action: "open-responsible-gaming", complianceStatus: status })).toBe(true);
      expect(canPerformAction({ action: "view-account", complianceStatus: status })).toBe(true);
    }
  });
});

describe("getComplianceState", () => {
  it("returns a clear, non-blocking state with no title/message by default", () => {
    const state = getComplianceState({ complianceStatus: "clear" });
    expect(state.status).toBe("clear");
    expect(state.blockingActions).toEqual([]);
    expect(state.title).toBeUndefined();
  });

  it("reports the blocked sensitive actions for a restricted status", () => {
    const state = getComplianceState({ complianceStatus: COMPLIANCE_STATUS.RESTRICTED });
    expect(state.blockingActions).toContain("launch-real-game");
    expect(state.title).toBe("Account access limited");
  });

  it("uses safe, non-alarming copy for kyc-failed with no invented review timeline or reason", () => {
    const state = getComplianceState({ complianceStatus: COMPLIANCE_STATUS.KYC_FAILED });
    expect(state.title).toBe("We couldn't complete verification.");
    expect(state.message.toLowerCase()).not.toMatch(/day|hour|review board|regulator/);
  });

  it("only allows retry for the error status", () => {
    expect(getComplianceState({ complianceStatus: COMPLIANCE_STATUS.ERROR }).canRetry).toBe(true);
    expect(getComplianceState({ complianceStatus: COMPLIANCE_STATUS.RESTRICTED }).canRetry).toBe(false);
  });

  it("always reports support as available", () => {
    for (const status of Object.values(COMPLIANCE_STATUS)) {
      expect(getComplianceState({ complianceStatus: status }).supportAvailable).toBe(true);
    }
  });
});
