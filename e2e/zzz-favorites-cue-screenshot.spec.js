import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("favorites cue and lobby stability screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/lobby-before-favorite.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });

  const addHeart = page.getByLabel(/^Add .+ to Favorites$/).first();
  await addHeart.click();

  // Capture the sidebar mid-pulse (cue lasts ~850ms).
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${SC}/sidebar-pulse-active.png`, clip: { x: 0, y: 0, width: 260, height: 350 } });

  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SC}/sidebar-after-pulse.png`, clip: { x: 0, y: 0, width: 260, height: 350 } });

  await page.screenshot({ path: `${SC}/lobby-after-favorite.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
});
