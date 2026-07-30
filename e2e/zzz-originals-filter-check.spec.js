import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";
test("originals destination page has no provider filter", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casino/category/originals");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  const filterCount = await page.locator('[aria-label="Filter by provider"]').count();
  console.log("filter present on Originals destination:", filterCount > 0);
  await page.screenshot({ path: `${SC}/originals-destination.png` });
});
