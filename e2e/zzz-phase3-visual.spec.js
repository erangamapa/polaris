import { test, expect } from "@playwright/test";
const SC = "/private/tmp/claude-501/-Users-a0158bgl-polaris/311cc067-9f14-440f-8530-e1e8544a1ee0/scratchpad";

// HEART REDESIGN — the Follow-provider feature this file used to capture
// screenshots of (provider Follow button, sidebar Following row, /casino/
// following page) has been removed entirely, not just hidden — repurposed
// into a verification that the removal actually holds, rather than left
// broken pointing at a control that no longer exists.

test("providers index and detail page have no Follow control", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/collection/provider");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase3-providers-index.png` });

  await page.goto("/casino/provider/provider-1");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase3-provider-detail.png` });

  const followCount = await page.locator('[data-test-id^="follow-provider-"]').count();
  console.log(`[following-removed] follow-provider-* controls on provider detail page: ${followCount}`);
  expect(followCount).toBe(0);
});

test("game page header shows provider name with no follow toggle", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby?play=provider%3Acrash");
  await page.waitForSelector('[data-test-id="game-header"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SC}/phase3-game-header.png`, clip: { x: 0, y: 0, width: 700, height: 100 } });

  const followCount = await page.locator('[data-test-id^="follow-provider-"]').count();
  console.log(`[following-removed] follow-provider-* controls on game header: ${followCount}`);
  expect(followCount).toBe(0);
});

test("sidebar has no Following row, and /casino/following no longer resolves to a Following page", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.screenshot({ path: `${SC}/phase3-sidebar-personal-section.png`, clip: { x: 0, y: 0, width: 260, height: 500 } });

  const followingRowCount = await page.getByText("Following", { exact: true }).count();
  console.log(`[following-removed] sidebar rows/text reading exactly "Following": ${followingRowCount}`);
  expect(followingRowCount).toBe(0);

  await page.goto("/casino/following");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(200);
  console.log(`[following-removed] /casino/following resolved URL: ${page.url()}`);
  const followingPageHeading = await page.getByRole("heading", { name: "Following" }).count();
  console.log(`[following-removed] "Following" page heading present: ${followingPageHeading}`);
  expect(followingPageHeading).toBe(0);
});
