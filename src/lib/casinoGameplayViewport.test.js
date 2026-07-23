import { describe, it, expect } from "vitest";
import { classifyViewport, classifyOrientation, needsRotateHint } from "./casinoGameplayViewport";

// GAME CONTAINER AND MOBILE FULL-SCREEN GAMEPLAY — scenario coverage. These
// three are the only pure, DOM-free logic this task introduces (everything
// else — the frame's actual sizing/safe-area/scroll-lock behavior — is CSS,
// verified manually via Playwright against the running dev server, matching
// this project's established testing stack; see CasinoCatalog.test.js):
//
//  1.  768px is the one shared mobile/desktop boundary            -> below
//  2.  Orientation is a plain width-vs-height comparison            -> below
//  3.  Rotate hint only fires for a game that explicitly declares
//      itself landscape-only, and only in portrait                  -> below
//      (no game in the real catalog sets this today — see
//      needsRotateHint's own comment on why that's correct, not a gap)

describe("classifyViewport", () => {
  it("treats anything under 768px as mobile", () => {
    expect(classifyViewport(320)).toBe("mobile");
    expect(classifyViewport(767)).toBe("mobile");
  });
  it("treats 768px and up as desktop", () => {
    expect(classifyViewport(768)).toBe("desktop");
    expect(classifyViewport(1920)).toBe("desktop");
  });
});

describe("classifyOrientation", () => {
  it("classifies wider-than-tall as landscape", () => {
    expect(classifyOrientation(932, 430)).toBe("landscape");
    expect(classifyOrientation(800, 800)).toBe("landscape"); // square counts as landscape (width >= height)
  });
  it("classifies taller-than-wide as portrait", () => {
    expect(classifyOrientation(390, 844)).toBe("portrait");
  });
});

describe("needsRotateHint", () => {
  it("is false when the game has no orientation metadata (every real game today)", () => {
    expect(needsRotateHint({ favId: "provider:crash" }, "portrait")).toBe(false);
  });
  it("is false in landscape even for a landscape-only game", () => {
    expect(needsRotateHint({ favId: "provider:x", orientation: "landscape" }, "landscape")).toBe(false);
  });
  it("is true only for a landscape-only game viewed in portrait", () => {
    expect(needsRotateHint({ favId: "provider:x", orientation: "landscape" }, "portrait")).toBe(true);
  });
  it("is false when there is no game at all (unavailable/not-found states)", () => {
    expect(needsRotateHint(null, "portrait")).toBe(false);
  });
});
