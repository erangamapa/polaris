import { describe, it, expect } from "vitest";
import { TOP_BAR_MODE, getTopBarMode, HEADER_CENTER_VARIANT, getHeaderCenterVariant } from "./topBarState";

// CENTERED DESKTOP BALANCE + WALLET HUD — this task's own AUTOMATED TESTS
// list (20 scenarios) is almost entirely rendering/layout/interaction
// behavior — grid centering, popover open/close, focus restoration, modal-
// closes-dropdown ownership, responsive compression — none of which is a
// pure function to assert against without a DOM. Per the project's
// established testing stack (vitest, no jsdom/React Testing Library — same
// constraint noted in every prior UI task this session), the two genuine
// pieces of decision logic this task touches (getTopBarMode, unchanged from
// the prior header task, and the new getHeaderCenterVariant it's now
// layered under) are unit-tested here; everything else was verified
// manually via Playwright against the running dev server, driven through
// the Developer Panel's Wallet/Balance presets (see the FINAL RESPONSE for
// exactly what was checked and how):
//
//  1.  Center HUD renders on desktop                    -> Playwright (BalanceControl + Wallet visible at 1440px)
//  2.  Balance and Wallet are grouped                     -> Playwright (adjacent, shared border seam, no gap)
//  3.  HUD uses the center grid column                     -> Playwright (offsetLeft/offsetRight symmetry check)
//  4.  Sidebar expanded does not break centering             -> Playwright (screenshot, expanded rail)
//  5.  Sidebar collapsed does not break centering              -> Playwright (screenshot, collapsed rail)
//  6.  Normal balance renders                                   -> Playwright (Developer Panel -> Balance -> Normal)
//  7.  Zero balance renders                                       -> Playwright (Developer Panel -> Balance -> Zero)
//  8.  Large balance does not overflow                              -> Playwright (Developer Panel -> Balance -> Large, no hOverflow)
//  9.  Loading state remains dimensionally stable                     -> Playwright (Skeleton, same trigger width as Normal)
//  10. Balance error state renders                                      -> Playwright (Developer Panel -> Balance -> Error, "Unavailable")
//  11. Connected wallet state renders                                     -> Playwright (Developer Panel -> Wallet -> Connected)
//  12. Disconnected state renders                                           -> Playwright (Developer Panel -> Wallet -> Disconnected, "Not connected" + Connect Wallet)
//  13. Wrong-network state renders                                           -> Playwright (Developer Panel -> Wallet -> Wrong network, Switch network)
//  14. Balance selector opens                                                  -> Playwright (Popover content visible)
//  15. Wallet flow opens                                                        -> Playwright ([role=dialog]:has-text("Funds"))
//  16. Opening Wallet closes balance selector                                     -> Playwright (Balance popover closes on Wallet-adjacent modal open)
//  17. Activity/profile do not shift center HUD                                    -> Playwright (HUD bounding box unchanged before/after opening Activity)
//  18. 1024px compact state works                                                    -> Playwright (no horizontal scrollbar, HUD still grouped)
//  19. Desktop HUD is absent on mobile                                                 -> Playwright (BalanceControl visible count 0 at 390px)
//  20. Mobile header remains unchanged                                                  -> Playwright (wallet pill visible at 390px, unchanged markup)

describe("getTopBarMode", () => {
  it("is disconnected when the wallet isn't connected, regardless of network", () => {
    expect(getTopBarMode({ isConnected: false, wrongNetwork: false })).toBe(TOP_BAR_MODE.DISCONNECTED);
    expect(getTopBarMode({ isConnected: false, wrongNetwork: true })).toBe(TOP_BAR_MODE.DISCONNECTED);
  });

  it("is wrong-network when connected but on the wrong chain", () => {
    expect(getTopBarMode({ isConnected: true, wrongNetwork: true })).toBe(TOP_BAR_MODE.WRONG_NETWORK);
  });

  it("is connected when connected and on the right chain", () => {
    expect(getTopBarMode({ isConnected: true, wrongNetwork: false })).toBe(TOP_BAR_MODE.CONNECTED);
  });
});

describe("getHeaderCenterVariant", () => {
  it("is session-expired whenever sessionExpired is true, regardless of mode", () => {
    expect(getHeaderCenterVariant({ sessionExpired: true, loggedInNoWallet: false, mode: TOP_BAR_MODE.CONNECTED })).toBe(HEADER_CENTER_VARIANT.SESSION_EXPIRED);
    expect(getHeaderCenterVariant({ sessionExpired: true, loggedInNoWallet: false, mode: TOP_BAR_MODE.DISCONNECTED })).toBe(HEADER_CENTER_VARIANT.SESSION_EXPIRED);
  });

  it("session-expired takes priority over logged-in-no-wallet if both were somehow true", () => {
    expect(getHeaderCenterVariant({ sessionExpired: true, loggedInNoWallet: true, mode: TOP_BAR_MODE.DISCONNECTED })).toBe(HEADER_CENTER_VARIANT.SESSION_EXPIRED);
  });

  it("is logged-in-no-wallet when set and session hasn't expired", () => {
    expect(getHeaderCenterVariant({ sessionExpired: false, loggedInNoWallet: true, mode: TOP_BAR_MODE.DISCONNECTED })).toBe(HEADER_CENTER_VARIANT.LOGGED_IN_NO_WALLET);
  });

  it("falls through to the wallet mode when neither auth override is active", () => {
    expect(getHeaderCenterVariant({ sessionExpired: false, loggedInNoWallet: false, mode: TOP_BAR_MODE.CONNECTED })).toBe(TOP_BAR_MODE.CONNECTED);
    expect(getHeaderCenterVariant({ sessionExpired: false, loggedInNoWallet: false, mode: TOP_BAR_MODE.WRONG_NETWORK })).toBe(TOP_BAR_MODE.WRONG_NETWORK);
    expect(getHeaderCenterVariant({ sessionExpired: false, loggedInNoWallet: false, mode: TOP_BAR_MODE.DISCONNECTED })).toBe(TOP_BAR_MODE.DISCONNECTED);
  });
});
