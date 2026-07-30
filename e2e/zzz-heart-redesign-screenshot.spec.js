import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("heart redesign screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/heart-sidebar.png`, clip: { x: 0, y: 0, width: 260, height: 350 } });

  const cardLink = page.locator('[data-test-id="originals-rail"] [data-test-id="game-card-casino-dice"]');
  await cardLink.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await cardLink.boundingBox();
  const clip = { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: box.width + 40, height: box.height + 40 };
  await page.screenshot({ path: `${SC}/heart-card-inactive.png`, clip });

  const heart = cardLink.locator("xpath=..").locator("[data-fav]");
  await heart.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/heart-card-active.png`, clip });
});
