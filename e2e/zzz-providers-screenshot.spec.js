import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("providers row screenshot", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1400 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="providers-rail"]');
  await page.locator('[data-test-id="providers-rail"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/providers-row-lobby.png`, fullPage: false });

  await page.goto("/casino/provider/provider-2");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/provider-detail-page.png`, fullPage: false });
});
