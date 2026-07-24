import { describe, it, expect } from "vitest";
import {
  SIDEBAR_SHELL_DURATION_MS,
  SIDEBAR_SHELL_START_DELAY_MS,
  SIDEBAR_MENU_FADE_OUT_MS,
  SIDEBAR_MENU_FADE_IN_MS,
  SIDEBAR_INCOMING_REVEAL_DELAY_MS,
  SIDEBAR_SETTLE_MS,
  railVisuals,
} from "./sidebarTransition";

// SIDEBAR SOFT-OVERLAP TRANSITION — scenario coverage. Pure module (no
// DOM, no timers, no React), so every case below is a direct unit test.
// What CANNOT be unit-tested here (there's no discrete phase left to
// simulate — the actual choreography is just CSS transition-delay/
// duration left running concurrently) is verified manually via Playwright
// against the running dev server, matching this project's established
// convention:
//
//  - compact icons stay left-anchored throughout the whole sequence -> Playwright
//  - the two menus are never BOTH clearly readable at once           -> Playwright
//  - no long blank pause between outgoing fade and incoming fade      -> Playwright
//  - reversing direction mid-fade/mid-width animates smoothly          -> Playwright
//  - reduced-motion instant switch in a live browser                   -> Playwright
//  - focus/tooltip timing in a live browser                            -> Playwright

describe("timing constants", () => {
  it("SIDEBAR_SETTLE_MS is derived from the incoming reveal delay + fade-in duration, not a separate magic number", () => {
    expect(SIDEBAR_SETTLE_MS).toBe(SIDEBAR_INCOMING_REVEAL_DELAY_MS + SIDEBAR_MENU_FADE_IN_MS);
  });
  it("the shell width finishes before the whole sequence settles (width should never still be moving once interactions enable)", () => {
    expect(SIDEBAR_SHELL_START_DELAY_MS + SIDEBAR_SHELL_DURATION_MS).toBeLessThan(SIDEBAR_SETTLE_MS);
  });
  it("the incoming reveal starts before the shell width has finished (the overlap this task asks for)", () => {
    expect(SIDEBAR_INCOMING_REVEAL_DELAY_MS).toBeLessThan(SIDEBAR_SHELL_START_DELAY_MS + SIDEBAR_SHELL_DURATION_MS);
  });
  it("total settle time is within the requested ~175-200ms budget", () => {
    expect(SIDEBAR_SETTLE_MS).toBeGreaterThanOrEqual(175);
    expect(SIDEBAR_SETTLE_MS).toBeLessThanOrEqual(200);
  });
});

describe("railVisuals — expanding (desiredExpanded=true)", () => {
  it("targets: width expanded, compact hidden, expanded visible", () => {
    const v = railVisuals(true, true);
    expect(v.widthExpanded).toBe(true);
    expect(v.compactOpacity).toBe(0);
    expect(v.expandedOpacity).toBe(1);
  });
  it("mid-transition (not yet settled): neither layer is interactive", () => {
    const v = railVisuals(true, false);
    expect(v.compactInteractive).toBe(false);
    expect(v.expandedInteractive).toBe(false);
  });
  it("settled: expanded is interactive, compact is not", () => {
    const v = railVisuals(true, true);
    expect(v.compactInteractive).toBe(false);
    expect(v.expandedInteractive).toBe(true);
  });
  it("compact (the outgoing layer) fades out immediately, no delay", () => {
    const v = railVisuals(true, true);
    expect(v.compactTiming).toEqual({ durationMs: SIDEBAR_MENU_FADE_OUT_MS, delayMs: 0 });
  });
  it("expanded (the incoming layer) reveals after the incoming-reveal delay", () => {
    const v = railVisuals(true, true);
    expect(v.expandedTiming).toEqual({ durationMs: SIDEBAR_MENU_FADE_IN_MS, delayMs: SIDEBAR_INCOMING_REVEAL_DELAY_MS });
  });
});

describe("railVisuals — collapsing (desiredExpanded=false)", () => {
  it("targets: width collapsed, expanded hidden, compact visible", () => {
    const v = railVisuals(false, true);
    expect(v.widthExpanded).toBe(false);
    expect(v.compactOpacity).toBe(1);
    expect(v.expandedOpacity).toBe(0);
  });
  it("mid-transition (not yet settled): neither layer is interactive", () => {
    const v = railVisuals(false, false);
    expect(v.compactInteractive).toBe(false);
    expect(v.expandedInteractive).toBe(false);
  });
  it("settled: compact is interactive, expanded is not", () => {
    const v = railVisuals(false, true);
    expect(v.compactInteractive).toBe(true);
    expect(v.expandedInteractive).toBe(false);
  });
  it("expanded (the outgoing layer) fades out immediately, no delay", () => {
    const v = railVisuals(false, true);
    expect(v.expandedTiming).toEqual({ durationMs: SIDEBAR_MENU_FADE_OUT_MS, delayMs: 0 });
  });
  it("compact (the incoming layer) reveals after the incoming-reveal delay", () => {
    const v = railVisuals(false, true);
    expect(v.compactTiming).toEqual({ durationMs: SIDEBAR_MENU_FADE_IN_MS, delayMs: SIDEBAR_INCOMING_REVEAL_DELAY_MS });
  });
});

describe("railVisuals — never both interactive, never both exposed to assistive tech at once", () => {
  it("across every (desiredExpanded, settled) combination, at most one layer is ever interactive", () => {
    for (const desiredExpanded of [true, false]) {
      for (const settled of [true, false]) {
        const v = railVisuals(desiredExpanded, settled);
        const bothInteractive = v.compactInteractive && v.expandedInteractive;
        expect(bothInteractive).toBe(false);
      }
    }
  });

  it("across every combination, at most one layer's TARGET opacity is 1 (the other's target is always 0)", () => {
    for (const desiredExpanded of [true, false]) {
      for (const settled of [true, false]) {
        const v = railVisuals(desiredExpanded, settled);
        const bothTargetVisible = v.compactOpacity === 1 && v.expandedOpacity === 1;
        expect(bothTargetVisible).toBe(false);
      }
    }
  });
});
