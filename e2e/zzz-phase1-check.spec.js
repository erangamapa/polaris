import { test, expect } from "@playwright/test";

const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("home filter view vs category destination view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  // Home filter view (deep link)
  await page.goto("/casino/lobby/live-casino");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase1-home-filter.png` });
  const hasPromoOnHome = await page.locator('[data-test-id="wallet-card"], [aria-label="Wallet"]').count();
  console.log("home view URL:", page.url());

  // Category destination view (deep link)
  await page.goto("/casino/category/live-casino");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase1-category-destination.png` });
  console.log("category view URL:", page.url());
});

test("chip click navigates with real URL + back restores rails, sidebar identity persists", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');

  const sidebarId = await page.evaluate(() => {
    const el = document.querySelector('[aria-label="Casino sidebar"]');
    if (!el.dataset.trackId) el.dataset.trackId = Math.random().toString(36);
    return el.dataset.trackId;
  });

  await page.locator('[data-test-id="category-nav-live-casino"]').click();
  await page.waitForTimeout(300);
  console.log("after chip click URL:", page.url());

  const sidebarIdAfter = await page.evaluate(() => document.querySelector('[aria-label="Casino sidebar"]')?.dataset.trackId);
  console.log("sidebar identity preserved:", sidebarId === sidebarIdAfter);

  await page.goBack();
  await page.waitForTimeout(300);
  console.log("after back URL:", page.url());
  const railsVisible = await page.locator('[data-test-id="originals-rail"]').count();
  console.log("rails visible after back:", railsVisible > 0);
});
