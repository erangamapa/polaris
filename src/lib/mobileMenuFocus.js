// Action-specific focus restoration for MobileFullScreenMenu — the one
// piece of real decision logic this task introduces, kept as a pure
// function (same split as sportsDesktopBetslipUi.js/sportsMobileBetslipUi.js)
// so it's unit-testable without rendering anything, and so the five call
// sites that report a close trigger (X button, Escape, "Menu" tapped again,
// an arena link, a section link) all resolve through one place instead of
// five separate string literals.
//
// "trigger": return focus to the Menu bottom-nav button — the close itself
//   didn't go anywhere, so the safest, least disorienting place for focus
//   to land is back where the user's attention already was.
// "navigate": focus the destination's main content instead — arena/section
//   selection both navigate away, so returning focus to a nav button the
//   user is no longer looking at would be disorienting.
export const CLOSE_TRIGGER = {
  CLOSE_BUTTON: "close-button",
  ESCAPE: "escape",
  MENU_TAPPED_AGAIN: "menu-tapped-again",
  ARENA_SELECT: "arena-select",
  SECTION_SELECT: "section-select",
};

const NAVIGATE_TRIGGERS = new Set([CLOSE_TRIGGER.ARENA_SELECT, CLOSE_TRIGGER.SECTION_SELECT]);

export function focusIntentForCloseTrigger(trigger) {
  return NAVIGATE_TRIGGERS.has(trigger) ? "navigate" : "trigger";
}
