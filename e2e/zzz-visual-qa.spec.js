import { test } from "@playwright/test";

const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("lobby hierarchy screenshots across breakpoints", async ({ page }) => {
  for (const [name, w, h] of [["1280", 1280, 900], ["1440", 1440, 900], ["1920", 1920, 1100], ["2560", 2560, 1200]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/casino/lobby");
    await page.waitForSelector('[data-test-id="main-content"]');
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SC}/lobby-${name}.png`, fullPage: false });
  }

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/lobby-mobile.png`, fullPage: true });

  // Tablet
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/lobby-tablet.png`, fullPage: false });
});

test("full page scroll capture at 1440", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/lobby-1440-full.png`, fullPage: true });
});

test("sidebar collapsed", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.locator('button[aria-label="Collapse menu"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SC}/lobby-sidebar-collapsed.png` });
});
