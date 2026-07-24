// SIDEBAR COLLAPSE/EXPANSION — PERMANENT TRANSITION FIX.
//
// Root cause of the prior jumpiness: the rail's width transition and its
// label-reveal transition were two INDEPENDENT CSS transitions started at
// (almost) the same instant, coordinated only by a hand-picked delay
// number (labels started revealing 90ms into a 280ms width animation —
// i.e. while the rail was still visibly only ~1/3 of the way open).
// That's an approximation of sequencing via timing constants, not real
// sequencing — under any drift (a slow frame, a redirected/reversed
// toggle, reduced motion) the two could desync and the label would appear
// mid-resize, which reads exactly as "the menu reformatting itself".
//
// This file is the actual fix: a small, pure, explicit state machine with
// SIX phases (not a boolean), so the two properties that must never move
// at the same time — rail WIDTH and CONTENT (label/heading) visibility —
// are structurally forced into non-overlapping windows. Reversing
// direction mid-transition, rapid toggling, and reduced motion all fall
// out of the same four functions below with no special-casing, because
// every phase has an exact, provable next-phase for every input.
//
//                     ┌────────────┐
//        desired=true │            │ desired=false
//        (from COLLAPSED)          (from EXPANDED)
//                     ▼            ▼
//   COLLAPSED → OPENING → REVEALING → EXPANDED
//       ▲          │           │          │
//       │          │ desired=false        │ desired=false
//       │          ▼           ▼          ▼
//       └── CLOSING ◄──────── HIDING ◄────┘
//              ▲                  │
//              └── desired=true ──┘ (reverses back to REVEALING)
//
// WIDTH only ever moves during OPENING/CLOSING. CONTENT only ever moves
// during REVEALING/HIDING. Reversing mid-transition always lands on the
// OTHER phase for whichever property was already in motion (OPENING <->
// CLOSING, REVEALING <-> HIDING) — the CSS transition itself reverses
// smoothly from its current computed value the moment the target class
// flips, so no JS interpolation math is needed.

export const RAIL_PHASE = {
  COLLAPSED: "collapsed",
  OPENING: "opening", // width animating toward expanded; content stays hidden
  REVEALING: "revealing", // width already at expanded; content animating in
  EXPANDED: "expanded", // steady state, fully open
  HIDING: "hiding", // width still at expanded; content animating out
  CLOSING: "closing", // width animating toward collapsed; content stays hidden
};

// Hydration/first-render safety: the phase machine must start in a STEADY
// state that exactly matches the real initial preference, never in a
// transitional phase — otherwise first paint would animate from a phase
// that was never actually requested (see FIRST RENDER requirements).
export function initialRailPhase(desiredExpanded) {
  return desiredExpanded ? RAIL_PHASE.EXPANDED : RAIL_PHASE.COLLAPSED;
}

// A fresh target arrived (toggle click, cross-tab storage sync, etc.).
// Pure: same (phase, desiredExpanded) always yields the same next phase.
export function onDesiredChange(phase, desiredExpanded) {
  switch (phase) {
    case RAIL_PHASE.COLLAPSED:
      return desiredExpanded ? RAIL_PHASE.OPENING : phase;
    case RAIL_PHASE.OPENING:
      return desiredExpanded ? phase : RAIL_PHASE.CLOSING;
    case RAIL_PHASE.REVEALING:
      return desiredExpanded ? phase : RAIL_PHASE.HIDING;
    case RAIL_PHASE.EXPANDED:
      return desiredExpanded ? phase : RAIL_PHASE.HIDING;
    case RAIL_PHASE.HIDING:
      return desiredExpanded ? RAIL_PHASE.REVEALING : phase;
    case RAIL_PHASE.CLOSING:
      return desiredExpanded ? RAIL_PHASE.OPENING : phase;
    default:
      return phase;
  }
}

// The rail's real `transitionend` (width) fired. Guarded against staleness:
// if the desired direction already flipped since this phase started (which
// would already have moved us to a different phase via onDesiredChange),
// this is a no-op rather than a bogus advance — defensive, since the
// primary staleness protection is React's own effect-cleanup cancelling
// the listener/timer for a phase we've already left (see Sidebar.jsx).
export function onWidthTransitionEnd(phase, desiredExpanded) {
  if (phase === RAIL_PHASE.OPENING && desiredExpanded) return RAIL_PHASE.REVEALING;
  if (phase === RAIL_PHASE.CLOSING && !desiredExpanded) return RAIL_PHASE.COLLAPSED;
  return phase;
}

// Content's transition duration elapsed (centralized timer, not a DOM
// `transitionend` — content spans many separate label elements sharing
// one duration/easing, so no single element's event is authoritative;
// see Sidebar.jsx's useRailTransition for why a shared, cleanup-guarded
// timeout is the correct tool here per this task's own "if using timers
// as fallback, centralize them" guidance). Same staleness guard as above.
export function onContentTransitionEnd(phase, desiredExpanded) {
  if (phase === RAIL_PHASE.REVEALING && desiredExpanded) return RAIL_PHASE.EXPANDED;
  if (phase === RAIL_PHASE.HIDING && !desiredExpanded) return RAIL_PHASE.CLOSING;
  return phase;
}

// Pure derivation: everything the rendered rail needs, as a function of
// phase alone — no component should compute these booleans any other way.
export function railPhaseVisuals(phase) {
  return {
    // Width sits at the expanded target for every phase except the two
    // where it's explicitly supposed to be collapsed/collapsing.
    widthExpanded: phase !== RAIL_PHASE.COLLAPSED && phase !== RAIL_PHASE.CLOSING,
    // Content is only ever the *target* of "visible" while REVEALING
    // (animating toward visible) or EXPANDED (settled visible).
    contentVisible: phase === RAIL_PHASE.REVEALING || phase === RAIL_PHASE.EXPANDED,
    // Collapsed-only tooltips may ONLY appear once fully settled collapsed
    // — never mid-OPENING/CLOSING, never while any content is mid-motion.
    tooltipsEnabled: phase === RAIL_PHASE.COLLAPSED,
  };
}

// Whether `phase` currently has a pending, timed advance in flight — used
// by Sidebar.jsx to decide whether to schedule a content-duration timer.
export function isContentInMotion(phase) {
  return phase === RAIL_PHASE.REVEALING || phase === RAIL_PHASE.HIDING;
}
