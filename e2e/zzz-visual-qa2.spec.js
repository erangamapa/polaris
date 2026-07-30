import { test } from "@playwright/test";

const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("card hover state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  const card = page.locator('[data-test-id="originals-rail"] [data-test-id="game-card-casino-dice"]').locator("xpath=..");
  await card.hover();
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${SC}/card-hover.png`, clip: { x: 200, y: 420, width: 400, height: 320 } });
});
