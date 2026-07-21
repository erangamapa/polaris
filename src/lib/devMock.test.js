import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_DEV_MOCK_STATE, getDevMockState, setDevMockState, resetDevMockState,
  subscribeDevMockState, toggleDevPanel, closeDevPanel,
} from "./devMock";

// This project's vitest setup runs in a plain Node environment (no jsdom —
// see the project's existing testing-stack convention of pure-function
// tests only), so `window`/`sessionStorage` aren't available here. That
// exercises exactly the code path devMock.js's own `typeof window ===
// "undefined"` guards are for: every test below confirms the in-memory
// store (the actual state-management logic) works correctly on its own.
// The sessionStorage round-trip itself, and its malformed-JSON/version-
// mismatch fallback, were verified by code review (safeLoad's try/catch —
// see devMock.js) plus manually via Playwright in a real browser (closing
// and reopening the panel preserved selections made a step earlier in the
// same session — see the FINAL RESPONSE).

beforeEach(() => {
  // resetDevMockState() deliberately preserves panelOpen (see RESET
  // BEHAVIOR — resetting mock selections shouldn't also slam the panel
  // shut), so it alone isn't enough to isolate tests that flip panelOpen
  // from one another — force it closed explicitly between tests too.
  resetDevMockState();
  setDevMockState({ panelOpen: false });
});

describe("devMock store", () => {
  it("starts from DEFAULT_DEV_MOCK_STATE (panelOpen excluded from persistence but present in defaults)", () => {
    expect(getDevMockState()).toEqual(DEFAULT_DEV_MOCK_STATE);
  });

  it("setDevMockState merges a patch over the current state", () => {
    setDevMockState({ walletStatus: "connected" });
    expect(getDevMockState().walletStatus).toBe("connected");
    // Untouched fields are preserved, not reset.
    expect(getDevMockState().authStatus).toBe(DEFAULT_DEV_MOCK_STATE.authStatus);
  });

  it("setDevMockState notifies subscribers", () => {
    let notified = 0;
    const unsubscribe = subscribeDevMockState(() => { notified += 1; });
    setDevMockState({ balancePreset: "large" });
    unsubscribe();
    expect(notified).toBe(1);
  });

  it("unsubscribe stops further notifications", () => {
    let notified = 0;
    const unsubscribe = subscribeDevMockState(() => { notified += 1; });
    unsubscribe();
    setDevMockState({ platformScope: "full" });
    expect(notified).toBe(0);
  });

  it("resetDevMockState returns every field to its default except panelOpen", () => {
    setDevMockState({ authStatus: "logged-in", walletStatus: "connected", balancePreset: "error", panelOpen: true });
    resetDevMockState();
    const state = getDevMockState();
    expect(state.authStatus).toBe("default");
    expect(state.walletStatus).toBe("default");
    expect(state.balancePreset).toBe("default");
    // Reset clears mock selections, not the panel's own open/closed UI
    // state (see RESET BEHAVIOR: "close transient dev-triggered overlays
    // if practical" — the panel itself isn't one of those).
    expect(state.panelOpen).toBe(true);
  });

  it("toggleDevPanel flips panelOpen", () => {
    expect(getDevMockState().panelOpen).toBe(false);
    toggleDevPanel();
    expect(getDevMockState().panelOpen).toBe(true);
    toggleDevPanel();
    expect(getDevMockState().panelOpen).toBe(false);
  });

  it("closeDevPanel only ever sets panelOpen to false", () => {
    toggleDevPanel(); // now open
    closeDevPanel();
    expect(getDevMockState().panelOpen).toBe(false);
    closeDevPanel(); // already closed — idempotent, no error
    expect(getDevMockState().panelOpen).toBe(false);
  });
});
