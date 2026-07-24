import { describe, it, expect } from "vitest";
import {
  RAIL_PHASE,
  initialRailPhase,
  onDesiredChange,
  onCompactFadeEnd,
  onExpandedFadeEnd,
  onWidthTransitionEnd,
  railPhaseVisuals,
  isCompactFading,
  isExpandedFading,
  isWidthInMotion,
} from "./sidebarTransition";

// SIDEBAR SEQUENTIAL HANDOFF — scenario coverage. Pure module (no DOM, no
// timers, no React), so every case below is a direct unit test. The DOM-
// integration half (does the real `<nav>` fire transitionend, is a
// compact icon actually left-anchored on screen) is verified manually via
// Playwright against the running dev server, matching this project's
// established testing convention:
//
//  - compact icons stay visually left-anchored, never drift toward centre -> Playwright
//  - real transitionend cancellation on rapid re-toggle                    -> Playwright
//  - no stale timer firing after unmount                                   -> Playwright
//  - reduced-motion instant switch in a live browser                       -> Playwright
//  - focus/tooltip timing in a live browser                                -> Playwright

describe("initialRailPhase", () => {
  it("starts steady EXPANDED when the initial preference is expanded (no animate-on-mount)", () => {
    expect(initialRailPhase(true)).toBe(RAIL_PHASE.EXPANDED);
  });
  it("starts steady COLLAPSED when the initial preference is collapsed", () => {
    expect(initialRailPhase(false)).toBe(RAIL_PHASE.COLLAPSED);
  });
});

describe("onDesiredChange — normal (non-reversing) requests", () => {
  it("COLLAPSED + expand request -> COMPACT_HIDING (compact starts fading out FIRST, before any width change)", () => {
    expect(onDesiredChange(RAIL_PHASE.COLLAPSED, true)).toBe(RAIL_PHASE.COMPACT_HIDING);
  });
  it("EXPANDED + collapse request -> EXPANDED_HIDING", () => {
    expect(onDesiredChange(RAIL_PHASE.EXPANDED, false)).toBe(RAIL_PHASE.EXPANDED_HIDING);
  });
  it("COLLAPSED + collapse request (already there) -> COLLAPSED (no-op)", () => {
    expect(onDesiredChange(RAIL_PHASE.COLLAPSED, false)).toBe(RAIL_PHASE.COLLAPSED);
  });
  it("EXPANDED + expand request (already there) -> EXPANDED (no-op)", () => {
    expect(onDesiredChange(RAIL_PHASE.EXPANDED, true)).toBe(RAIL_PHASE.EXPANDED);
  });
});

describe("onDesiredChange — reversing direction mid-transition", () => {
  it("COMPACT_HIDING (compact fade in motion) + collapse request -> COMPACT_REVEALING, width never touched", () => {
    expect(onDesiredChange(RAIL_PHASE.COMPACT_HIDING, false)).toBe(RAIL_PHASE.COMPACT_REVEALING);
  });
  it("COMPACT_REVEALING + expand request -> COMPACT_HIDING", () => {
    expect(onDesiredChange(RAIL_PHASE.COMPACT_REVEALING, true)).toBe(RAIL_PHASE.COMPACT_HIDING);
  });
  it("OPENING (width in motion, both menus hidden) + collapse request -> CLOSING, no menu ever shown", () => {
    expect(onDesiredChange(RAIL_PHASE.OPENING, false)).toBe(RAIL_PHASE.CLOSING);
  });
  it("CLOSING + expand request -> OPENING", () => {
    expect(onDesiredChange(RAIL_PHASE.CLOSING, true)).toBe(RAIL_PHASE.OPENING);
  });
  it("EXPANDED_REVEALING (expanded fade in motion) + collapse request -> EXPANDED_HIDING, width never touched", () => {
    expect(onDesiredChange(RAIL_PHASE.EXPANDED_REVEALING, false)).toBe(RAIL_PHASE.EXPANDED_HIDING);
  });
  it("EXPANDED_HIDING + expand request -> EXPANDED_REVEALING", () => {
    expect(onDesiredChange(RAIL_PHASE.EXPANDED_HIDING, true)).toBe(RAIL_PHASE.EXPANDED_REVEALING);
  });
});

describe("onCompactFadeEnd / onExpandedFadeEnd / onWidthTransitionEnd", () => {
  it("COMPACT_HIDING's fade ending, still headed to expanded, advances to OPENING", () => {
    expect(onCompactFadeEnd(RAIL_PHASE.COMPACT_HIDING, true)).toBe(RAIL_PHASE.OPENING);
  });
  it("COMPACT_REVEALING's fade ending, still headed to collapsed, advances to COLLAPSED", () => {
    expect(onCompactFadeEnd(RAIL_PHASE.COMPACT_REVEALING, false)).toBe(RAIL_PHASE.COLLAPSED);
  });
  it("a stale compact-fade event (direction already flipped) is a no-op", () => {
    expect(onCompactFadeEnd(RAIL_PHASE.COMPACT_HIDING, false)).toBe(RAIL_PHASE.COMPACT_HIDING);
  });
  it("EXPANDED_REVEALING's fade ending, still headed to expanded, advances to EXPANDED", () => {
    expect(onExpandedFadeEnd(RAIL_PHASE.EXPANDED_REVEALING, true)).toBe(RAIL_PHASE.EXPANDED);
  });
  it("EXPANDED_HIDING's fade ending, still headed to collapsed, advances to CLOSING", () => {
    expect(onExpandedFadeEnd(RAIL_PHASE.EXPANDED_HIDING, false)).toBe(RAIL_PHASE.CLOSING);
  });
  it("a stale expanded-fade event is a no-op", () => {
    expect(onExpandedFadeEnd(RAIL_PHASE.EXPANDED_REVEALING, false)).toBe(RAIL_PHASE.EXPANDED_REVEALING);
  });
  it("OPENING's width transitionend, still headed to expanded, advances to EXPANDED_REVEALING", () => {
    expect(onWidthTransitionEnd(RAIL_PHASE.OPENING, true)).toBe(RAIL_PHASE.EXPANDED_REVEALING);
  });
  it("CLOSING's width transitionend, still headed to collapsed, advances to COMPACT_REVEALING", () => {
    expect(onWidthTransitionEnd(RAIL_PHASE.CLOSING, false)).toBe(RAIL_PHASE.COMPACT_REVEALING);
  });
  it("a stale width event is a no-op", () => {
    expect(onWidthTransitionEnd(RAIL_PHASE.OPENING, false)).toBe(RAIL_PHASE.OPENING);
  });
});

describe("railPhaseVisuals — the core guarantee: never both visible at once", () => {
  it("no phase has both compactOpacity and expandedOpacity non-zero", () => {
    for (const phase of Object.values(RAIL_PHASE)) {
      const { compactOpacity, expandedOpacity } = railPhaseVisuals(phase);
      const bothVisible = compactOpacity > 0 && expandedOpacity > 0;
      expect(bothVisible).toBe(false);
    }
  });

  it("COLLAPSED: compact visible+interactive, expanded hidden, width collapsed", () => {
    expect(railPhaseVisuals(RAIL_PHASE.COLLAPSED)).toEqual({ widthExpanded: false, compactOpacity: 1, expandedOpacity: 0, compactInteractive: true, expandedInteractive: false });
  });
  it("COMPACT_HIDING: neither visible, width still collapsed (fade happens before width moves)", () => {
    expect(railPhaseVisuals(RAIL_PHASE.COMPACT_HIDING)).toEqual({ widthExpanded: false, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false });
  });
  it("OPENING: neither visible, width now expanding — the 'empty shell' step", () => {
    expect(railPhaseVisuals(RAIL_PHASE.OPENING)).toEqual({ widthExpanded: true, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false });
  });
  it("EXPANDED_REVEALING: only expanded animating toward visible, width already settled", () => {
    expect(railPhaseVisuals(RAIL_PHASE.EXPANDED_REVEALING)).toEqual({ widthExpanded: true, compactOpacity: 0, expandedOpacity: 1, compactInteractive: false, expandedInteractive: false });
  });
  it("EXPANDED: expanded visible+interactive, compact hidden, width expanded", () => {
    expect(railPhaseVisuals(RAIL_PHASE.EXPANDED)).toEqual({ widthExpanded: true, compactOpacity: 0, expandedOpacity: 1, compactInteractive: false, expandedInteractive: true });
  });
  it("EXPANDED_HIDING: neither visible, width still expanded (fade happens before width moves)", () => {
    expect(railPhaseVisuals(RAIL_PHASE.EXPANDED_HIDING)).toEqual({ widthExpanded: true, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false });
  });
  it("CLOSING: neither visible, width now shrinking — the 'empty shell' step in reverse", () => {
    expect(railPhaseVisuals(RAIL_PHASE.CLOSING)).toEqual({ widthExpanded: false, compactOpacity: 0, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false });
  });
  it("COMPACT_REVEALING: only compact animating toward visible, width already settled", () => {
    expect(railPhaseVisuals(RAIL_PHASE.COMPACT_REVEALING)).toEqual({ widthExpanded: false, compactOpacity: 1, expandedOpacity: 0, compactInteractive: false, expandedInteractive: false });
  });

  it("exactly one of compactInteractive/expandedInteractive is true only in the two steady phases, both false everywhere else", () => {
    const interactiveCounts = Object.values(RAIL_PHASE).map((phase) => {
      const v = railPhaseVisuals(phase);
      return (v.compactInteractive ? 1 : 0) + (v.expandedInteractive ? 1 : 0);
    });
    expect(interactiveCounts).toEqual([1, 0, 0, 0, 1, 0, 0, 0]); // COLLAPSED, COMPACT_HIDING, OPENING, EXPANDED_REVEALING, EXPANDED, EXPANDED_HIDING, CLOSING, COMPACT_REVEALING
  });
});

describe("isCompactFading / isExpandedFading / isWidthInMotion", () => {
  it("classify each phase into exactly the right in-motion bucket (or none, for steady phases)", () => {
    const bucket = (phase) => {
      if (isCompactFading(phase)) return "compact";
      if (isExpandedFading(phase)) return "expanded";
      if (isWidthInMotion(phase)) return "width";
      return "steady";
    };
    expect(bucket(RAIL_PHASE.COLLAPSED)).toBe("steady");
    expect(bucket(RAIL_PHASE.COMPACT_HIDING)).toBe("compact");
    expect(bucket(RAIL_PHASE.OPENING)).toBe("width");
    expect(bucket(RAIL_PHASE.EXPANDED_REVEALING)).toBe("expanded");
    expect(bucket(RAIL_PHASE.EXPANDED)).toBe("steady");
    expect(bucket(RAIL_PHASE.EXPANDED_HIDING)).toBe("expanded");
    expect(bucket(RAIL_PHASE.CLOSING)).toBe("width");
    expect(bucket(RAIL_PHASE.COMPACT_REVEALING)).toBe("compact");
  });
});

describe("full cycles never get stuck", () => {
  it("full expand: COLLAPSED -> COMPACT_HIDING -> OPENING -> EXPANDED_REVEALING -> EXPANDED", () => {
    let phase = RAIL_PHASE.COLLAPSED;
    phase = onDesiredChange(phase, true);
    expect(phase).toBe(RAIL_PHASE.COMPACT_HIDING);
    phase = onCompactFadeEnd(phase, true);
    expect(phase).toBe(RAIL_PHASE.OPENING);
    phase = onWidthTransitionEnd(phase, true);
    expect(phase).toBe(RAIL_PHASE.EXPANDED_REVEALING);
    phase = onExpandedFadeEnd(phase, true);
    expect(phase).toBe(RAIL_PHASE.EXPANDED);
  });

  it("full collapse: EXPANDED -> EXPANDED_HIDING -> CLOSING -> COMPACT_REVEALING -> COLLAPSED", () => {
    let phase = RAIL_PHASE.EXPANDED;
    phase = onDesiredChange(phase, false);
    expect(phase).toBe(RAIL_PHASE.EXPANDED_HIDING);
    phase = onExpandedFadeEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.CLOSING);
    phase = onWidthTransitionEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.COMPACT_REVEALING);
    phase = onCompactFadeEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.COLLAPSED);
  });

  it("rapid double-toggle (expand, then immediately collapse again) during the compact fade settles back at COLLAPSED with the width never having moved", () => {
    let phase = RAIL_PHASE.COLLAPSED;
    phase = onDesiredChange(phase, true); // COMPACT_HIDING
    phase = onDesiredChange(phase, false); // reversed -> COMPACT_REVEALING, before width ever moved
    expect(phase).toBe(RAIL_PHASE.COMPACT_REVEALING);
    expect(isWidthInMotion(phase)).toBe(false);
    phase = onCompactFadeEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.COLLAPSED);
  });

  it("reversing during the width-only step never reveals either menu before settling back", () => {
    let phase = RAIL_PHASE.COLLAPSED;
    phase = onDesiredChange(phase, true); // COMPACT_HIDING
    phase = onCompactFadeEnd(phase, true); // OPENING
    phase = onDesiredChange(phase, false); // reversed -> CLOSING
    expect(phase).toBe(RAIL_PHASE.CLOSING);
    expect(railPhaseVisuals(phase).compactOpacity).toBe(0);
    expect(railPhaseVisuals(phase).expandedOpacity).toBe(0);
    phase = onWidthTransitionEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.COMPACT_REVEALING);
    phase = onCompactFadeEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.COLLAPSED);
  });

  it("reversing twice in a row (expand fully into EXPANDED_REVEALING, collapse, expand again) still resolves correctly", () => {
    let phase = RAIL_PHASE.COLLAPSED;
    phase = onDesiredChange(phase, true); // COMPACT_HIDING
    phase = onCompactFadeEnd(phase, true); // OPENING
    phase = onWidthTransitionEnd(phase, true); // EXPANDED_REVEALING
    phase = onDesiredChange(phase, false); // EXPANDED_HIDING (reverse mid-reveal)
    phase = onDesiredChange(phase, true); // EXPANDED_REVEALING again (reverse back)
    expect(phase).toBe(RAIL_PHASE.EXPANDED_REVEALING);
    phase = onExpandedFadeEnd(phase, true);
    expect(phase).toBe(RAIL_PHASE.EXPANDED);
  });
});
