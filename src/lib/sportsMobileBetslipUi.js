// Mobile betslip presentation rules — kept as pure functions (same split as
// sportsDesktopBetslipUi.js's nextDesktopBetslipUiState) so the one piece of
// real decision logic here is unit-testable without rendering anything.
// Everything else this task added (MobileBetslipSheet, the success-state
// wiring in AzuroBetSlip/DemoBetSlip) is presentation/interaction that was
// verified manually via Playwright against the running dev server instead —
// see sportsMobileBetslipUi.test.js for exactly which scenarios landed here
// vs. there.

// Reopen affordance for a closed betslip with pending selections (see
// MobileBetslipSheet.jsx's floating "View betslip" pill in SportsArena.jsx):
// only ever shown on mobile, only while the sheet itself isn't already open,
// and only while there's something to review.
export function shouldShowReopenPill({ isDesktopLayout, slipOpen, selectionCount }) {
  return !isDesktopLayout && !slipOpen && selectionCount > 0;
}
