import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("hotfix screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SC}/hotfix-lobby-1440.png`, fullPage: false });

  // Expanded grid at desktop width — PROVIDERS RE-ENABLE: tribet-studio-rail
  // no longer exists, use New Releases with placeholders enabled instead.
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-test-id="new-releases-rail-load-more"]').click();
  await page.waitForTimeout(300);
  await page.locator('[data-test-id="new-releases-rail"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SC}/hotfix-rail-expanded-1440.png`, fullPage: false });

  // Mobile horizontal scroll
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SC}/hotfix-mobile-390.png`, fullPage: false });
});
