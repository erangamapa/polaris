// SIDEBAR TRANSITION — SOFT OVERLAPPING FADE (no discrete phase machine).
//
// Earlier versions of this file used a strict multi-phase state machine
// (wait for the outgoing fade to fully finish via a timer, THEN wait for
// the shell width's own transitionend, THEN only start the incoming
// fade). That guaranteed the two menus were never visible together, but
// the strict full-sequential WAITING is what caused a noticeably long
// blank pause between steps — reviewed against a reference recording,
// that reads as sluggish rather than calm/soft.
//
// This version removes the phase machine entirely. There are only two
// real states now — `desiredExpanded` (the target) and `settled` (has the
// whole sequence had enough time to finish, tracked with one timer in
// Sidebar.jsx) — and instead of JS chaining one CSS transition after
// another's completion, all three animations (outgoing fade, shell width,
// incoming fade) are declared with their own fixed delay/duration and left
// for the BROWSER to run CONCURRENTLY. The only coordination is via the
// delay values themselves: the shell starts almost immediately (giving
// the outgoing fade a head start), and the incoming layer's reveal is
// delayed long enough that the outgoing layer is already imperceptible —
// a small, deliberate technical opacity overlap is allowed (the actual
// requirement is "never both clearly readable", not "no two opacity
// values are ever simultaneously above zero").
//
// Reversing direction mid-transition needs no special handling: CSS
// transitions always animate from an element's CURRENT computed value
// toward whatever the new target is, using whichever delay/duration is
// active at the moment the target changes — flipping `desiredExpanded`
// again mid-fade or mid-width-change just works, the browser handles it.

export const SIDEBAR_SHELL_DURATION_MS = 145;
export const SIDEBAR_SHELL_START_DELAY_MS = 24;
export const SIDEBAR_MENU_FADE_OUT_MS = 70;
export const SIDEBAR_MENU_FADE_IN_MS = 90;
export const SIDEBAR_INCOMING_REVEAL_DELAY_MS = 98;
// The point at which the whole sequence is considered "committed" — the
// incoming layer's own reveal delay plus its own fade-in duration, i.e.
// the moment it reaches full opacity. Derived rather than a separate
// magic number, so it can never drift out of sync with the constants
// above if they're ever retuned.
export const SIDEBAR_SETTLE_MS = SIDEBAR_INCOMING_REVEAL_DELAY_MS + SIDEBAR_MENU_FADE_IN_MS;

// Pure derivation: everything the rendered rail needs, as a function of
// (desiredExpanded, settled) alone. `settled` only ever matters for
// interactivity/tooltip gating — the visual opacity/width targets depend
// only on `desiredExpanded`, which is what lets the CSS transitions run
// freely without waiting on anything from the JS side.
export function railVisuals(desiredExpanded, settled) {
  return {
    widthExpanded: desiredExpanded,
    compactOpacity: desiredExpanded ? 0 : 1,
    expandedOpacity: desiredExpanded ? 1 : 0,
    // Interactions/AT-exposure only ever turn on once BOTH the target
    // matches AND enough time has passed for the whole sequence to have
    // visually settled — never mid-fade, regardless of direction.
    compactInteractive: !desiredExpanded && settled,
    expandedInteractive: desiredExpanded && settled,
    // Whichever layer is CURRENTLY fading OUT gets no delay and the
    // shorter duration; whichever is fading IN gets the reveal delay and
    // the slightly longer duration — regardless of which layer (compact
    // or expanded) that happens to be right now.
    compactTiming: desiredExpanded
      ? { durationMs: SIDEBAR_MENU_FADE_OUT_MS, delayMs: 0 }
      : { durationMs: SIDEBAR_MENU_FADE_IN_MS, delayMs: SIDEBAR_INCOMING_REVEAL_DELAY_MS },
    expandedTiming: desiredExpanded
      ? { durationMs: SIDEBAR_MENU_FADE_IN_MS, delayMs: SIDEBAR_INCOMING_REVEAL_DELAY_MS }
      : { durationMs: SIDEBAR_MENU_FADE_OUT_MS, delayMs: 0 },
  };
}
