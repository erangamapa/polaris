import { test, expect } from "@playwright/test";

// CASINO LOBBY VISUAL REFRESH — regression coverage for the promo-grid
// hierarchy restructure, search label removal, category-pill polish,
// Favorites section header, and footer/shell width changes. Matches this
// project's established testing convention (see CasinoCatalog.test.js's own
// note): pure logic gets vitest unit tests, DOM/visual/interaction behavior
// gets verified here via Playwright against the running dev server.

async function gotoLobby(page) {
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
}

test.describe("Casino lobby promo hierarchy", () => {
  test("wallet hero is visibly wider than each secondary promo card on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobby(page);
    const cards = page.locator(".top-card-grid > div");
    const heroBox = await cards.nth(0).boundingBox();
    const promo1Box = await cards.nth(1).boundingBox();
    const promo2Box = await cards.nth(2).boundingBox();
    expect(heroBox.width).toBeGreaterThan(promo1Box.width * 1.4);
    expect(heroBox.width).toBeGreaterThan(promo2Box.width * 1.4);
    // All three still share one outer height (CARD_H), per the mockup's
    // "all cards share the same outer height" requirement.
    expect(Math.abs(heroBox.height - promo1Box.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(promo1Box.height - promo2Box.height)).toBeLessThanOrEqual(1);
  });

  test("tablet: hero spans full width, two secondary cards share a row beneath it", async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1024 });
    await gotoLobby(page);
    const cards = page.locator(".top-card-grid > div");
    const heroBox = await cards.nth(0).boundingBox();
    const promo1Box = await cards.nth(1).boundingBox();
    const promo2Box = await cards.nth(2).boundingBox();
    // Hero sits above the secondary row entirely.
    expect(heroBox.y + heroBox.height).toBeLessThanOrEqual(promo1Box.y + 1);
    // The two secondary cards share the same row (same y) and roughly split the width.
    expect(Math.abs(promo1Box.y - promo2Box.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(promo1Box.width - promo2Box.width)).toBeLessThanOrEqual(2);
  });

  test("no horizontal overflow at common desktop and tablet widths", async ({ page }) => {
    for (const width of [1280, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoLobby(page);
      const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflowing, `horizontal overflow at ${width}px`).toBe(false);
    }
  });

  test("main content fills the viewport width beyond the standard gutter (no empty right-side reservation)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobby(page);
    const main = await page.locator('[data-test-id="main-content"]').boundingBox();
    // Right edge of <main> should sit within a few px of the viewport edge
    // (it owns the scrollbar gutter) — regression guard for the shell
    // reserving a stale right-panel column with nothing mounted in it.
    expect(1920 - (main.x + main.width)).toBeLessThan(24);
  });
});

test.describe("Casino lobby search", () => {
  test("search has no visible label but keeps a programmatic accessible name", async ({ page }) => {
    await gotoLobby(page);
    // sr-only clips to a 1x1px box rather than `display:none` (so screen
    // readers still announce it) — Playwright's toBeHidden() only checks
    // for display:none/opacity:0/zero-area-via-CSS, not visual clipping,
    // so the meaningful assertion here is the box size, not visibility.
    const box = await page.locator("label", { hasText: /^Search$/ }).boundingBox();
    expect(box.width).toBeLessThanOrEqual(1);
    expect(box.height).toBeLessThanOrEqual(1);
    await expect(page.getByLabel("Search", { exact: true })).toBeVisible();
  });

  test("typing in search filters the catalog", async ({ page }) => {
    await gotoLobby(page);
    const input = page.locator('[data-test-id="arena-search"]');
    await input.fill("dice");
    await expect(page.locator('[data-test-id="arena-search-panel"]')).toBeVisible();
  });

  test("search input is reachable by keyboard", async ({ page }) => {
    await gotoLobby(page);
    await page.locator('[data-test-id="arena-search"]').focus();
    await expect(page.locator('[data-test-id="arena-search"]')).toBeFocused();
  });
});

test.describe("Casino lobby category navigation", () => {
  test("clicking a category pill updates the selected state", async ({ page }) => {
    await gotoLobby(page);
    const popular = page.locator('[data-test-id="category-nav-popular"]');
    await popular.click();
    await expect(popular).toHaveAttribute("aria-current", "page");
    const lobby = page.locator('[data-test-id="category-nav-lobby"]');
    await expect(lobby).not.toHaveAttribute("aria-current", "page");
  });
});

test.describe("Casino lobby Favorites section", () => {
  test("favoriting a game shows a dynamic count badge and the card is launchable from Favorites", async ({ page }) => {
    await gotoLobby(page);
    const addStar = page.getByLabel(/^Add .+ to Favorites$/).first();
    await addStar.click();

    const favoritesRail = page.locator('[data-test-id="favorites-rail"]');
    await expect(favoritesRail).toBeVisible();
    await expect(favoritesRail.getByText(/^1 game$/)).toBeVisible();

    const favoritedCard = favoritesRail.locator('[data-test-id^="game-card-"]').first();
    await favoritedCard.click();
    await expect(page).toHaveURL(/[?&]play=/);
  });
});

test.describe("Casino lobby footer", () => {
  test("required footer links remain present and reachable", async ({ page }) => {
    await gotoLobby(page);
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    for (const label of ["Terms of Service", "Privacy Policy", "Responsible Gaming"]) {
      await expect(footer.getByText(label, { exact: true })).toBeVisible();
    }
  });
});
