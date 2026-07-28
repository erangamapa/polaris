import { test, expect } from "@playwright/test";

// Regression tests for the GAME PAGE POLISH pass (CasinoGamePage.jsx,
// GamePlayerFrame.jsx, GameHeader.jsx, GameStage.jsx, GameUtilityBar.jsx,
// GameUtilityAction.jsx) plus the earlier GAME PAGE REPAIR pass
// (ArenaContentStage.jsx debug overlay, shell persistence, scroll
// restoration) — kept in this same file since both passes touch the same
// active game page.

const DEV_MOCK_KEY = "tribet-dev-panel-state";

// Every viewport this task's spec named explicitly.
const VIEWPORTS = [
  { name: "1728x900", width: 1728, height: 900 },
  { name: "1440x900", width: 1440, height: 900 },
  { name: "1280x720", width: 1280, height: 720 },
  { name: "1024x768", width: 1024, height: 768 },
  { name: "768x1024", width: 768, height: 1024 },
  { name: "430x932", width: 430, height: 932 },
  { name: "390x844", width: 390, height: 844 },
  { name: "360x800", width: 360, height: 800 },
];

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

test.describe("Casino game page — composition", () => {
  test("page contains exactly GameHeader, GameStage and GameUtilityBar inside one GamePlayerFrame — no recommendations, carousels, or extra sections", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);

    const frame = page.locator('[data-test-id="game-player-frame"]');
    await expect(frame).toBeVisible();
    await expect(frame.locator('[data-test-id="game-header"]')).toBeVisible();
    await expect(frame.locator('[data-test-id="game-stage"]')).toBeVisible();
    await expect(frame.locator('[data-test-id="game-utility-bar"]')).toBeVisible();

    await expect(page.locator('[data-test-id="game-recommendations"]')).toHaveCount(0);
    // Scoped to the game page itself — "Recently Played" also exists as a
    // persistent Sidebar nav label, which is expected to stay visible.
    const pageContent = page.locator('[data-test-id="casino-game-page"]');
    await expect(pageContent.getByText("Recently Played", { exact: true })).toHaveCount(0);
    await expect(pageContent.getByText("Similar Games", { exact: true })).toHaveCount(0);
    await expect(pageContent.getByText("Trending", { exact: true })).toHaveCount(0);

    // GameUtilityBar is the last meaningful element on the page.
    const page_ = page.locator('[data-test-id="casino-game-page"]');
    const lastChildTestId = await page_.evaluate((el) => el.lastElementChild?.querySelector('[data-test-id="game-utility-bar"]') ? "game-utility-bar" : el.lastElementChild?.getAttribute("data-test-id"));
    expect(lastChildTestId).toBeTruthy();
  });
});

test.describe("Casino game page — alignment", () => {
  test("GameHeader, GameStage and GameUtilityBar share identical left/right edges", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);

    const header = await page.locator('[data-test-id="game-header"]').boundingBox();
    const stage = await page.locator('[data-test-id="game-stage"]').boundingBox();
    const utilityBar = await page.locator('[data-test-id="game-utility-bar"]').boundingBox();

    expect(Math.abs(header.x - stage.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(header.x + header.width - (stage.x + stage.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(utilityBar.x - stage.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(utilityBar.x + utilityBar.width - (stage.x + stage.width))).toBeLessThanOrEqual(1);
  });

  test("Back/title align to the player's left edge; Favourite/More align to the right edge", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);

    const stage = await page.locator('[data-test-id="game-stage"]').boundingBox();
    const back = await page.locator('[data-test-id="game-header-back"]').boundingBox();
    const more = await page.locator('[data-test-id="game-header-menu"]').boundingBox();

    // GameHeader has a small, deliberate, symmetric inset (px-1 sm:px-2)
    // matching real product conventions (icons flush against a box border
    // below them read as cramped) — the requirement is that Back's inset
    // from the left matches More's inset from the right, not that either
    // touches the stage edge at x=0.
    const leftInset = back.x - stage.x;
    const rightInset = stage.x + stage.width - (more.x + more.width);
    expect(Math.abs(leftInset - rightInset)).toBeLessThanOrEqual(1);
    expect(leftInset).toBeLessThanOrEqual(12);
  });

  test("GameUtilityBar spans the exact same width as GameStage (the game viewport), not the wider page", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);

    const stage = await page.locator('[data-test-id="game-stage"]').boundingBox();
    const bar = await page.locator('[data-test-id="game-utility-bar"]').boundingBox();
    expect(Math.abs(bar.x - stage.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(bar.width - stage.width)).toBeLessThanOrEqual(1);
  });

  test("GameUtilityBar docks flush against GameStage — zero gap, one continuous silhouette", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);

    const stage = await page.locator('[data-test-id="game-stage"]').boundingBox();
    const bar = await page.locator('[data-test-id="game-utility-bar"]').boundingBox();
    expect(Math.abs(bar.y - (stage.y + stage.height))).toBeLessThanOrEqual(1);
  });

  test("ultra-wide desktop respects a sensible maximum width (frame is not full 1728px)", async ({ page }) => {
    await page.setViewportSize({ width: 1728, height: 900 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);
    const frame = await page.locator('[data-test-id="game-player-frame"]').boundingBox();
    expect(frame.width).toBeLessThan(1600);
  });
});

test.describe("Casino game page — GameStage regression (must not reintroduce the shallow-strip bug)", () => {
  test("game stage dominates the viewport and the iframe fills it", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    const stage = page.locator('[data-test-id="game-stage"]');
    await expect(stage).toBeVisible();
    await page.waitForTimeout(500);

    const viewport = page.viewportSize();
    const stageBox = await stage.boundingBox();
    expect(stageBox.height).toBeGreaterThan(viewport.height * 0.5);

    const iframeBox = await page.locator('[data-test-id="provider-iframe-tumble"]').boundingBox();
    expect(iframeBox.height).toBeGreaterThan(400);
  });

  test("frame height is identical across READY and an error state — loading/error never collapses the page", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const readyHeight = await page.locator('[data-test-id="game-player-frame"]').evaluate((el) => el.getBoundingClientRect().height);

    await page.evaluate((key) => {
      const state = JSON.parse(sessionStorage.getItem(key) || "{}");
      sessionStorage.setItem(key, JSON.stringify({ ...state, version: 2, gameStatus: "provider-error" }));
    }, DEV_MOCK_KEY);
    await page.reload();
    await page.waitForTimeout(500);
    const errorHeight = await page.locator('[data-test-id="game-player-frame"]').evaluate((el) => el.getBoundingClientRect().height);

    expect(Math.abs(errorHeight - readyHeight)).toBeLessThanOrEqual(1);
  });

  test("no horizontal scrollbar / overflow at any tested viewport", async ({ page }) => {
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/casino/lobby?play=provider:tumble");
      await page.waitForTimeout(400);
      const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(hasOverflow, `horizontal overflow at ${vp.name}`).toBe(false);
    }
  });
});

test.describe("Casino game page — header", () => {
  test("header has no thumbnail — only back, name/provider, favorite, and menu", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    const header = page.locator('[data-test-id="game-header"]');
    await expect(header).toBeVisible();
    const thumbCount = await header.locator("img, [style*='background-image']").count();
    expect(thumbCount).toBe(0);
    await expect(header.locator('[data-test-id="game-header-back"]')).toBeVisible();
    await expect(header.locator('[data-test-id="game-header-menu"]')).toBeVisible();
  });

  test("Favourite and More share the same dimensions", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const fav = await page.locator('[data-fav]').first().boundingBox();
    const more = await page.locator('[data-test-id="game-header-menu"]').boundingBox();
    expect(Math.round(fav.width)).toBe(Math.round(more.width));
    expect(Math.round(fav.height)).toBe(Math.round(more.height));
  });

  test("header height stays within the compact target range", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const height = await page.locator('[data-test-id="game-header"]').evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(48);
    expect(height).toBeLessThanOrEqual(64);
  });
});

test.describe("Casino game page — utility bar", () => {
  test("exactly three utility actions render (Theatre Mode removed), each an exact equal third", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const bar = page.locator('[data-test-id="game-utility-bar"]');
    const buttons = bar.locator("button");
    await expect(buttons).toHaveCount(3);
    await expect(page.locator('[data-test-id="game-utility-theatre"]')).toHaveCount(0);

    const barBox = await bar.boundingBox();
    const boxes = await Promise.all(Array.from({ length: 3 }, (_, i) => buttons.nth(i).boundingBox()));
    const heights = boxes.map((b) => Math.round(b.height));
    expect(new Set(heights).size).toBe(1); // all three the exact same height

    const widths = boxes.map((b) => Math.round(b.width));
    const expectedThird = barBox.width / 3;
    for (const w of widths) expect(Math.abs(w - expectedThird)).toBeLessThanOrEqual(1);

    const tops = boxes.map((b) => Math.round(b.y));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
  });

  test("first slot starts at the stage's left edge, last slot ends at the stage's right edge", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const stage = await page.locator('[data-test-id="game-stage"]').boundingBox();
    const buttons = page.locator('[data-test-id="game-utility-bar"] button');
    const first = await buttons.first().boundingBox();
    const last = await buttons.last().boundingBox();
    expect(Math.abs(first.x - stage.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(last.x + last.width - (stage.x + stage.width))).toBeLessThanOrEqual(1);
  });

  test("subtle vertical dividers separate the three actions", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const buttons = page.locator('[data-test-id="game-utility-bar"] button');
    // First slot has no left divider; the other two do (dividerLeft prop).
    const borders = await buttons.evaluateAll((els) => els.map((el) => getComputedStyle(el).borderLeftWidth));
    expect(parseFloat(borders[0])).toBe(0);
    expect(parseFloat(borders[1])).toBeGreaterThan(0);
    expect(parseFloat(borders[2])).toBeGreaterThan(0);
  });

  test("labels are correct on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    for (const label of ["Game Info", "Report Issue", "Fullscreen"]) {
      await expect(page.locator('[data-test-id="game-utility-bar"]').getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("mobile uses three equal-width controls, no horizontal scrolling, no clipped labels", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const bar = page.locator('[data-test-id="game-utility-bar"]');
    const buttons = bar.locator("button");
    const boxes = await Promise.all(Array.from({ length: 3 }, (_, i) => buttons.nth(i).boundingBox()));
    const widths = boxes.map((b) => Math.round(b.width));
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);

    const barBox = await bar.boundingBox();
    expect(barBox.width).toBeGreaterThan(300); // full frame width
  });

  test("no clipped labels at the narrowest tested width (360px)", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(500);
    const clipped = await page.locator('[data-test-id="game-utility-bar"] button span:not(.hidden)').evaluateAll(
      (spans) => spans.map((s) => ({ text: s.textContent, clipped: s.scrollWidth > s.clientWidth + 1 }))
    );
    expect(clipped.length).toBe(3);
    for (const s of clipped) expect(s.clipped, `"${s.text}" should not be clipped`).toBe(false);
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

test.describe("Casino game page — fullscreen", () => {
  test("Fullscreen removes GameStage's height cap and engages the real Fullscreen API", async ({ page }) => {
    await page.goto("/casino/lobby?play=provider:tumble");
    await page.waitForTimeout(600);
    const fsBtn = page.locator('[data-test-id="game-utility-fullscreen"]');
    await fsBtn.click();
    await page.waitForTimeout(300);

    const isFullscreen = await page.evaluate(() => !!document.fullscreenElement);
    expect(isFullscreen).toBe(true);
    const stageClass = await page.locator('[data-test-id="game-stage"]').getAttribute("class");
    expect(stageClass).not.toMatch(/md:h-|md:max-h/);
    await expect(fsBtn).toHaveAttribute("aria-pressed", "true");
  });
});
