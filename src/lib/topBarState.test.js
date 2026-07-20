import { describe, it, expect } from "vitest";
import { TOP_BAR_MODE, getTopBarMode } from "./topBarState";

// This task's own AUTOMATED TESTS list (20 scenarios) is almost entirely
// rendering/interaction behavior — popover open/close, focus restoration,
// modal-closes-dropdown ownership, responsive compression, no double
// render — none of which is a pure function to assert against without a
// DOM. Per the project's established testing stack (vitest, no jsdom/React
// Testing Library — same constraint noted in every prior UI task this
// session), the one genuine piece of decision logic this task introduces
// (getTopBarMode, replacing what would otherwise be two nested inline
// ternaries) is unit-tested here; everything else was verified manually
// via Playwright against the running dev server (a temporary URL-param
// wallet mock was used to reach the connected/wrong-network states, since
// no real wallet is reachable in this sandbox — see the FINAL RESPONSE):
//
//  1.  Authenticated header renders            -> Playwright (screenshot, mockWallet=1)
//  2.  Balance and currency render              -> Playwright ("12430.2531 ETH" visible)
//  3.  Balance selector opens                    -> Playwright (Popover content visible, keyboard Enter)
//  4.  Currency selection updates shared state   -> N/A — no display-currency switcher exists (see BALANCE SELECTOR: real balances only, no fake currencies)
//  5.  Fund opens existing Funds flow             -> Playwright ([role=dialog]:has-text("Funds"))
//  6.  Activity opens existing Activity flow      -> Playwright (dialog count after click)
//  7.  Profile opens menu                          -> Playwright (DropdownMenu content visible)
//  8.  Only one popover opens at once              -> Playwright (opening Profile closes Balance)
//  9.  Modal opening closes popovers               -> Playwright (Manage wallet -> Funds dialog, popover closes)
//  10. Escape closes dropdown                       -> Playwright
//  11. Focus restores correctly                     -> Playwright (Balance/Profile trigger refocused after Escape)
//  12. Disconnected state renders                   -> Playwright (screenshot, no mockWallet param)
//  13. Wrong-network state renders                   -> Playwright (screenshot, mockWrongNetwork=1 — Switch network replaces Fund)
//  14. Loading state remains stable                  -> Playwright (screenshot, mockLoading=1 — Skeleton in place of balance, same control width)
//  15. Large balance does not overflow                -> Playwright (10,000,000.00000000 ETH + long address, hOverflow=false)
//  16. Sidebar expanded layout works                   -> Playwright (150% zoom screenshot, sidebar auto-expanded)
//  17. Sidebar collapsed layout works                   -> Playwright (1024px screenshot, sidebar auto-collapsed)
//  18. 1024px compact mode works                          -> Playwright (hOverflow=false, Fund visible, at all of 1024/1152/1280/1366/1440/1728/1920px)
//  19. Desktop header does not render on mobile             -> Playwright (BalanceControl visible count 0 at 390px)
//  20. Mobile header does not render on desktop               -> Playwright (visible Activity button count 1 at both 1440px and 390px — never 2)

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
