import { describe, it, expect } from "vitest";
import {
  gameLaunchReducer, INITIAL_GAME_LAUNCH_STATE, GAME_LAUNCH_STATUS, FAILED_ERROR_CODE,
  isLaunchActive, isLoadingStatus,
} from "./casinoGameLaunch";
import { resolveLaunchOutcome } from "../components/casino/GameLaunchSurface";

// CASINO GAME LAUNCH STATE MACHINE — scenario coverage. This reducer is the
// one thing in the whole launch feature that's pure and DOM-free, so it's
// the one place a real automated regression test earns its keep; everything
// downstream (timers, analytics, focus, the actual overlay) is exercised
// manually via Playwright against the running dev server, matching this
// project's established testing stack (see CasinoCatalog.test.js's own
// comment on why: no jsdom/React Testing Library here):
//
//  1.  A request from idle opens the loading surface             -> below
//  2.  A duplicate request for the SAME in-flight game is ignored -> below (also: reducer returns the identical object reference, which is what stops useCasinoGameLaunch's effect from re-arming timers/re-firing analytics for it)
//  3.  A DIFFERENT game requested mid-launch supersedes cleanly     -> below (fresh attempt=1, no confirmation state)
//  4.  A stale LOADING/DELAYED/READY/FAILED for a superseded gameId is dropped -> below
//  5.  READY can't resurrect a launch that already failed or closed  -> below
//  6.  Retry only ever starts from FAILED, never from any other status -> below
//  7.  Close always returns to a clean idle state regardless of where it fired -> below
//  8.  Unavailable/not-found short-circuit straight to a terminal state -> below
//  9.  isLoadingStatus/isLaunchActive classify every status correctly    -> below
//  10. GameLaunchSurface's copy/action lookup covers every non-loading status -> below (verified against the task's own literal copy strings)

describe("gameLaunchReducer", () => {
  it("opens a fresh loading launch from idle", () => {
    const next = gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, {
      type: "REQUEST", gameId: "provider:crash", source: "home", categoryId: "Lobby", now: 1000,
    });
    expect(next.status).toBe(GAME_LAUNCH_STATUS.REQUESTED);
    expect(next.gameId).toBe("provider:crash");
    expect(next.source).toBe("home");
    expect(next.categoryId).toBe("Lobby");
    expect(next.attempt).toBe(1);
    expect(next.requestedAt).toBe(1000);
  });

  it("ignores a duplicate request for the same game while requested or loading", () => {
    const requested = gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "REQUEST", gameId: "provider:crash", now: 1 });
    const loading = gameLaunchReducer(requested, { type: "LOADING", gameId: "provider:crash" });

    const dupeWhileRequested = gameLaunchReducer(requested, { type: "REQUEST", gameId: "provider:crash", now: 2 });
    const dupeWhileLoading = gameLaunchReducer(loading, { type: "REQUEST", gameId: "provider:crash", now: 3 });

    // Same object reference, not just equal shape — this is what makes a
    // React effect keyed on this state bail out of re-running for a
    // duplicate click (see useCasinoGameLaunch.js's own comment on this).
    expect(dupeWhileRequested).toBe(requested);
    expect(dupeWhileLoading).toBe(loading);
  });

  it("supersedes cleanly when a different game is requested mid-launch, no confirmation state", () => {
    const loading = gameLaunchReducer(
      gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "REQUEST", gameId: "provider:crash", now: 1 }),
      { type: "LOADING", gameId: "provider:crash" }
    );
    const superseded = gameLaunchReducer(loading, { type: "REQUEST", gameId: "casino:dice", source: "search", now: 2 });

    expect(superseded.status).toBe(GAME_LAUNCH_STATUS.REQUESTED);
    expect(superseded.gameId).toBe("casino:dice");
    expect(superseded.attempt).toBe(1); // fresh attempt count for the new game, not inherited
    expect(superseded.delayed).toBe(false);
  });

  it("drops a stale LOADING/DELAYED/FAILED for a gameId that's no longer current", () => {
    const loadingA = gameLaunchReducer(
      gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "REQUEST", gameId: "provider:crash", now: 1 }),
      { type: "LOADING", gameId: "provider:crash" }
    );
    const loadingB = gameLaunchReducer(loadingA, { type: "REQUEST", gameId: "casino:dice", now: 2 });

    // A timer/callback from the superseded launch (A) arriving after B has
    // already taken over must not touch B's state at all.
    expect(gameLaunchReducer(loadingB, { type: "LOADING", gameId: "provider:crash" })).toBe(loadingB);
    expect(gameLaunchReducer(loadingB, { type: "DELAYED", gameId: "provider:crash" })).toBe(loadingB);
    expect(gameLaunchReducer(loadingB, { type: "FAILED", gameId: "provider:crash", errorCode: FAILED_ERROR_CODE.TIMEOUT })).toBe(loadingB);
  });

  it("READY cannot resurrect a launch that already failed or closed", () => {
    const loading = gameLaunchReducer(
      gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "REQUEST", gameId: "provider:crash", now: 1 }),
      { type: "LOADING", gameId: "provider:crash" }
    );
    const failed = gameLaunchReducer(loading, { type: "FAILED", gameId: "provider:crash", errorCode: FAILED_ERROR_CODE.TIMEOUT });
    const closed = gameLaunchReducer(loading, { type: "CLOSE" });

    // A slow iframe onLoad firing after the user already gave up (timed out)
    // or closed the surface must not flip it back to ready behind their back.
    expect(gameLaunchReducer(failed, { type: "READY", gameId: "provider:crash" })).toBe(failed);
    expect(gameLaunchReducer(closed, { type: "READY", gameId: "provider:crash" })).toBe(closed);
  });

  it("READY only applies to the matching in-flight gameId", () => {
    const loading = gameLaunchReducer(
      gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "REQUEST", gameId: "provider:crash", now: 1 }),
      { type: "LOADING", gameId: "provider:crash" }
    );
    expect(gameLaunchReducer(loading, { type: "READY", gameId: "casino:dice" })).toBe(loading);
    const ready = gameLaunchReducer(loading, { type: "READY", gameId: "provider:crash" });
    expect(ready.status).toBe(GAME_LAUNCH_STATUS.READY);
    expect(ready.errorCode).toBeNull();
  });

  it("retry only starts from FAILED, and increments the attempt count", () => {
    const idle = INITIAL_GAME_LAUNCH_STATE;
    expect(gameLaunchReducer(idle, { type: "RETRY", gameId: "provider:crash", now: 5 })).toBe(idle);

    const loading = gameLaunchReducer(
      gameLaunchReducer(idle, { type: "REQUEST", gameId: "provider:crash", now: 1 }),
      { type: "LOADING", gameId: "provider:crash" }
    );
    // Can't retry a launch that hasn't failed yet.
    expect(gameLaunchReducer(loading, { type: "RETRY", gameId: "provider:crash", now: 5 })).toBe(loading);

    const failed = gameLaunchReducer(loading, { type: "FAILED", gameId: "provider:crash", errorCode: FAILED_ERROR_CODE.INIT_FAILED });
    const retried = gameLaunchReducer(failed, { type: "RETRY", gameId: "provider:crash", now: 5 });
    expect(retried.status).toBe(GAME_LAUNCH_STATUS.REQUESTED);
    expect(retried.attempt).toBe(2);
    expect(retried.errorCode).toBeNull();
    expect(retried.delayed).toBe(false);
  });

  it("close always returns to a clean idle state", () => {
    const failed = gameLaunchReducer(
      gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "REQUEST", gameId: "provider:crash", now: 1 }),
      { type: "FAILED", gameId: "provider:crash", errorCode: FAILED_ERROR_CODE.TIMEOUT }
    );
    expect(gameLaunchReducer(failed, { type: "CLOSE" })).toEqual(INITIAL_GAME_LAUNCH_STATE);
  });

  it("unavailable and not-found short-circuit straight to a terminal state", () => {
    const unavailable = gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "UNAVAILABLE", gameId: "casino:wheel", source: "home" });
    expect(unavailable.status).toBe(GAME_LAUNCH_STATUS.UNAVAILABLE);
    expect(unavailable.gameId).toBe("casino:wheel");

    const notFound = gameLaunchReducer(INITIAL_GAME_LAUNCH_STATE, { type: "NOT_FOUND" });
    expect(notFound.status).toBe(GAME_LAUNCH_STATUS.NOT_FOUND);
    expect(notFound.gameId).toBeNull();
  });
});

describe("isLoadingStatus / isLaunchActive", () => {
  it("only requested/loading count as loading", () => {
    expect(isLoadingStatus(GAME_LAUNCH_STATUS.REQUESTED)).toBe(true);
    expect(isLoadingStatus(GAME_LAUNCH_STATUS.LOADING)).toBe(true);
    for (const s of [GAME_LAUNCH_STATUS.READY, GAME_LAUNCH_STATUS.FAILED, GAME_LAUNCH_STATUS.UNAVAILABLE, GAME_LAUNCH_STATUS.NOT_FOUND, GAME_LAUNCH_STATUS.IDLE]) {
      expect(isLoadingStatus(s)).toBe(false);
    }
  });

  it("everything except idle counts as an active launch", () => {
    expect(isLaunchActive(GAME_LAUNCH_STATUS.IDLE)).toBe(false);
    for (const s of [GAME_LAUNCH_STATUS.REQUESTED, GAME_LAUNCH_STATUS.LOADING, GAME_LAUNCH_STATUS.READY, GAME_LAUNCH_STATUS.FAILED, GAME_LAUNCH_STATUS.UNAVAILABLE, GAME_LAUNCH_STATUS.NOT_FOUND]) {
      expect(isLaunchActive(s)).toBe(true);
    }
  });
});

describe("resolveLaunchOutcome", () => {
  it("matches the task's exact customer-safe copy for every terminal status", () => {
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.UNAVAILABLE })).toEqual({
      heading: "Game unavailable", message: "This game is not available right now.", actions: ["browse", "close"],
    });
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.NOT_FOUND })).toEqual({
      heading: "Game not found", message: "The game link may be invalid or no longer available.", actions: ["browse", "back"],
    });
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.FAILED, errorCode: FAILED_ERROR_CODE.TIMEOUT })).toEqual({
      heading: "Game took too long to load", message: "Check your connection and try again.", actions: ["retry", "close"],
    });
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.FAILED, errorCode: FAILED_ERROR_CODE.INIT_FAILED })).toEqual({
      heading: "Unable to launch game", message: "We couldn't start this game. Try again or choose another game.", actions: ["retry", "browse", "close"],
    });
  });

  it("returns null for loading/ready/idle — those render their own branch, not a copy lookup", () => {
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.REQUESTED })).toBeNull();
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.LOADING })).toBeNull();
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.READY })).toBeNull();
    expect(resolveLaunchOutcome({ status: GAME_LAUNCH_STATUS.IDLE })).toBeNull();
  });
});
