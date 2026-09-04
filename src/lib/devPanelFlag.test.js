import { describe, it, expect, afterEach, vi } from "vitest";

// DEV_PANEL_ENABLED is resolved once at module load from
// VITE_ENABLE_DEV_PANEL, so every case re-imports the module with a fresh
// env — same pattern as packages/shared/chains.test.js. The behaviour is
// deliberately asymmetric: the panel being reachable in production is the
// unsafe/exposed state, so ANY value that isn't exactly 'true' (unset,
// empty, 'false', a typo) must leave it disabled.
async function loadFlag(value) {
  vi.resetModules();
  if (value === undefined) vi.stubEnv("VITE_ENABLE_DEV_PANEL", "");
  else vi.stubEnv("VITE_ENABLE_DEV_PANEL", value);
  return import("./devPanelFlag.js");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("DEV_PANEL_ENABLED", () => {
  it("defaults to disabled when the flag is unset", async () => {
    const m = await loadFlag(undefined);
    expect(m.DEV_PANEL_ENABLED).toBe(false);
  });

  it("enables only for exactly 'true'", async () => {
    const m = await loadFlag("true");
    expect(m.DEV_PANEL_ENABLED).toBe(true);
  });

  it.each(["TRUE", "True", "  true  "])("accepts %s (case/whitespace tolerant)", async (value) => {
    const m = await loadFlag(value);
    expect(m.DEV_PANEL_ENABLED).toBe(true);
  });

  it.each(["false", "FALSE", "", "yes", "1", "enabled", "undefined"])(
    "stays disabled for %s",
    async (value) => {
      const m = await loadFlag(value);
      expect(m.DEV_PANEL_ENABLED).toBe(false);
    },
  );
});
