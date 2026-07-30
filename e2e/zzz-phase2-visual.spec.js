import { test } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

test("lobby rail with load more, then expanded", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  // PROVIDERS RE-ENABLE: tribet-studio-rail no longer exists (the studio
  // catalog is now 3 providers of ~4 games each, well under the 8-item
  // page size) — New Releases (6 real) + placeholders on is the reliable
  // Load More target now.
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase2-rail-before.png` });

  const loadMore = page.locator('[data-test-id="new-releases-rail-load-more"]');
  await loadMore.scrollIntoViewIfNeeded();
  await loadMore.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase2-rail-after.png` });
});

test("category destination page filter+sort row", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/category/popular");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase2-category-filter-sort.png` });
});
