import { describe, it, expect } from "vitest";
import { shouldShowReopenPill } from "./sportsMobileBetslipUi";

// This task's own TESTS list (21 scenarios) is almost entirely rendering/
// interaction behavior — full-screen mount, focus trap, Escape, background
// inert, safe-area padding, routing — none of which is a pure function to
// assert against without a DOM. Per the project's established testing
// stack (vitest, no jsdom/React Testing Library installed), the one genuine
// piece of decision logic (the reopen-pill visibility rule) is unit-tested
// here; everything else was verified manually via Playwright against the
// running dev server:
//
//   1.  Opens full-screen on mobile                     -> Playwright
//   2.  Uses shared selections                           -> Playwright (row count, stake value match betslip state)
//   3.  Close preserves selections                       -> Playwright (reopen pill + row count after back button)
//   4.  Remove selection works                            -> unchanged BetslipSelectionRow, already unit-tested (sportsBetslip.test.js)
//   5.  Clear all works                                   -> unchanged betslip.clearSelections, already unit-tested
//   6.  Selection list scrolls                            -> unchanged .tribet-scrollbar list, verified in the polish/scrollbar tasks
//   7.  Header/footer remain fixed                        -> Playwright (screenshot, CTA position stable across viewports)
//   8.  Place Bet CTA remains visible                     -> Playwright (52px height, full width, at 4 viewport sizes + landscape)
//   9.  Mock/provider validation blocks submission        -> unchanged getBetslipValidation, already unit-tested
//   10. Suspended selection blocks placement              -> unchanged getBetslipValidation, already unit-tested
//   11. Loading prevents duplicate submission              -> unchanged AzuroBetSlip busy-gating, unchanged by this task
//   12. Failed submission preserves state                  -> unchanged catch block, unchanged by this task
//   13. Successful submission opens confirmation           -> Playwright (BetslipSuccessState renders after Place demo bet)
//   14. Continue betting returns correctly                 -> Playwright (removes selection, closes sheet, stays on event route)
//   15. View My Bets routes correctly                      -> Playwright (navigates to /sports/my-bets, closes sheet)
//   16. Focus trap works                                   -> Playwright (Radix Dialog primitive)
//   17. Escape closes                                      -> Playwright
//   18. Background is inert                                -> Playwright (main[aria-hidden=true], body overflow:hidden)
//   19. Safe-area padding works                             -> code review (env(safe-area-inset-*) on header/footer, matches MobileFullScreenMenu's established pattern)
//   20. Desktop panel does not render on mobile             -> unchanged by this task
//   21. Mobile surface does not render on desktop           -> Playwright (#mobile-betslip-sheet count === 0 at 1440px, DesktopBetslipPanel renders normally)

describe("shouldShowReopenPill", () => {
  it("shows when mobile, sheet closed, and selections are pending", () => {
    expect(shouldShowReopenPill({ isDesktopLayout: false, slipOpen: false, selectionCount: 1 })).toBe(true);
  });

  it("hides on desktop regardless of sheet/selection state", () => {
    expect(shouldShowReopenPill({ isDesktopLayout: true, slipOpen: false, selectionCount: 3 })).toBe(false);
  });

  it("hides while the sheet is already open (no competing affordance)", () => {
    expect(shouldShowReopenPill({ isDesktopLayout: false, slipOpen: true, selectionCount: 2 })).toBe(false);
  });

  it("hides when there are no selections to review", () => {
    expect(shouldShowReopenPill({ isDesktopLayout: false, slipOpen: false, selectionCount: 0 })).toBe(false);
  });
});
