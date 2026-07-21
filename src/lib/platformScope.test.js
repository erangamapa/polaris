import { describe, it, expect } from "vitest";
import { isArenaAllowed, resolveScopedProduct } from "./platformScope";

// This task's own scenarios are mostly rendering/routing behavior that needs
// a real DOM or a running app (see the project's established testing stack —
// no jsdom/React Testing Library, same constraint as every prior UI task
// this session). The pure decision logic these two functions capture is
// unit-tested here; everything else was verified manually via Playwright
// against the running dev server:
//
//  - MVP: Casino enabled, Sports/Predictions disabled       -> unit test + Playwright
//  - Full: all three enabled                                 -> unit test + Playwright
//  - Disabled arena controls do not navigate                  -> Playwright (click Sports/Predictions tab while MVP, product stays Casino)
//  - Direct Sports/Predictions routes redirect to Casino        -> Playwright (typed /sports, /predictions URLs while MVP)
//  - Switching to MVP while inside Sports/Predictions redirects   -> Playwright (opened Sports, then flipped Platform Scope to MVP in the panel)
//  - Reset all restores MVP                                        -> code review (DEFAULT_DEV_MOCK_STATE.platformScope — see devMock.js)
//  - Casino cannot be disabled                                      -> unit test (isArenaAllowed("casino", ...) always true)

describe("isArenaAllowed", () => {
  it("Casino is always allowed, in either scope", () => {
    expect(isArenaAllowed("casino", "mvp")).toBe(true);
    expect(isArenaAllowed("casino", "full")).toBe(true);
  });

  it("Sports and Predictions are blocked in MVP scope", () => {
    expect(isArenaAllowed("sports", "mvp")).toBe(false);
    expect(isArenaAllowed("predictions", "mvp")).toBe(false);
  });

  it("Sports and Predictions are allowed in Full scope", () => {
    expect(isArenaAllowed("sports", "full")).toBe(true);
    expect(isArenaAllowed("predictions", "full")).toBe(true);
  });
});

describe("resolveScopedProduct", () => {
  it("passes through an allowed product unchanged", () => {
    expect(resolveScopedProduct("casino", "mvp")).toBe("casino");
    expect(resolveScopedProduct("sports", "full")).toBe("sports");
    expect(resolveScopedProduct("predictions", "full")).toBe("predictions");
  });

  it("redirects a disallowed product to casino", () => {
    expect(resolveScopedProduct("sports", "mvp")).toBe("casino");
    expect(resolveScopedProduct("predictions", "mvp")).toBe("casino");
  });
});
