import { describe, it, expect, vi, afterEach } from "vitest";
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

// INACTIVE-ARENA POLISH PASS — resolveEffectivePlatformScope resolved once
// at module load from VITE_ENABLE_DEV_PANEL/VITE_APP_MODE (via
// devPanelFlag.js/@shared/chains), so every case re-imports the module
// with a fresh env, same pattern as chains.test.js/devPanelFlag.test.js.
// The scenario this pins: previously, Sidebar.jsx/MobileBottomNav.jsx/
// PromoStrip.jsx each independently fell back to a hardcoded "full" here
// instead of the real APP_MODE whenever the Dev Panel was off — silently
// making Predictions/Sports look available in production. This must never
// regress back to that.
async function loadResolver(enableDevPanel, appMode) {
  vi.resetModules();
  vi.stubEnv("VITE_ENABLE_DEV_PANEL", enableDevPanel ?? "");
  vi.stubEnv("VITE_APP_MODE", appMode ?? "");
  return import("./platformScope.js");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("resolveEffectivePlatformScope", () => {
  it("falls back to the real APP_MODE (not a hardcoded value) when the Dev Panel is off", async () => {
    const m = await loadResolver("false", "mvp");
    expect(m.resolveEffectivePlatformScope({ platformScope: "full" })).toBe("mvp");
  });

  it("still falls back to mvp (never a hardcoded 'full') when APP_MODE is also unset", async () => {
    const m = await loadResolver("false", undefined);
    expect(m.resolveEffectivePlatformScope({ platformScope: "full" })).toBe("mvp");
  });

  it("reads the live devMock toggle when the Dev Panel is on", async () => {
    const m = await loadResolver("true", "mvp");
    expect(m.resolveEffectivePlatformScope({ platformScope: "full" })).toBe("full");
    expect(m.resolveEffectivePlatformScope({ platformScope: "mvp" })).toBe("mvp");
  });
});
