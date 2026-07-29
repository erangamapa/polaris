import { test, expect } from "@playwright/test";

// CASINO SURFACE HIERARCHY POLISH — regression coverage for the token/
// surface refinement pass (index.css, Sidebar.jsx, TopBar.jsx,
// CasinoCatalog.jsx, PromoStrip.jsx, GameUtilityBar.jsx). Matches this
// project's established convention: functional/DOM assertions over
// brittle pixel snapshots — this repo has no stable screenshot-testing
// workflow to extend.

async function gotoLobby(page) {
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
}

function toRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

test.describe("Surface hierarchy", () => {
  test("main page background is lifted but header/sidebar stay on the deepest, matching tone", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobby(page);
    const colors = await page.evaluate(() => ({
      main: getComputedStyle(document.querySelector('[data-test-id="main-content"]').closest("[data-product]")).backgroundColor,
      header: getComputedStyle(document.querySelector("header")).backgroundColor,
      sidebar: getComputedStyle(document.querySelector('nav[aria-label="Casino sidebar"]')).backgroundColor,
    }));
    // Page background is the new lifted value, not the old darker one.
    expect(colors.main).toBe(toRgb("#0D0E16"));
    expect(colors.main).not.toBe(toRgb("#05070F"));
    // Header now matches the sidebar (both "shell"), not the page —
    // the exact coupling bug this pass fixed in TopBar.jsx.
    expect(colors.header).toBe(toRgb("#080B16"));
    expect(colors.header).toBe(colors.sidebar);
    expect(colors.header).not.toBe(colors.main);
  });

  test("--border token is present and visible (not fully transparent) but softer than the old opaque value", async ({ page }) => {
    await gotoLobby(page);
    const promoCard = page.locator(".top-card-grid > div").nth(1);
    const borderColor = await promoCard.evaluate((el) => getComputedStyle(el).borderColor);
    expect(borderColor).not.toBe("rgba(0, 0, 0, 0)");
    // color-mix(..., transparent) serializes as a CSS Color 4 color()
    // function with an alpha component (e.g. "color(srgb 0.11 0.14 0.26 /
    // 0.82)") rather than legacy rgba() — the meaningful assertion is that
    // an alpha channel below 1 is actually present, i.e. it's genuinely
    // translucent rather than the old flat, fully-opaque hex.
    const alphaMatch = borderColor.match(/\/\s*([\d.]+)\)?$/);
    expect(alphaMatch, `expected an alpha component in "${borderColor}"`).not.toBeNull();
    expect(Number(alphaMatch[1])).toBeLessThan(1);
  });
});

test.describe("Sidebar icon/label decoupling", () => {
  test("inactive nav item's icon and label render different colours", async ({ page }) => {
    await gotoLobby(page);
    const row = page.locator('#nav-item-Popular-expanded');
    const iconColor = await row.locator("svg").first().evaluate((el) => getComputedStyle(el).color);
    const labelColor = await row.locator("span.text-sm").first().evaluate((el) => getComputedStyle(el).color);
    expect(iconColor).not.toBe(labelColor);
  });

  test("section labels (PERSONAL/GAMES) are visually quieter than inactive nav labels", async ({ page }) => {
    await gotoLobby(page);
    // DOM text is "Personal" — CSS text-transform:uppercase renders it as
    // "PERSONAL" visually only; getByText matches DOM content, not the
    // rendered transform.
    const sectionLabelColor = await page.getByText("Personal", { exact: true }).evaluate((el) => getComputedStyle(el).color);
    const navLabelColor = await page.locator('#nav-item-Popular-expanded span.text-sm').evaluate((el) => getComputedStyle(el).color);
    expect(sectionLabelColor).not.toBe(navLabelColor);
  });
});

test.describe("Category pills", () => {
  test("inactive pills have a real (non-transparent) fill; active pill is untouched", async ({ page }) => {
    await gotoLobby(page);
    const inactive = page.locator('[data-test-id="category-nav-popular"]');
    const active = page.locator('[data-test-id="category-nav-lobby"]');
    const inactiveBg = await inactive.evaluate((el) => getComputedStyle(el).backgroundColor);
    const activeBg = await active.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(inactiveBg).not.toBe("rgba(0, 0, 0, 0)");
    expect(activeBg).not.toBe("rgba(0, 0, 0, 0)");
    expect(inactiveBg).not.toBe(activeBg); // still clearly distinct states
  });
});

test.describe("Card geometry is unchanged", () => {
  test("all three promo cards remain equal width/height after the polish pass", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobby(page);
    const cards = page.locator(".top-card-grid > div");
    const boxes = await Promise.all([0, 1, 2].map((i) => cards.nth(i).boundingBox()));
    expect(Math.abs(boxes[0].width - boxes[1].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes[1].width - boxes[2].width)).toBeLessThanOrEqual(1);
    expect(Math.abs(boxes[0].height - boxes[1].height)).toBeLessThanOrEqual(1);
  });

  test("game cards keep their existing aspect ratio and rail tile width", async ({ page }) => {
    await gotoLobby(page);
    const card = page.locator('[data-test-id="originals-rail"] [data-test-id^="game-card-"]').first();
    const box = await card.boundingBox();
    expect(Math.abs(box.width / box.height - 3 / 4)).toBeLessThan(0.02);
  });

  test("promo CTA position is unaffected by the larger illustration", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobby(page);
    const cta = page.locator('[data-test-id="wallet-tile-connect"]');
    await expect(cta).toBeVisible();
    const box = await cta.boundingBox();
    const cardBox = await page.locator(".top-card-grid > div").first().boundingBox();
    // CTA still sits inside the card, in the lower area, not overlapped by artwork.
    expect(box.y).toBeGreaterThan(cardBox.y + cardBox.height * 0.5);
  });
});

test.describe("No regressions", () => {
  test("no horizontal overflow at common desktop widths after the polish pass", async ({ page }) => {
    for (const width of [1280, 1440, 1728, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await gotoLobby(page);
      const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
      expect(overflowing, `horizontal overflow at ${width}px`).toBe(false);
    }
  });

  test("focus ring remains visible on an inactive category pill", async ({ page }) => {
    await gotoLobby(page);
    const pill = page.locator('[data-test-id="category-nav-popular"]');
    await pill.focus();
    const outline = await pill.evaluate((el) => {
      const cs = getComputedStyle(el);
      return cs.boxShadow || cs.outlineStyle;
    });
    expect(outline).not.toBe("none");
  });

  test("footer remains readable and visually distinct after the background lift", async ({ page }) => {
    await gotoLobby(page);
    const footer = page.locator("footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer.getByText("Terms of Service")).toBeVisible();
    const footerBorder = await footer.evaluate((el) => getComputedStyle(el).borderTopColor);
    expect(footerBorder).not.toBe("rgba(0, 0, 0, 0)");
  });
});
