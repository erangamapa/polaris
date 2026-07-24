import { describe, it, expect } from "vitest";
import { getGameDisplayMetadata, DISPLAY_PROFILE, VIEWPORT_PROFILES } from "./gameDisplay";
import { ALL_GAMES } from "@/components/casino/CasinoCatalog";

// TRIBET GAME DISPLAY SYSTEM — scenario coverage. Pure metadata-resolution
// module (no DOM), so every case below is a direct unit test. What CANNOT
// be unit-tested here (does the content-box actually render at the
// derived size, does a fullscreen button actually appear/work in a real
// browser) is verified manually via Playwright against the running dev
// server, matching this project's established convention:
//
//  - every game's content-box renders at its profile's declared size -> Playwright
//  - Tribet Originals render in a compact, non-stretched box            -> Playwright
//  - the fullscreen button toggles a real Fullscreen API state           -> Playwright
//  - no visible layout shift between loading and ready geometry           -> Playwright

describe("getGameDisplayMetadata — Tribet Originals (on-chain)", () => {
  it("assigns the compact profile to every on-chain BetSwirl game", () => {
    for (const favId of ["casino:dice", "casino:coin-toss", "casino:roulette", "casino:keno", "casino:wheel", "casino:plinko"]) {
      const meta = getGameDisplayMetadata({ favId, kind: "onchain" });
      expect(meta.displayProfile).toBe(DISPLAY_PROFILE.COMPACT);
      expect(meta.implementation).toBe("internal");
      expect(meta.provider).toBe("tribet-originals");
    }
  });

  it("compact profile uses intrinsic sizing, not a forced aspect ratio", () => {
    const meta = getGameDisplayMetadata({ favId: "casino:dice", kind: "onchain" });
    expect(meta.sizingMode).toBe("intrinsic");
    expect(meta.preferredAspectRatio).toBeNull();
  });

  it("compact profile's content-box is meaningfully narrower than the old universal 1100px box", () => {
    const meta = getGameDisplayMetadata({ favId: "casino:dice", kind: "onchain" });
    expect(meta.contentBoxMaxWidthPx).toBeLessThan(600);
  });

  it("does not enable fullscreen for a compact centered form by default", () => {
    const meta = getGameDisplayMetadata({ favId: "casino:dice", kind: "onchain" });
    expect(meta.hostControls.fullscreen).toBe(false);
    expect(meta.supportsFullscreen).toBe(false);
  });
});

describe("getGameDisplayMetadata — provider games with real evidence", () => {
  it("assigns landscape-wide to crash (evidence: max-width:1440px, .game-column layout)", () => {
    const meta = getGameDisplayMetadata({ favId: "provider:crash", kind: "provider", badge: "Tribet Studio" });
    expect(meta.displayProfile).toBe(DISPLAY_PROFILE.LANDSCAPE_WIDE);
    expect(meta.implementation).toBe("iframe");
  });

  it("assigns compact to nova-wheel (evidence: aspect-ratio:1 wheel, max-width:420px controls)", () => {
    const meta = getGameDisplayMetadata({ favId: "provider:nova-wheel", kind: "provider" });
    expect(meta.displayProfile).toBe(DISPLAY_PROFILE.COMPACT);
  });

  it("declares Vector Dice's own history/help modals so the host does not duplicate them", () => {
    const meta = getGameDisplayMetadata({ favId: "provider:dice", kind: "provider" });
    expect(meta.providerControls.history).toBe(true);
    expect(meta.providerControls.help).toBe(true);
  });

  it("declares Drunken Pirate's own sound control so the host does not duplicate it", () => {
    const meta = getGameDisplayMetadata({ favId: "provider:drunken-pirate", kind: "provider" });
    expect(meta.providerControls.sound).toBe(true);
  });

  it("every OTHER provider game defaults to the flexible profile (today's exact existing box, no invented shape)", () => {
    const unclassified = ["provider:coinflip", "provider:spacex-rush", "provider:tumble", "provider:coin-fighters", "provider:raiders-escape", "provider:keymines-v2", "provider:bubble-girl"];
    for (const favId of unclassified) {
      const meta = getGameDisplayMetadata({ favId, kind: "provider" });
      expect(meta.displayProfile).toBe(DISPLAY_PROFILE.FLEXIBLE);
      expect(meta.contentBoxMaxWidthPx).toBe(1100);
      expect(meta.contentBoxMaxHeightPx).toBe(720);
    }
  });

  it("provider games without confirmed internal controls default every providerControls field to false (never assumed)", () => {
    const meta = getGameDisplayMetadata({ favId: "provider:coinflip", kind: "provider" });
    expect(meta.providerControls).toEqual({ close: false, fullscreen: false, sound: false, help: false, history: false });
  });
});

describe("getGameDisplayMetadata — host controls contract", () => {
  it("close, favorite, and gameInfo are always available regardless of profile", () => {
    for (const favId of ["casino:dice", "provider:crash", "provider:coinflip"]) {
      const meta = getGameDisplayMetadata({ favId, kind: favId.startsWith("casino") ? "onchain" : "provider" });
      expect(meta.hostControls.close).toBe(true);
      expect(meta.hostControls.favorite).toBe(true);
      expect(meta.hostControls.gameInfo).toBe(true);
    }
  });

  it("landscape-wide and flexible profiles enable host fullscreen by default", () => {
    expect(getGameDisplayMetadata({ favId: "provider:crash", kind: "provider" }).hostControls.fullscreen).toBe(true);
    expect(getGameDisplayMetadata({ favId: "provider:coinflip", kind: "provider" }).hostControls.fullscreen).toBe(true);
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
