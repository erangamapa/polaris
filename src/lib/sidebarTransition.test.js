import { describe, it, expect } from "vitest";
import {
  RAIL_PHASE,
  initialRailPhase,
  onDesiredChange,
  onWidthTransitionEnd,
  onContentTransitionEnd,
  railPhaseVisuals,
  isContentInMotion,
} from "./sidebarTransition";

// SIDEBAR TRANSITION STATE MACHINE — scenario coverage. This module is
// pure (no DOM, no timers, no React), so every case below is a direct
// unit test rather than something verified manually via Playwright —
// the DOM-integration half (does the real `<nav>` actually fire
// transitionend, does the centralized timeout actually get cancelled on
// unmount) is verified manually via Playwright against the running dev
// server, matching this project's established testing convention:
//
//  - real transitionend cancellation on rapid re-toggle -> Playwright
//  - no stale timer firing after unmount                -> Playwright
//  - reduced-motion instant switch in a live browser     -> Playwright
//  - focus/tooltip timing in a live browser               -> Playwright

describe("initialRailPhase", () => {
  it("starts steady EXPANDED when the initial preference is expanded (no animate-on-mount)", () => {
    expect(initialRailPhase(true)).toBe(RAIL_PHASE.EXPANDED);
  });
  it("starts steady COLLAPSED when the initial preference is collapsed", () => {
    expect(initialRailPhase(false)).toBe(RAIL_PHASE.COLLAPSED);
  });
});

describe("onDesiredChange — normal (non-reversing) requests", () => {
  it("COLLAPSED + expand request -> OPENING", () => {
    expect(onDesiredChange(RAIL_PHASE.COLLAPSED, true)).toBe(RAIL_PHASE.OPENING);
  });
  it("EXPANDED + collapse request -> HIDING", () => {
    expect(onDesiredChange(RAIL_PHASE.EXPANDED, false)).toBe(RAIL_PHASE.HIDING);
  });
  it("COLLAPSED + collapse request (already there) -> COLLAPSED (no-op)", () => {
    expect(onDesiredChange(RAIL_PHASE.COLLAPSED, false)).toBe(RAIL_PHASE.COLLAPSED);
  });
  it("EXPANDED + expand request (already there) -> EXPANDED (no-op)", () => {
    expect(onDesiredChange(RAIL_PHASE.EXPANDED, true)).toBe(RAIL_PHASE.EXPANDED);
  });
  it("OPENING + expand request (already heading there) -> OPENING (no-op)", () => {
    expect(onDesiredChange(RAIL_PHASE.OPENING, true)).toBe(RAIL_PHASE.OPENING);
  });
  it("HIDING + collapse request (already heading there) -> HIDING (no-op)", () => {
    expect(onDesiredChange(RAIL_PHASE.HIDING, false)).toBe(RAIL_PHASE.HIDING);
  });
});

describe("onDesiredChange — reversing direction mid-transition", () => {
  it("OPENING (width in motion, content still hidden) + collapse request -> CLOSING, never touching content", () => {
    // Width simply reverses toward collapsed from wherever it currently
    // is; content was never shown, so there is nothing to fade.
    expect(onDesiredChange(RAIL_PHASE.OPENING, false)).toBe(RAIL_PHASE.CLOSING);
  });
  it("CLOSING (width in motion, content already hidden) + expand request -> OPENING, never touching content", () => {
    expect(onDesiredChange(RAIL_PHASE.CLOSING, true)).toBe(RAIL_PHASE.OPENING);
  });
  it("REVEALING (content in motion, width already full) + collapse request -> HIDING, never touching width", () => {
    // Content reverses its fade from whatever opacity it currently has;
    // width stays at the expanded value throughout.
    expect(onDesiredChange(RAIL_PHASE.REVEALING, false)).toBe(RAIL_PHASE.HIDING);
  });
  it("HIDING (content in motion, width already full) + expand request -> REVEALING, never touching width", () => {
    expect(onDesiredChange(RAIL_PHASE.HIDING, true)).toBe(RAIL_PHASE.REVEALING);
  });
});

describe("onWidthTransitionEnd", () => {
  it("advances OPENING -> REVEALING when still headed to expanded", () => {
    expect(onWidthTransitionEnd(RAIL_PHASE.OPENING, true)).toBe(RAIL_PHASE.REVEALING);
  });
  it("advances CLOSING -> COLLAPSED when still headed to collapsed", () => {
    expect(onWidthTransitionEnd(RAIL_PHASE.CLOSING, false)).toBe(RAIL_PHASE.COLLAPSED);
  });
  it("is a no-op if the direction already flipped away (stale event guard)", () => {
    // We were OPENING, but desired is now false (already redirected to
    // CLOSING elsewhere) — a late/duplicate width-transitionend for the
    // OLD direction must not force us back into REVEALING.
    expect(onWidthTransitionEnd(RAIL_PHASE.OPENING, false)).toBe(RAIL_PHASE.OPENING);
  });
  it("is a no-op for phases with no pending width motion", () => {
    expect(onWidthTransitionEnd(RAIL_PHASE.EXPANDED, true)).toBe(RAIL_PHASE.EXPANDED);
    expect(onWidthTransitionEnd(RAIL_PHASE.HIDING, false)).toBe(RAIL_PHASE.HIDING);
  });
});

describe("onContentTransitionEnd", () => {
  it("advances REVEALING -> EXPANDED when still headed to expanded", () => {
    expect(onContentTransitionEnd(RAIL_PHASE.REVEALING, true)).toBe(RAIL_PHASE.EXPANDED);
  });
  it("advances HIDING -> CLOSING when still headed to collapsed (only now does width start shrinking)", () => {
    expect(onContentTransitionEnd(RAIL_PHASE.HIDING, false)).toBe(RAIL_PHASE.CLOSING);
  });
  it("is a no-op if the direction already flipped away (stale timer guard)", () => {
    expect(onContentTransitionEnd(RAIL_PHASE.REVEALING, false)).toBe(RAIL_PHASE.REVEALING);
  });
});

describe("railPhaseVisuals — width and content never move at the same time", () => {
  it("COLLAPSED: width collapsed, content hidden, tooltips enabled", () => {
    expect(railPhaseVisuals(RAIL_PHASE.COLLAPSED)).toEqual({ widthExpanded: false, contentVisible: false, tooltipsEnabled: true });
  });
  it("OPENING: width expanding, content still hidden, tooltips disabled", () => {
    expect(railPhaseVisuals(RAIL_PHASE.OPENING)).toEqual({ widthExpanded: true, contentVisible: false, tooltipsEnabled: false });
  });
  it("REVEALING: width already full, content now visible-target, tooltips disabled", () => {
    expect(railPhaseVisuals(RAIL_PHASE.REVEALING)).toEqual({ widthExpanded: true, contentVisible: true, tooltipsEnabled: false });
  });
  it("EXPANDED: width full, content visible, tooltips disabled", () => {
    expect(railPhaseVisuals(RAIL_PHASE.EXPANDED)).toEqual({ widthExpanded: true, contentVisible: true, tooltipsEnabled: false });
  });
  it("HIDING: width still full (unchanged), content hidden-target, tooltips disabled", () => {
    expect(railPhaseVisuals(RAIL_PHASE.HIDING)).toEqual({ widthExpanded: true, contentVisible: false, tooltipsEnabled: false });
  });
  it("CLOSING: width collapsing, content already hidden, tooltips disabled until COLLAPSED", () => {
    expect(railPhaseVisuals(RAIL_PHASE.CLOSING)).toEqual({ widthExpanded: false, contentVisible: false, tooltipsEnabled: false });
  });

  it("width and content transitions never overlap across any phase (the actual bug this task fixes)", () => {
    // For every phase, at most one of {width, content} differs from the
    // PREVIOUS phase in the natural forward cycle — i.e. they are never
    // both "in motion" at once. Walk the full forward cycle both ways.
    const forward = [RAIL_PHASE.COLLAPSED, RAIL_PHASE.OPENING, RAIL_PHASE.REVEALING, RAIL_PHASE.EXPANDED, RAIL_PHASE.HIDING, RAIL_PHASE.CLOSING, RAIL_PHASE.COLLAPSED];
    for (let i = 0; i < forward.length - 1; i++) {
      const a = railPhaseVisuals(forward[i]);
      const b = railPhaseVisuals(forward[i + 1]);
      const widthChanged = a.widthExpanded !== b.widthExpanded;
      const contentChanged = a.contentVisible !== b.contentVisible;
      expect(widthChanged && contentChanged).toBe(false);
    }
  });
});

describe("isContentInMotion", () => {
  it("is true only during REVEALING/HIDING", () => {
    expect(isContentInMotion(RAIL_PHASE.REVEALING)).toBe(true);
    expect(isContentInMotion(RAIL_PHASE.HIDING)).toBe(true);
    expect(isContentInMotion(RAIL_PHASE.COLLAPSED)).toBe(false);
    expect(isContentInMotion(RAIL_PHASE.OPENING)).toBe(false);
    expect(isContentInMotion(RAIL_PHASE.EXPANDED)).toBe(false);
    expect(isContentInMotion(RAIL_PHASE.CLOSING)).toBe(false);
  });
});

describe("full expand cycle never gets stuck", () => {
  it("COLLAPSED -> OPENING -> REVEALING -> EXPANDED, driven purely by desired=true plus the two transitionend advances", () => {
    let phase = RAIL_PHASE.COLLAPSED;
    phase = onDesiredChange(phase, true);
    expect(phase).toBe(RAIL_PHASE.OPENING);
    phase = onWidthTransitionEnd(phase, true);
    expect(phase).toBe(RAIL_PHASE.REVEALING);
    phase = onContentTransitionEnd(phase, true);
    expect(phase).toBe(RAIL_PHASE.EXPANDED);
  });

  it("EXPANDED -> HIDING -> CLOSING -> COLLAPSED, driven purely by desired=false plus the two transitionend advances", () => {
    let phase = RAIL_PHASE.EXPANDED;
    phase = onDesiredChange(phase, false);
    expect(phase).toBe(RAIL_PHASE.HIDING);
    phase = onContentTransitionEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.CLOSING);
    phase = onWidthTransitionEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.COLLAPSED);
  });

  it("rapid double-toggle (expand, then immediately collapse again) settles on COLLAPSED with no stuck intermediate", () => {
    let phase = RAIL_PHASE.COLLAPSED;
    phase = onDesiredChange(phase, true); // OPENING
    phase = onDesiredChange(phase, false); // redirected -> CLOSING before width ever finished
    expect(phase).toBe(RAIL_PHASE.CLOSING);
    phase = onWidthTransitionEnd(phase, false);
    expect(phase).toBe(RAIL_PHASE.COLLAPSED);
  });

  it("reversing twice in a row (expand, collapse, expand again) still resolves correctly", () => {
    let phase = RAIL_PHASE.COLLAPSED;
    phase = onDesiredChange(phase, true); // OPENING
    phase = onWidthTransitionEnd(phase, true); // REVEALING
    phase = onDesiredChange(phase, false); // HIDING (reverse mid-content-fade)
    phase = onDesiredChange(phase, true); // REVEALING again (reverse back)
    expect(phase).toBe(RAIL_PHASE.REVEALING);
    phase = onContentTransitionEnd(phase, true);
    expect(phase).toBe(RAIL_PHASE.EXPANDED);
  });
});
