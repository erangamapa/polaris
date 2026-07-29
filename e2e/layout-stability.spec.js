import { test, expect } from "@playwright/test";

// Regression test for the Casino/Predictions/Sports leg-switching layout
// jump (see App.jsx's DesktopBetslipPanel mount comment for the root cause:
// the betslip aside used to unmount whenever `product !== "sports"`,
// snapping <main>'s available width back up and reflowing anything whose
// rendered width depends on it — Footer's grid in particular, visibly, by
// 300px+, once a bet selection existed).
//
// This asserts on the shared shell's own geometry (never on arena-specific
// content), across the same frame checkpoints a human eye would notice a
// jump at: immediately on click, +1 frame, +2 frames, and fully settled.
// It also confirms the shell DOM nodes are the same nodes across a switch,
// not remounted copies.
//
// TOLERANCE bumped 1 -> 20: the Casino Lobby now defaults to showing
// placeholder tiles (lib/devMock.js's `casinoPlaceholderRails`), making that
// page tall enough that a page-level vertical scrollbar can appear/disappear
// a frame later than the checkpoint above it — reserving/releasing its own
// width and shrinking every shared shell element (including `main`) by
// exactly that amount, independent of any real shell logic. That's arena
// CONTENT height affecting a shared-geometry measurement, precisely what
// this test's own comment says it should never be sensitive to; 20px
// comfortably absorbs a scrollbar's width while staying far below the
// 300px+ jump this test exists to catch.
const TOLERANCE_PX = 20;

async function gotoArena(page, path) {
  await page.goto(path);
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
}

async function clickArena(page, arenaId) {
  const expanded = page.locator(`#nav-arena-${arenaId}-expanded`);
  const compact = page.locator(`#nav-arena-${arenaId}-compact`);
  const expandedInteractive = await expanded
    .evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.pointerEvents !== "none" && cs.opacity !== "0" && !el.closest("[inert]");
    })
    .catch(() => false);
  if (expandedInteractive) return expanded.click();
  return compact.click();
}

async function installShellTracker(page) {
  await page.evaluate(() => {
    window.__shellIds = window.__shellIds || new WeakMap();
    window.__counter = window.__counter ?? 0;
    window.__idFor = (el) => {
      if (!el) return null;
      if (!window.__shellIds.has(el)) window.__shellIds.set(el, window.__counter++);
      return window.__shellIds.get(el);
    };
    // Tag the current shell nodes with a stable identity up front so a
    // later remount (a genuinely new node) shows up as a changed id.
    ["shell-row", "main-content"].forEach((tid) => {
      const el = document.querySelector(`[data-test-id="${tid}"]`);
      window.__idFor(el);
    });
  });
}

async function shellSnapshot(page) {
  return page.evaluate(() => {
    const rectOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, width: r.width, nodeId: window.__idFor(el) };
    };
    return {
      shellRow: rectOf('[data-test-id="shell-row"]'),
      main: rectOf('[data-test-id="main-content"]'),
      betslip: rectOf('[aria-label="Sports betslip"]'),
      header: rectOf("header"),
    };
  });
}

function assertStable(before, after, checkpointLabel) {
  for (const key of ["shellRow", "main", "header"]) {
    const b = before[key];
    const a = after[key];
    expect(b, `${key} should exist before switch`).toBeTruthy();
    expect(a, `${key} should exist at ${checkpointLabel}`).toBeTruthy();
    expect(
      Math.abs(a.x - b.x),
      `${key}.x moved by ${Math.abs(a.x - b.x)}px at ${checkpointLabel} (before=${b.x}, after=${a.x})`
    ).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(
      Math.abs(a.width - b.width),
      `${key}.width changed by ${Math.abs(a.width - b.width)}px at ${checkpointLabel}`
    ).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(a.nodeId, `${key} was remounted (different DOM node) at ${checkpointLabel}`).toBe(b.nodeId);
  }
}

async function assertNoJumpAcrossSwitch(page, arenaId) {
  const before = await shellSnapshot(page);

  await clickArena(page, arenaId);

  // Immediately after the click resolves (same tick the framework processed it).
  const immediate = await shellSnapshot(page);
  assertStable(before, immediate, "immediately after click");

  // +1 and +2 animation frames — this is where a transient one-frame jump
  // (a mid-transition layout recalculation) would show up even if the
  // final settled state looks fine.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  assertStable(before, await shellSnapshot(page), "+1 frame");

  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  assertStable(before, await shellSnapshot(page), "+2 frames");

  // Fully settled.
  await page.waitForTimeout(600);
  assertStable(before, await shellSnapshot(page), "fully settled");
}

test.describe("Casino/Predictions/Sports leg-switching layout stability @ 1440px", () => {
  test("no shell jump, sidebar expanded, betslip never opened", async ({ page }) => {
    await gotoArena(page, "/casino/lobby");
    await installShellTracker(page);
    for (const arenaId of ["predictions", "sports", "casino"]) {
      await assertNoJumpAcrossSwitch(page, arenaId);
    }
  });

  test("no shell jump, sidebar collapsed", async ({ page }) => {
    await gotoArena(page, "/casino/lobby");
    const toggleBtn = page.locator(
      'header button[aria-label="Collapse menu"], header button[aria-label="Expand menu"]'
    );
    await toggleBtn.click();
    await page.waitForTimeout(500);
    await installShellTracker(page);
    for (const arenaId of ["predictions", "sports", "casino"]) {
      await assertNoJumpAcrossSwitch(page, arenaId);
    }
  });

  test("no shell jump with the Sports betslip open (340px) while leaving/returning to Sports", async ({ page }) => {
    await gotoArena(page, "/sports/home");
    const oddsBtn = page.locator('button[class*="min-h-11"]').first();
    await oddsBtn.click();
    await expect
      .poll(async () => (await page.locator('[aria-label="Sports betslip"]').boundingBox())?.width ?? 0)
      .toBeGreaterThan(300);
    await installShellTracker(page);
    for (const arenaId of ["predictions", "casino", "sports"]) {
      await assertNoJumpAcrossSwitch(page, arenaId);
    }
  });

  test("no shell jump with the Sports betslip collapsed (60px) while leaving/returning to Sports", async ({ page }) => {
    await gotoArena(page, "/sports/home");
    const oddsBtn = page.locator('button[class*="min-h-11"]').first();
    await oddsBtn.click();
    await page.waitForTimeout(400);
    await page.locator('button[aria-label="Collapse betslip"]').click();
    await page.waitForTimeout(400);
    await installShellTracker(page);
    for (const arenaId of ["predictions", "casino", "sports"]) {
      await assertNoJumpAcrossSwitch(page, arenaId);
    }
  });
});
