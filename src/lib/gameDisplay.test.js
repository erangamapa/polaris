import { describe, it, expect } from "vitest";
import { getGameDisplayMetadata, DISPLAY_PROFILE, VIEWPORT_PROFILES } from "./gameDisplay";
import { ALL_GAMES } from "@/components/casino/CasinoCatalog";

// TRIBET GAME DISPLAY SYSTEM — scenario coverage. Pure metadata-resolution
// module (no DOM), so every case below is a direct unit test. What CANNOT
// be unit-tested here (does the content-box actually render at the
// derived size, does a fullscreen button actually appear/work in a real
// browser) is verified manually via Playwright against the running dev
// server.
//
// GAME_OVERRIDES is empty now — the BetSwirl on-chain games and the
// placeholder provider games it had confirmed-by-evidence entries for have
// been removed. Every game (all BGaming now) resolves to the FLEXIBLE
// default until a specific `bgaming:<slug>` override is added.

describe("getGameDisplayMetadata — default profile (no override)", () => {
  it("assigns the flexible profile and iframe implementation to any game with no override", () => {
    const meta = getGameDisplayMetadata({ favId: "bgaming:aloha-king-elvis", kind: "provider", studio: "BGaming" });
    expect(meta.displayProfile).toBe(DISPLAY_PROFILE.FLEXIBLE);
    expect(meta.implementation).toBe("iframe");
    expect(meta.sizingMode).toBe("fill");
    expect(meta.contentBoxMaxWidthPx).toBe(1100);
    expect(meta.contentBoxMaxHeightPx).toBe(720);
  });

  it("resolves provider from providerId, falling back to studio, falling back to bgaming", () => {
    expect(getGameDisplayMetadata({ favId: "a", providerId: "provider-9" }).provider).toBe("provider-9");
    expect(getGameDisplayMetadata({ favId: "a", studio: "BGaming" }).provider).toBe("BGaming");
    expect(getGameDisplayMetadata({ favId: "a" }).provider).toBe("bgaming");
  });

  it("provider games without a specific override default every providerControls field to false (never assumed)", () => {
    const meta = getGameDisplayMetadata({ favId: "bgaming:aloha-king-elvis", kind: "provider" });
    expect(meta.providerControls).toEqual({ close: false, fullscreen: false, sound: false, help: false, history: false });
  });
});

describe("getGameDisplayMetadata — host controls contract", () => {
  it("close, favorite, and gameInfo are always available regardless of profile", () => {
    const meta = getGameDisplayMetadata({ favId: "bgaming:aloha-king-elvis", kind: "provider" });
    expect(meta.hostControls.close).toBe(true);
    expect(meta.hostControls.favorite).toBe(true);
    expect(meta.hostControls.gameInfo).toBe(true);
  });

  it("the flexible default profile enables host fullscreen by default", () => {
    expect(getGameDisplayMetadata({ favId: "bgaming:aloha-king-elvis", kind: "provider" }).hostControls.fullscreen).toBe(true);
  });

  it("handles an unknown/missing game gracefully (no id, defaults to flexible, no throw)", () => {
    expect(() => getGameDisplayMetadata(null)).not.toThrow();
    const meta = getGameDisplayMetadata(null);
    expect(meta.displayProfile).toBe(DISPLAY_PROFILE.FLEXIBLE);
    expect(meta.id).toBeNull();
  });
});

describe("every real catalog game resolves to a valid, complete metadata object", () => {
  it("ALL_GAMES entries each produce a metadata object with every required field present", () => {
    expect(ALL_GAMES.length).toBeGreaterThan(0);
    for (const game of ALL_GAMES) {
      const meta = getGameDisplayMetadata(game);
      expect(meta.id).toBe(game.favId);
      expect(Object.values(DISPLAY_PROFILE)).toContain(meta.displayProfile);
      expect(VIEWPORT_PROFILES[meta.displayProfile]).toBeTruthy();
      expect(typeof meta.hostControls.close).toBe("boolean");
      expect(typeof meta.providerControls.sound).toBe("boolean");
    }
  });
});
