import { describe, it, expect } from "vitest";
import { nextLogoTapState, INITIAL_LOGO_TAP_STATE } from "./useDevPanelLogoTap";

// This task's own scenarios are mostly touch/DOM/toast/vibration behavior
// that needs a real device or a running app (see the project's established
// testing stack — no jsdom/React Testing Library, same constraint as every
// prior UI task this session). The pure tap-counting rule is unit-tested
// here; everything else was verified manually via Playwright against the
// running dev server, plus a production-build grep for the dev-only toast
// string:
//
//  - Triple-tap opens the panel                       -> Playwright
//  - Triple-tap again closes it                        -> Playwright
//  - 1 or 2 taps do nothing                              -> unit test + Playwright
//  - Taps spaced beyond 1.5s don't accumulate              -> unit test (window reset)
//  - A stray tap right after the 3rd doesn't re-toggle       -> unit test (cooldown) + Playwright
//  - Dev builds only — no-op / not in bundle in production     -> production build grep
//  - Toast "Developer Panel opened" shown only when opening      -> Playwright (not shown on the close leg)
//  - Normal single-tap logo behavior unaffected                    -> code review (logo has no other click handler to preserve)

describe("nextLogoTapState", () => {
  it("first tap starts a sequence without completing it", () => {
    const next = nextLogoTapState(INITIAL_LOGO_TAP_STATE, 1000);
    expect(next).toMatchObject({ tapCount: 1, firstTapAt: 1000, completed: false, ignored: false });
  });

  it("a second tap within the window extends the sequence", () => {
    const s1 = nextLogoTapState(INITIAL_LOGO_TAP_STATE, 1000);
    const s2 = nextLogoTapState(s1, 1200);
    expect(s2).toMatchObject({ tapCount: 2, firstTapAt: 1000, completed: false, ignored: false });
  });

  it("a third tap within the window completes the sequence and resets counters", () => {
    const s1 = nextLogoTapState(INITIAL_LOGO_TAP_STATE, 1000);
    const s2 = nextLogoTapState(s1, 1200);
    const s3 = nextLogoTapState(s2, 1400);
    expect(s3.completed).toBe(true);
    expect(s3.ignored).toBe(false);
    expect(s3.tapCount).toBe(0);
    expect(s3.firstTapAt).toBe(null);
    expect(s3.cooldownUntil).toBe(1400 + 400);
  });

  it("a tap arriving after the 1.5s window starts a fresh sequence instead of completing one", () => {
    const s1 = nextLogoTapState(INITIAL_LOGO_TAP_STATE, 1000);
    const s2 = nextLogoTapState(s1, 1200);
    // Third tap lands 2s after the first — outside the 1.5s window.
    const s3 = nextLogoTapState(s2, 3000);
    expect(s3.completed).toBe(false);
    expect(s3.tapCount).toBe(1);
    expect(s3.firstTapAt).toBe(3000);
  });

  it("taps during the post-toggle cooldown are ignored outright, not counted", () => {
    const s1 = nextLogoTapState(INITIAL_LOGO_TAP_STATE, 1000);
    const s2 = nextLogoTapState(s1, 1200);
    const s3 = nextLogoTapState(s2, 1400); // completes, cooldownUntil = 1800
    const s4 = nextLogoTapState(s3, 1500); // still within cooldown
    expect(s4.ignored).toBe(true);
    expect(s4.completed).toBe(false);
    // State is untouched while ignored, so the cooldown isn't extended by spam taps.
    expect(s4.tapCount).toBe(s3.tapCount);
    expect(s4.cooldownUntil).toBe(s3.cooldownUntil);
  });

  it("a tap after the cooldown expires starts counting normally again", () => {
    const s1 = nextLogoTapState(INITIAL_LOGO_TAP_STATE, 1000);
    const s2 = nextLogoTapState(s1, 1200);
    const s3 = nextLogoTapState(s2, 1400); // completes, cooldownUntil = 1800
    const s4 = nextLogoTapState(s3, 1900); // after cooldown
    expect(s4.ignored).toBe(false);
    expect(s4.completed).toBe(false);
    expect(s4.tapCount).toBe(1);
    expect(s4.firstTapAt).toBe(1900);
  });
});
