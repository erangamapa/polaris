import { test, expect } from "@playwright/test";

// Regression test for the Stable Arena Content Stage (see
// src/components/shell/ArenaContentStage.jsx) — the crossfade
// architecture that replaced the plain key-swap render for Casino/
// Predictions/Sports leg switching. Asserts the shared shell/stage never
// moves during a switch, both content layers never simultaneously
// contribute to layout, and shell DOM nodes are never remounted.

const TOLERANCE_PX = 1;

async function gotoArena(page, path) {
  await page.goto(path);
  await page.waitForSelector('[data-test-id="arena-content-stage"]');
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

async function installIdentityTracker(page) {
  await page.evaluate(() => {
    window.__shellIds = window.__shellIds || new WeakMap();
    window.__counter = window.__counter ?? 0;
    window.__idFor = (el) => {
      if (!el) return null;
      if (!window.__shellIds.has(el)) window.__shellIds.set(el, window.__counter++);
      return window.__shellIds.get(el);
    };
    ["shell-row", "main-content", "arena-content-stage"].forEach((tid) =>
      window.__idFor(document.querySelector(`[data-test-id="${tid}"]`))
    );
  });
}

async function identitySnapshot(page) {
  return page.evaluate(() => ({
    shellRow: window.__idFor(document.querySelector('[data-test-id="shell-row"]')),
    mainFrame: window.__idFor(document.querySelector('[data-test-id="main-content"]')),
    stage: window.__idFor(document.querySelector('[data-test-id="arena-content-stage"]')),
  }));
}

async function snapshot(page) {
  return page.evaluate(() => {
    const rectOf = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, width: r.width };
    };
    const layerInfo = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, width: r.width, position: getComputedStyle(el).position, opacity: getComputedStyle(el).opacity };
    };
    return {
      shellRow: rectOf('[data-test-id="shell-row"]'),
      mainFrame: rectOf('[data-test-id="main-content"]'),
      stage: rectOf('[data-test-id="arena-content-stage"]'),
      incoming: layerInfo('[data-test-id="arena-stage-incoming"]'),
      outgoing: layerInfo('[data-test-id="arena-stage-outgoing"]'),
    };
  });
}

function assertShellStable(before, after, label) {
  for (const key of ["shellRow", "mainFrame", "stage"]) {
    const b = before[key];
    const a = after[key];
    expect(b, `${key} should exist before switch`).toBeTruthy();
    expect(a, `${key} should exist at ${label}`).toBeTruthy();
    expect(Math.abs(a.x - b.x), `${key}.x moved by ${Math.abs(a.x - b.x)}px at ${label} (before=${b.x}, after=${a.x})`).toBeLessThanOrEqual(TOLERANCE_PX);
    expect(Math.abs(a.width - b.width), `${key}.width changed by ${Math.abs(a.width - b.width)}px at ${label}`).toBeLessThanOrEqual(TOLERANCE_PX);
  }
}

async function switchAndMeasure(page, arenaId, { reducedMotion = false } = {}) {
  const before = await snapshot(page);
  const idBefore = await identitySnapshot(page);

  await clickArena(page, arenaId);

  const immediate = await snapshot(page);
  assertShellStable(before, immediate, "immediately after click");
  expect(immediate.incoming, "no frame may have a missing content layer (immediate)").toBeTruthy();

  await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));
  const afterRaf1 = await snapshot(page);
  assertShellStable(before, afterRaf1, "+1 frame");
  expect(afterRaf1.incoming, "no frame may have a missing content layer (+1 frame)").toBeTruthy();

  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const afterRaf2 = await snapshot(page);
  assertShellStable(before, afterRaf2, "+2 frames");
  expect(afterRaf2.incoming, "no frame may have a missing content layer (+2 frames)").toBeTruthy();

  if (!reducedMotion) {
    await page.waitForTimeout(60);
    const midway = await snapshot(page);
    assertShellStable(before, midway, "midway through crossfade");
    if (midway.outgoing) {
      expect(midway.outgoing.position, "outgoing layer must be position:absolute — never contributing to layout width alongside incoming").toBe("absolute");
    }
  }

  await page.waitForTimeout(300);
  const settled = await snapshot(page);
  assertShellStable(before, settled, "fully settled");
  expect(settled.outgoing, "outgoing layer must be removed once settled").toBeFalsy();
  expect(settled.incoming?.opacity, "incoming layer must have fully faded in once settled").toBe("1");

  const idAfter = await identitySnapshot(page);
  expect(idAfter.shellRow, "shell-row DOM node must not be remounted").toBe(idBefore.shellRow);
  expect(idAfter.mainFrame, "main-content DOM node must not be remounted").toBe(idBefore.mainFrame);
  expect(idAfter.stage, "arena-content-stage DOM node must not be remounted").toBe(idBefore.stage);
}

for (const width of [1024, 1280, 1440, 1920]) {
  test(`no shell/stage movement across Casino->Predictions->Sports->Casino @ ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await gotoArena(page, "/casino/lobby");
    await installIdentityTracker(page);
    for (const arena of ["predictions", "sports", "casino"]) {
      await switchAndMeasure(page, arena);
    }
  });
}

test("no shell/stage movement, sidebar collapsed @ 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoArena(page, "/casino/lobby");
  const toggleBtn = page.locator('header button[aria-label="Collapse menu"], header button[aria-label="Expand menu"]');
  await toggleBtn.click();
  await page.waitForTimeout(500);
  await installIdentityTracker(page);
  for (const arena of ["predictions", "sports", "casino"]) {
    await switchAndMeasure(page, arena);
  }
});

test("short page -> long page -> short page: stage height never collapses or clips", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoArena(page, "/predictions/trending"); // short
  await installIdentityTracker(page);
  await switchAndMeasure(page, "sports"); // long
  await switchAndMeasure(page, "predictions"); // short again
});

test("direct route load renders each arena with sane, stable stage geometry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const path of ["/casino/lobby", "/predictions/trending", "/sports/home"]) {
    await gotoArena(page, path);
    const snap = await snapshot(page);
    expect(snap.stage).toBeTruthy();
    expect(snap.incoming).toBeTruthy();
    expect(snap.outgoing, "a fresh direct load must never show an outgoing layer").toBeFalsy();
  }
});

test("browser back/forward triggers the same stable crossfade, not a jump", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await gotoArena(page, "/casino/lobby");
  await installIdentityTracker(page);
  await switchAndMeasure(page, "predictions");
  await switchAndMeasure(page, "sports");

  const before = await snapshot(page);
  const idBefore = await identitySnapshot(page);
  await page.goBack();
  await page.waitForTimeout(400);
  const afterBack = await snapshot(page);
  assertShellStable(before, afterBack, "after browser back");

  await page.goForward();
  await page.waitForTimeout(400);
  const afterForward = await snapshot(page);
  assertShellStable(before, afterForward, "after browser forward");

  const idAfter = await identitySnapshot(page);
  expect(idAfter.shellRow).toBe(idBefore.shellRow);
  expect(idAfter.mainFrame).toBe(idBefore.mainFrame);
  expect(idAfter.stage).toBe(idBefore.stage);
});

test("prefers-reduced-motion: immediate stable swap, no lingering overlap", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await gotoArena(page, "/casino/lobby");
  await installIdentityTracker(page);
  await switchAndMeasure(page, "predictions", { reducedMotion: true });
  await switchAndMeasure(page, "sports", { reducedMotion: true });
  await context.close();
});
