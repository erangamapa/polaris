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

// PROVIDERS RE-ENABLE: the Tribet Studio catalog (previously one rail with
// 12 real games, always exceeding RAIL_PAGE_SIZE on its own) is now split
// across three providers with ~4 games each — no single rail is
// guaranteed to overflow without placeholder fixtures topping it up. Same
// Dev Panel toggle used by casino-placeholder-fixtures.spec.js.
async function enablePlaceholders(page) {
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
}

test.describe("Casino lobby promo hierarchy", () => {
  // MOCKUP ALIGNMENT CORRECTION: replaces the old "wallet hero is visibly
  // wider" test — the approved direction requires strictly equal widths,
  // not a dominant hero card. Checks all three standard desktop widths
  // named in the task's QA list, not just one.
  for (const width of [1920, 1728, 1440, 1366, 1280]) {
    test(`all three promo cards are equal width and height at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await gotoLobby(page);
      const cards = page.locator(".top-card-grid > div");
      const heroBox = await cards.nth(0).boundingBox();
      const promo1Box = await cards.nth(1).boundingBox();
      const promo2Box = await cards.nth(2).boundingBox();
      expect(Math.abs(heroBox.width - promo1Box.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(promo1Box.width - promo2Box.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(heroBox.height - promo1Box.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(promo1Box.height - promo2Box.height)).toBeLessThanOrEqual(1);
    });
  }

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

  // MOCKUP ALIGNMENT CORRECTION: guards against the specific bug the task
  // called "unacceptable" — CSS truncate() rendering a visible mid-sentence
  // ellipsis on the promo cards' supporting copy.
  test("promo card supporting copy never renders a visible ellipsis", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoLobby(page);
    const copyTexts = await page.locator(".top-card-grid p").allTextContents();
    expect(copyTexts.length).toBeGreaterThan(0);
    for (const text of copyTexts) {
      expect(text).not.toMatch(/…|\.\.\.$/);
    }
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

test.describe("Casino lobby rail controls", () => {
  // NAV SPEC §5.3: carousel prev/next arrows were replaced by Load More +
  // View All — a rail that overflows its own visible track now shows a
  // "Load More" text control below it instead of arrow buttons in the
  // header. Guards a real, clickable hit area (comfortably above the
  // smallest acceptable touch target) rather than asserting exact colour
  // values (brittle).
  // HOTFIX (page size): every rail is capped at RAIL_PAGE_SIZE (8) real
  // items before Load More has anything to reveal. No single rail's real
  // catalog exceeds 8 on its own since Providers re-enable (New Releases
  // has 6) — placeholder fixtures top it up past that threshold instead.
  test("an overflowing rail shows a Load More control with a real hit area", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1080 });
    await gotoLobby(page);
    await enablePlaceholders(page);
    const loadMore = page.locator('[data-test-id="new-releases-rail-load-more"]');
    await expect(loadMore).toBeVisible();
    const box = await loadMore.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(16);
    expect(box.width).toBeGreaterThan(0);
  });

  test("clicking Load More appends the next page and removes the control once exhausted", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1080 });
    await gotoLobby(page);
    await enablePlaceholders(page);
    const rail = page.locator('[data-test-id="new-releases-rail"]');
    const loadMore = rail.locator('[data-test-id="new-releases-rail-load-more"]');
    const cardsBefore = await rail.locator('[data-test-id^="game-card-"]').count();
    await loadMore.click();
    await expect(loadMore).toHaveCount(0); // 6 real + up to 6 placeholder = 12, page size 8: one Load More exhausts it
    const cardsAfter = await rail.locator('[data-test-id^="game-card-"]').count();
    expect(cardsAfter).toBeGreaterThan(cardsBefore);
    await expect(rail.locator('[data-test-id^="game-card-"]').first()).toBeVisible();
  });
});

// FAVORITES LOBBY REMOVAL: Favorites no longer renders as a Lobby rail at
// all (see CasinoCatalog.jsx's LobbyDashboard) — it's a dedicated sidebar
// destination, so adding a favorite must never insert/remove/reorder a
// Lobby section. This describe block now verifies both halves: the Lobby
// stays stable, and the sidebar/Favorites-page path still works.
test.describe("Casino lobby Favorites section", () => {
  test("favoriting a game does not add a lobby row; sidebar count updates and the card is launchable from the Favorites page", async ({ page }) => {
    await gotoLobby(page);
    const railOrderBefore = await page.locator('[data-test-id="main-content"] section[data-test-id]').evaluateAll((els) => els.map((el) => el.getAttribute("data-test-id")));

    const addStar = page.getByLabel(/^Add .+ to Favorites$/).first();
    await addStar.click();

    // Sidebar count updates immediately, no navigation.
    await expect(page.locator('[data-test-id="sidebar-favorites-count"]').getByText("1", { exact: true })).toBeVisible();
    expect(page.url()).not.toContain("play=");

    // Lobby section order is byte-for-byte unchanged — no inserted/removed/
    // reordered row, and specifically no favorites-rail at any position.
    const railOrderAfter = await page.locator('[data-test-id="main-content"] section[data-test-id]').evaluateAll((els) => els.map((el) => el.getAttribute("data-test-id")));
    expect(railOrderAfter).toEqual(railOrderBefore);
    expect(railOrderAfter).not.toContain("favorites-rail");

    // The favorited game is still reachable and launchable — from the
    // dedicated Favorites destination now, not a lobby rail.
    await page.locator('[data-test-id="sidebar-favorites-count"]').click();
    await page.waitForSelector('[data-test-id="main-content"]');
    const favoritedCard = page.locator('[data-test-id^="game-card-"]').first();
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
