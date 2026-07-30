import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

async function enablePlaceholders(page) {
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
}

test("scroll/overflow testing screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await enablePlaceholders(page);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/lobby-with-placeholders-desktop.png`, fullPage: false });

  // Providers row specifically.
  await page.locator('[data-test-id="providers-rail"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SC}/providers-row-with-placeholders.png`, fullPage: false });

  // Mobile horizontal scroll with placeholders.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/lobby-with-placeholders-mobile.png`, fullPage: false });
});
