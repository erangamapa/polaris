// SIDEBAR COLLAPSE/EXPANSION — SEQUENTIAL HANDOFF (no crossfade).
//
// This replaces an earlier crossfade design (compact and expanded both
// visible at overlapping opacity for a brief window) that turned out to
// look busy and cluttered in practice — two full navigation layouts with
// text/headings partially overlapping reads very differently than a
// simple photo crossfade. This version is strictly SEQUENTIAL: at no
// point are both layers' target opacity non-zero at the same time.
//
// Eight phases, one clear thing happening in each:
//
//   COLLAPSED → COMPACT_HIDING → OPENING → EXPANDED_REVEALING → EXPANDED
//       ▲             │                            │              │
//       │             ▼ reverse                    ▼ reverse      │
//       │      COMPACT_REVEALING ◄─── CLOSING ◄─── EXPANDED_HIDING ◄┘
//       └──────────────┘
//
//   COMPACT_HIDING       — compact fading 1→0; width still collapsed
//   OPENING              — width animating collapsed→expanded; BOTH menus
//                          invisible (opacity 0) — this is the "empty
//                          shell" step the task asks for
//   EXPANDED_REVEALING   — expanded fading 0→1; width already expanded
//   EXPANDED_HIDING      — expanded fading 1→0; width still expanded
//   CLOSING              — width animating expanded→collapsed; BOTH menus
//                          invisible
//   COMPACT_REVEALING    — compact fading 0→1; width already collapsed
//
// Reversing direction mid-transition lands on the "mirror" phase for
// whichever single property (compact opacity / width / expanded opacity)
// was actually in motion — COMPACT_HIDING<->COMPACT_REVEALING,
// OPENING<->CLOSING, EXPANDED_REVEALING<->EXPANDED_HIDING — the same
// technique the previous (crossfade) version used, just with four mirror
// pairs instead of two, since compact-fade and expanded-fade are now
// fully separate, non-overlapping motions rather than one shared "content"
// motion.

export const RAIL_PHASE = {
  COLLAPSED: "collapsed",
  COMPACT_HIDING: "compact-hiding",
  OPENING: "opening",
  EXPANDED_REVEALING: "expanded-revealing",
  EXPANDED: "expanded",
  EXPANDED_HIDING: "expanded-hiding",
  CLOSING: "closing",
  COMPACT_REVEALING: "compact-revealing",
};

// Hydration/first-render safety: start in a steady state that exactly
// matches the real initial preference, never mid-sequence.
export function initialRailPhase(desiredExpanded) {
  return desiredExpanded ? RAIL_PHASE.EXPANDED : RAIL_PHASE.COLLAPSED;
}

// A fresh target arrived (toggle click, cross-tab storage sync, etc.).
export function onDesiredChange(phase, desiredExpanded) {
  switch (phase) {
    case RAIL_PHASE.COLLAPSED:
      return desiredExpanded ? RAIL_PHASE.COMPACT_HIDING : phase;
    case RAIL_PHASE.COMPACT_HIDING:
      return desiredExpanded ? phase : RAIL_PHASE.COMPACT_REVEALING;
    case RAIL_PHASE.OPENING:
      return desiredExpanded ? phase : RAIL_PHASE.CLOSING;
    case RAIL_PHASE.EXPANDED_REVEALING:
      return desiredExpanded ? phase : RAIL_PHASE.EXPANDED_HIDING;
    case RAIL_PHASE.EXPANDED:
      return desiredExpanded ? phase : RAIL_PHASE.EXPANDED_HIDING;
    case RAIL_PHASE.EXPANDED_HIDING:
      return desiredExpanded ? RAIL_PHASE.EXPANDED_REVEALING : phase;
    case RAIL_PHASE.CLOSING:
      return desiredExpanded ? RAIL_PHASE.OPENING : phase;
    case RAIL_PHASE.COMPACT_REVEALING:
      return desiredExpanded ? RAIL_PHASE.COMPACT_HIDING : phase;
    default:
      return phase;
  }
}

// Compact layer's own fade finished (a centralized timer, not a per-
// element `transitionend` — see Sidebar.jsx for why). Guarded against
// staleness: a late/duplicate firing that no longer matches the direction
// we're actually headed is a no-op (React's effect cleanup on phase change
// is the PRIMARY protection — this is a defensive second layer).
export function onCompactFadeEnd(phase, desiredExpanded) {
  if (phase === RAIL_PHASE.COMPACT_HIDING && desiredExpanded) return RAIL_PHASE.OPENING;
  if (phase === RAIL_PHASE.COMPACT_REVEALING && !desiredExpanded) return RAIL_PHASE.COLLAPSED;
  return phase;
}

// Expanded layer's own fade finished. Same staleness guard.
export function onExpandedFadeEnd(phase, desiredExpanded) {
  if (phase === RAIL_PHASE.EXPANDED_REVEALING && desiredExpanded) return RAIL_PHASE.EXPANDED;
  if (phase === RAIL_PHASE.EXPANDED_HIDING && !desiredExpanded) return RAIL_PHASE.CLOSING;
  return phase;
}

// The rail's real `transitionend` (width, a single element — reliable).
// Same staleness guard.
export function onWidthTransitionEnd(phase, desiredExpanded) {
  if (phase === RAIL_PHASE.OPENING && desiredExpanded) return RAIL_PHASE.EXPANDED_REVEALING;
  if (phase === RAIL_PHASE.CLOSING && !desiredExpanded) return RAIL_PHASE.COMPACT_REVEALING;
  return phase;
}

// Pure derivation: everything the rendered rail needs, as a function of
// phase alone. The critical property this whole redesign exists for:
// compactOpacity and expandedOpacity are NEVER both non-zero for the same
// phase — see the "no crossfade" test in sidebarTransition.test.js, which
// asserts this across the entire cycle.
export function railPhaseVisuals(phase) {
  switch (phase) {
    case RAIL_PHASE.COLLAPSED:
      return { widthExpanded: false, compactOpacity: 1, expandedOpacity: 0, compactInteractive: true, expandedInteractive: false };
    case RAIL_PHASE.COMPACT_HIDING:
      return { widthExpanded: false, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false };
    case RAIL_PHASE.OPENING:
      return { widthExpanded: true, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false };
    case RAIL_PHASE.EXPANDED_REVEALING:
      return { widthExpanded: true, compactOpacity: 0, expandedOpacity: 1, compactInteractive: false, expandedInteractive: false };
    case RAIL_PHASE.EXPANDED:
      return { widthExpanded: true, compactOpacity: 0, expandedOpacity: 1, compactInteractive: false, expandedInteractive: true };
    case RAIL_PHASE.EXPANDED_HIDING:
      return { widthExpanded: true, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false };
    case RAIL_PHASE.CLOSING:
      return { widthExpanded: false, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false };
    case RAIL_PHASE.COMPACT_REVEALING:
      return { widthExpanded: false, compactOpacity: 1, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false };
    default:
      return { widthExpanded: false, compactOpacity: 1, expandedOpacity: 0, compactInteractive: true, expandedInteractive: false };
  }
}

// Whether `phase` has a pending compact-fade timer in flight.
export function isCompactFading(phase) {
  return phase === RAIL_PHASE.COMPACT_HIDING || phase === RAIL_PHASE.COMPACT_REVEALING;
}

// Whether `phase` has a pending expanded-fade timer in flight.
export function isExpandedFading(phase) {
  return phase === RAIL_PHASE.EXPANDED_REVEALING || phase === RAIL_PHASE.EXPANDED_HIDING;
}

// Whether `phase` has a pending width-transition in flight.
export function isWidthInMotion(phase) {
  return phase === RAIL_PHASE.OPENING || phase === RAIL_PHASE.CLOSING;
}
