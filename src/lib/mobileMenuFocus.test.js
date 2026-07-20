import { describe, it, expect } from "vitest";
import { CLOSE_TRIGGER, focusIntentForCloseTrigger } from "./mobileMenuFocus";

// This task's own AUTOMATED TESTS list (25 scenarios) is almost entirely
// rendering/interaction/focus-management behavior — dialog mounting, one
// nav landmark, inert backgrounds, Tab order, breakpoint cleanup — none of
// which is a pure function to assert against without a DOM. Per the
// project's established testing stack (vitest, no jsdom/React Testing
// Library installed — same constraint noted in the Phase 1 betslip tasks),
// the one genuine piece of decision logic this task introduces
// (focusIntentForCloseTrigger) is unit-tested here; everything else was
// verified manually via Playwright against the running dev server:
//
//  1.  Menu opens with correct arena content        -> Playwright (screenshot, dialog aria-label)
//  2.  Only one bottom nav rendered accessibly       -> Playwright (nav[aria-label] count === 1, open and closed)
//  3.  External bottom nav absent while open         -> Playwright (0 navs outside #mobile-fullscreen-menu)
//  4.  Bottom nav inside dialog focus boundary        -> Playwright (Tab cycle reaches "Menu" button, never escapes dialog)
//  5.  Background becomes inert                       -> Playwright (main/header aria-hidden=true)
//  6.  Focus enters dialog                             -> Playwright (active arena link focused on open)
//  7.  Tab remains inside dialog                       -> Playwright (20-tab cycle, escapedDialog=false)
//  8.  Close button restores focus to Menu             -> Playwright
//  9.  Menu item closes and restores focus             -> Playwright ("Menu" tapped again while open)
//  10. Escape closes and restores focus                -> Playwright
//  11. Arena selection closes and navigates            -> Playwright (url changes, dialog gone)
//  12. Arena selection focuses destination             -> Playwright (document.activeElement === <main>)
//  13. Section selection closes and navigates          -> Playwright
//  14. Section selection focuses destination           -> Playwright
//  15. Scroll position restores                        -> unchanged mainRef overflow-toggle mechanism, not touched by this task
//  16. Body lock is removed on close                   -> Playwright (main overflowY === "" after close)
//  17. Resize to desktop cleans modal state             -> Playwright (menu hidden, overflow released at 1280px)
//  18. Returning to mobile does not reopen menu         -> Playwright
//  19. Wallet opening closes menu                       -> unchanged pre-existing openFunds/ensureAuth behavior
//  20. Mobile betslip opening closes menu               -> code path added (SportsArena onBetslipWillOpen), not reachable via UI (see FINAL RESPONSE)
//  21. Menu opening closes incompatible overlay          -> Playwright (RG dialog backdrop already blocks the trigger; closeOtherOverlays is the defensive backstop)
//  22. Rapid repeated taps resolve correctly             -> Playwright (6 rapid taps, navigate mid-open-animation)
//  23. No duplicate nav landmarks                        -> Playwright (see #2/#3)
//  24. No duplicate focusable bottom-nav items            -> Playwright (see #2/#3)
//  25. Reduced-motion mode works                          -> Playwright (full flow under reducedMotion: 'reduce', no console errors)

describe("focusIntentForCloseTrigger", () => {
  it("returns to the Menu trigger for the close button", () => {
    expect(focusIntentForCloseTrigger(CLOSE_TRIGGER.CLOSE_BUTTON)).toBe("trigger");
  });

  it("returns to the Menu trigger for Escape", () => {
    expect(focusIntentForCloseTrigger(CLOSE_TRIGGER.ESCAPE)).toBe("trigger");
  });

  it("returns to the Menu trigger when Menu is tapped again while open", () => {
    expect(focusIntentForCloseTrigger(CLOSE_TRIGGER.MENU_TAPPED_AGAIN)).toBe("trigger");
  });

  it("focuses the destination for an arena selection", () => {
    expect(focusIntentForCloseTrigger(CLOSE_TRIGGER.ARENA_SELECT)).toBe("navigate");
  });

  it("focuses the destination for a section selection", () => {
    expect(focusIntentForCloseTrigger(CLOSE_TRIGGER.SECTION_SELECT)).toBe("navigate");
  });

  it("defaults unrecognized/unset triggers to the safe 'trigger' outcome", () => {
    expect(focusIntentForCloseTrigger(undefined)).toBe("trigger");
    expect(focusIntentForCloseTrigger("browser-back")).toBe("trigger");
  });
});
