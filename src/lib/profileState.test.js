import { describe, it, expect } from "vitest";
import { PROFILE_VARIANT, getProfileVariant, getSignOutAction, getAccountAuthMethod } from "./profileState";

// PLAYER PROFILE / ACCOUNT MENU — this task's own TESTS list (20 scenarios)
// is almost entirely rendering/popover/focus behavior, which needs a DOM
// (see the project's established testing stack — no jsdom/React Testing
// Library, same constraint noted in every prior UI task this session). The
// two genuine pieces of decision logic this task introduces
// (getProfileVariant, getSignOutAction) are unit-tested here; everything
// else was verified manually via Playwright against the running dev
// server, driven through the Developer Panel's User/Wallet presets (see
// the FINAL RESPONSE for exactly what was checked):
//
//  1.  Logged-in profile trigger renders            -> Playwright (Developer Panel -> User -> Logged in / Wallet -> Connected)
//  2.  Logged-out profile trigger renders             -> Playwright (screenshot, no overrides, disconnected)
//  3.  Session-expired state renders                    -> Playwright (Developer Panel -> User -> Expired)
//  4.  Profile menu opens                                 -> Playwright (DropdownMenu content visible)
//  5.  Escape closes                                        -> Playwright
//  6.  Click outside closes                                   -> Playwright
//  7.  Focus restores to trigger                                -> Playwright
//  8.  Wallet and auth remain independent                         -> unit test (getProfileVariant) + Playwright (logged-in + disconnected shows Wallet CTA in menu, not a fake balance)
//  9.  Logged in + disconnected works                               -> Playwright (Developer Panel -> User -> Logged in, Wallet -> Disconnected)
//  10. Session expired + connected works                              -> Playwright (Developer Panel -> User -> Expired, Wallet -> Connected)
//  11. Profile opening closes Balance popover                           -> Playwright (existing activePopover ownership, unchanged)
//  12. Wallet modal opening closes Profile                                -> Playwright (Manage wallet -> Funds dialog, menu closes)
//  13. Activity opening closes Profile                                      -> Playwright (existing activePopover ownership, unchanged)
//  14. Sign out updates auth state                                            -> unit test (getSignOutAction) + Playwright
//  15. Sign out preserves wallet state                                          -> unit test (getSignOutAction returns "reset-auth-mock", not "disconnect-wallet", whenever a mock override is active) + Playwright
//  16. Long identifier does not overflow                                          -> Playwright (screenshot, truncate)
//  17. Compact desktop mode works                                                   -> Playwright (1024px screenshot)
//  18. Mobile profile surface works                                                   -> Playwright (mobile menu utility section)
//  19. Desktop menu does not render on mobile                                          -> Playwright (visible count 0 at 390px)
//  20. No dead menu items render                                                         -> code review (Settings/Security/VIP omitted — no real destination exists for any of them)

describe("getProfileVariant", () => {
  it("is session-expired whenever authStatus says so, regardless of wallet connection", () => {
    expect(getProfileVariant({ authStatus: "session-expired", isConnected: true })).toBe(PROFILE_VARIANT.SESSION_EXPIRED);
    expect(getProfileVariant({ authStatus: "session-expired", isConnected: false })).toBe(PROFILE_VARIANT.SESSION_EXPIRED);
  });

  it("is logged-out whenever authStatus says so, regardless of wallet connection", () => {
    expect(getProfileVariant({ authStatus: "logged-out", isConnected: true })).toBe(PROFILE_VARIANT.LOGGED_OUT);
    expect(getProfileVariant({ authStatus: "logged-out", isConnected: false })).toBe(PROFILE_VARIANT.LOGGED_OUT);
  });

  it("is logged-in whenever authStatus says so, even while the wallet is disconnected (auth/wallet independence)", () => {
    expect(getProfileVariant({ authStatus: "logged-in", isConnected: false })).toBe(PROFILE_VARIANT.LOGGED_IN);
    expect(getProfileVariant({ authStatus: "logged-in", isConnected: true })).toBe(PROFILE_VARIANT.LOGGED_IN);
  });

  it("falls back to deriving from wallet connection only when no auth override is active", () => {
    expect(getProfileVariant({ authStatus: "default", isConnected: true })).toBe(PROFILE_VARIANT.LOGGED_IN);
    expect(getProfileVariant({ authStatus: "default", isConnected: false })).toBe(PROFILE_VARIANT.LOGGED_OUT);
  });
});

describe("getSignOutAction", () => {
  it("disconnects the real wallet when no auth-layer mock is active (the only real sign-out mechanism that exists)", () => {
    expect(getSignOutAction("default")).toBe("disconnect-wallet");
  });

  it("only resets the auth mock — never the wallet — whenever a mock override is active", () => {
    expect(getSignOutAction("logged-in")).toBe("reset-auth-mock");
    expect(getSignOutAction("session-expired")).toBe("reset-auth-mock");
    expect(getSignOutAction("logged-out")).toBe("reset-auth-mock");
  });
});

// ACCOUNT, SECURITY AND SESSION SETTINGS task's own addition — the one new
// piece of decision logic it introduces (the Account destination's
// sign-in-method field). "wallet" is the only real value this app can ever
// honestly claim (see SIGN-IN METHOD: "do not show wallet as the sign-in
// method unless it actually authenticated the user").
describe("getAccountAuthMethod", () => {
  it("is wallet whenever a real wallet is connected", () => {
    expect(getAccountAuthMethod({ authStatus: "default", isConnected: true })).toBe("wallet");
    expect(getAccountAuthMethod({ authStatus: "logged-in", isConnected: true })).toBe("wallet");
  });

  it("is undefined when logged out (nothing to report)", () => {
    expect(getAccountAuthMethod({ authStatus: "default", isConnected: false })).toBeUndefined();
  });

  it("is unknown for the one combination with no real backing at all — dev-mocked logged-in with no real wallet connection", () => {
    expect(getAccountAuthMethod({ authStatus: "logged-in", isConnected: false })).toBe("unknown");
  });
});
