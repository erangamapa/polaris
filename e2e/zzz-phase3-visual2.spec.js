import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

// HEART REDESIGN — the follow toggle this file used to crop into frame has
// been removed entirely (see zzz-phase3-visual.spec.js for the removal
// verification); kept as a plain header screenshot.
test("game page header, no follow toggle present", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby?play=provider%3Acrash");
  await page.waitForSelector('[data-test-id="game-header"]');
  await page.waitForTimeout(300);
  const header = page.locator('[data-test-id="game-header"]');
  await header.screenshot({ path: `${SC}/phase3-game-header2.png` });
});
