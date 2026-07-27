import { test, expect } from "@playwright/test";

// Regression test for the GAME PAGE REPAIR pass (see CasinoGamePage.jsx,
// GameStage.jsx, GameHeader.jsx, GameToolbar.jsx, ArenaContentStage.jsx).
// Covers the concrete bugs that pass fixed: the iframe/game stage
// collapsing to a shallow strip, the removed header thumbnail, the dev-only
// debug overlay leaking into a plain `npm run dev` session, shell/DOM
// identity across a game open/close, and scroll-position restoration.

const DEV_MOCK_KEY = "tribet-dev-panel-state";

async function installIdentityTracker(page) {
  await page.evaluate(() => {
    window.__shellIds = window.__shellIds || new WeakMap();
    window.__counter = window.__counter ?? 0;
    window.__idFor = (el) => {
      if (!el) return null;
      if (!window.__shellIds.has(el)) window.__shellIds.set(el, window.__counter++);
      return window.__shellIds.get(el);
    };
    ["shell-row", "main-content", "sidebar"].forEach((tid) => {
      const el = document.querySelector(`[data-test-id="${tid}"]`) || document.querySelector(`#${tid}`);
      if (el) window.__idFor(el);
    });
  });
}

async function shellIdentity(page) {
  return page.evaluate(() => ({
    shellRow: window.__idFor(document.querySelector('[data-test-id="shell-row"]')),
    mainFrame: window.__idFor(document.querySelector('[data-test-id="main-content"]')),
  }));
}

test.describe("Casino game page — stage sizing", () => {
  test("game stage dominates the viewport (>=50% of viewport height, not a shallow strip)", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    const stage = page.locator('[data-test-id="game-stage"]');
    await expect(stage).toBeVisible();
    await page.waitForTimeout(500); // provider iframe onLoad -> READY

    const viewport = page.viewportSize();
    const stageBox = await stage.boundingBox();
    expect(stageBox.height).toBeGreaterThan(viewport.height * 0.5);

    // The iframe itself must actually fill the stage, not sit collapsed at
    // its ~150px UA default inside a taller box.
    const iframeBox = await page.locator('[data-test-id="provider-iframe-tumble"]').boundingBox();
    expect(iframeBox.height).toBeGreaterThan(400);
  });

  test("hero height (Header+Stage+Toolbar) is identical across READY and an error state — loading never collapses the page", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const readyHeight = await page.locator('[data-test-id="casino-game-hero"]').evaluate((el) => el.getBoundingClientRect().height);

    await page.evaluate((key) => {
      const state = JSON.parse(sessionStorage.getItem(key) || "{}");
      sessionStorage.setItem(key, JSON.stringify({ ...state, version: 2, gameStatus: "provider-error" }));
    }, DEV_MOCK_KEY);
    await page.reload();
    await page.waitForTimeout(500);
    const errorHeight = await page.locator('[data-test-id="casino-game-hero"]').evaluate((el) => el.getBoundingClientRect().height);

    expect(Math.abs(errorHeight - readyHeight)).toBeLessThanOrEqual(1);
  });

  test("recommendations render below the hero block, not competing with the game for the first viewport", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);
    const heroBox = await page.locator('[data-test-id="casino-game-hero"]').boundingBox();
    const recsBox = await page.locator('[data-test-id="game-recommendations"]').first().boundingBox().catch(() => null);
    if (recsBox) {
      expect(recsBox.y).toBeGreaterThanOrEqual(heroBox.y + heroBox.height - 1);
    }
  });
});

test.describe("Casino game page — header and toolbar", () => {
  test("header has no thumbnail — only back, name/provider, favorite, and menu", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    const header = page.locator('[data-test-id="game-header"]');
    await expect(header).toBeVisible();
    // No image/background-image-bearing decorative element between back and name.
    const thumbCount = await header.locator("img, [style*='background-image']").count();
    expect(thumbCount).toBe(0);
    await expect(header.locator('[data-test-id="game-header-back"]')).toBeVisible();
    await expect(header.locator('[data-test-id="game-header-menu"]')).toBeVisible();
  });

  test("toolbar buttons share one consistent height and are left-aligned in a single row", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const toolbar = page.locator('[data-test-id="game-toolbar"]');
    const buttons = toolbar.locator("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(3);

    const boxes = await Promise.all(
      Array.from({ length: count }, (_, i) => buttons.nth(i).boundingBox())
    );
    const heights = boxes.map((b) => Math.round(b.height));
    expect(new Set(heights).size).toBe(1); // all buttons the exact same height

    // Single row: every button shares the same vertical band.
    const tops = boxes.map((b) => Math.round(b.y));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  });
});

test.describe("Casino game page — debug overlay gating", () => {
  test("Arena Stage debug overlay is hidden by default", async ({ page }) => {
    await page.goto("/casino/lobby");
    await page.waitForTimeout(300);
    await expect(page.locator('[data-test-id="arena-stage-debug-overlay"]')).toHaveCount(0);
  });

  test("Arena Stage debug overlay appears only after explicit Dev Panel opt-in", async ({ page }) => {
    await page.goto("/casino/lobby");
    await page.evaluate((key) => {
      const state = JSON.parse(sessionStorage.getItem(key) || "{}");
      sessionStorage.setItem(key, JSON.stringify({ ...state, version: 2, arenaDebug: true }));
    }, DEV_MOCK_KEY);
    await page.reload();
    await page.waitForTimeout(300);
    await expect(page.locator('[data-test-id="arena-stage-debug-overlay"]')).toHaveCount(1);
  });
});

test.describe("Casino game page — shell persistence and routing", () => {
  test("AppShell (shell-row, main-content) never remounts when opening or closing a game", async ({ page }) => {
    await page.goto("/casino/lobby");
    await installIdentityTracker(page);
    const before = await shellIdentity(page);

    await page.locator('[data-test-id="game-card-provider-tumble"]').first().click();
    await page.waitForTimeout(500);
    const duringGame = await shellIdentity(page);

    await page.locator('[data-test-id="game-header-back"]').click();
    await page.waitForTimeout(300);
    const afterClose = await shellIdentity(page);

    expect(duringGame.shellRow).toBe(before.shellRow);
    expect(duringGame.mainFrame).toBe(before.mainFrame);
    expect(afterClose.shellRow).toBe(before.shellRow);
    expect(afterClose.mainFrame).toBe(before.mainFrame);
  });

  test("Back restores the scroll position the lobby had before the game was launched", async ({ page }) => {
    await page.goto("/casino/lobby");
    const main = page.locator('[data-test-id="main-content"]');
    await main.evaluate((el) => el.scrollTo(0, 900));
    await page.waitForTimeout(100);

    await page.locator('[data-test-id="game-card-provider-tumble"]').first().click();
    await page.waitForTimeout(600);
    await page.locator('[data-test-id="game-header-back"]').click();
    await page.waitForTimeout(500);

    const scrollTop = await main.evaluate((el) => el.scrollTop);
    expect(scrollTop).toBe(900);
  });
});

test.describe("Casino game page — fullscreen and theatre mode", () => {
  test("Fullscreen removes GameStage's width/height caps and engages the real Fullscreen API", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);
    await page.locator('[data-test-id="game-toolbar-fullscreen"]').click();
    await page.waitForTimeout(300);

    const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);
    const stageClass = await page.locator('[data-test-id="game-stage"]').getAttribute("class");
    expect(stageClass).not.toMatch(/md:h-|md:max-h|md:w-/);
  });

  test("Theatre mode keeps header, sidebar, and wallet visible — it never hides the shell", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);
    await page.locator('[data-test-id="game-toolbar-theatre"]').click();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-test-id="shell-row"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /connect wallet/i })).toBeVisible();
    await expect(page.locator('[data-test-id="game-header"]')).toBeVisible();
  });
});
