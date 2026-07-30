import { test, expect } from "@playwright/test";

// CASINO PLACEHOLDER FIXTURES — regression coverage for the dev-only
// UI-testing layer (lib/casinoPlaceholders.js, CasinoCatalog.jsx's
// PlaceholderGameCard). Matches this project's established convention: pure
// logic gets vitest unit tests (see lib/casinoPlaceholders.test.js), DOM/
// interaction behavior gets verified here via Playwright.
//
// HOTFIX (demo): `casinoPlaceholderRails` in lib/devMock.js is back to
// defaulting `false` — "PLACEHOLDER GAME"/"UI Test Fixture" tiles must
// never show to a real visitor. Every test below that actually needs
// placeholders present now explicitly flips the flag on via the Dev Panel
// first (see `gotoLobbyWithPlaceholders`); only the "gating" describe
// block below tests the default itself.

// PROVIDERS RE-ENABLE: the Tribet Studio catalog is now split across three
// providers (see lib/casinoCategories.js's CASINO_PROVIDERS) with no single
// per-provider game rail on the Lobby — providers surface as landscape
// ProviderTiles instead (see CasinoCatalog.jsx), which never carry
// placeholder fixtures. Every remaining eligible rail here has fewer than
// RAIL_PAGE_SIZE (8) real games, so this list needed no load-more special-
// casing even before this change.
const ELIGIBLE_RAILS = [
  "originals-rail",
  "popular-rail",
  "new-releases-rail",
  "live-casino-rail",
  "game-shows-rail",
];

async function gotoLobby(page) {
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
}

// The checkbox is a real <input type="checkbox"> wrapped in its own
// <label> (see DevPanel.jsx's Checkbox component) — clicking the label
// toggles it natively, so this same helper both enables and disables
// depending on the flag's current state.
async function togglePlaceholders(page) {
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
}

async function gotoLobbyWithPlaceholders(page) {
  await gotoLobby(page);
  await togglePlaceholders(page); // default is off -> this turns it on
  await page.waitForTimeout(150);
}

test.describe("Casino placeholder fixtures — Dev Panel gating", () => {
  test("disabled by default: no placeholder tiles in a fresh session", async ({ page }) => {
    await gotoLobby(page);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
  });

  test("a developer can enable the flag via the Dev Panel, then disable it again", async ({ page }) => {
    await gotoLobby(page);
    await togglePlaceholders(page); // default is off -> this enables it
    // HOTFIX (page size): real games always sort before placeholders (see
    // withPlaceholders), and every rail now shows only its first
    // RAIL_PAGE_SIZE (8) items until Load More is clicked. Every eligible
    // rail here has fewer than 8 real games, so its placeholder(s) are
    // visible on the first page immediately, with no need to load more.
    for (const testId of ELIGIBLE_RAILS) {
      const count = await page.locator(`[data-test-id="${testId}"] [data-placeholder="true"]`).count();
      expect(count, `${testId} should contain at least one placeholder`).toBeGreaterThan(0);
    }

    await togglePlaceholders(page); // disable again
    await page.reload();
    await page.waitForSelector('[data-test-id="main-content"]');
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
  });
});

test.describe("Casino placeholder fixtures — ordering and overflow", () => {
  test("real games render before placeholders in the Popular rail", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const cards = page.locator('[data-test-id="popular-rail"] [data-test-id^="game-card-"]');
    const isPlaceholderFlags = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-placeholder") === "true"));
    const firstPlaceholderIndex = isPlaceholderFlags.indexOf(true);
    expect(firstPlaceholderIndex).toBeGreaterThan(-1);
    // Nothing after the first placeholder should be a real (non-placeholder) card.
    expect(isPlaceholderFlags.slice(firstPlaceholderIndex).every(Boolean)).toBe(true);
  });

  // SCROLL/OVERFLOW TESTING PASS: this used to split rails into
  // "overflowing" (enough real content) vs. "sparse" (padded only up to 2x
  // real count, so a 1-real-game section stayed honest rather than showing
  // a wall of fake cards). That restraint was a PRODUCTION-facing concern;
  // this flag is dev/testing-only (off by default, opt-in via the Dev
  // Panel) and exists specifically to exercise overflow/Load More/scroll —
  // so every populated rail is now topped up to the same flat
  // PLACEHOLDER_TARGET_TOTAL regardless of real count, and every one of
  // them shows Load More once enabled. There is no more "correctly stays
  // sparse" case to guard.
  test("every populated rail shows Load More once placeholders are enabled, at 1920px", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobbyWithPlaceholders(page);

    for (const testId of ELIGIBLE_RAILS) {
      const loadMore = page.locator(`[data-test-id="${testId}-load-more"]`);
      await expect(loadMore, `${testId} should show Load More (topped up past the 8-item page size)`).toBeVisible();
    }
  });
});

test.describe("Casino placeholder fixtures — contextual sections stay genuine", () => {
  // FAVORITES LOBBY REMOVAL: there is no more favorites-rail on the Lobby at
  // all (Favorites is a dedicated sidebar destination now) — nothing left
  // to check there; the dedicated Favorites page itself is still real and
  // still must never fill its empty state with placeholders.
  test("Favorites page receives no placeholders even with the flag on", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    await expect(page.locator('[data-test-id="favorites-rail"]')).toHaveCount(0);

    await page.goto("/casino/favorites");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
    await expect(page.locator('[data-test-id^="game-card-"]')).toHaveCount(0); // genuine empty state, not filled with anything
  });

  test("Recently Played rail/page receive no placeholders even with the flag on", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    await expect(page.locator('[data-test-id="recently-played-rail"]')).toHaveCount(0); // self-hides when genuinely empty

    await page.goto("/casino/recently-played");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
    await expect(page.locator('[data-test-id^="game-card-"]')).toHaveCount(0);
  });
});

test.describe("Casino placeholder fixtures — See all pages", () => {
  test("Popular's See all page receives real games first, then placeholders", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    // NAV SPEC (§4.1 two-route split): the destination route moved from a
    // bare `/casino/popular` to `/casino/category/popular` — the bare path
    // no longer resolves to a category page at all (it now falls back to
    // the Lobby dashboard), which is why this needs the new URL.
    await page.goto("/casino/category/popular");
    await page.waitForTimeout(200);
    const cards = page.locator('[data-test-id^="game-card-"]');
    const flags = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-placeholder") === "true"));
    expect(flags.some((f) => f)).toBe(true); // has placeholders
    const firstPlaceholderIndex = flags.indexOf(true);
    expect(flags.slice(firstPlaceholderIndex).every(Boolean)).toBe(true); // never a real card after the first placeholder
  });
});

test.describe("Casino placeholder fixtures — search exclusion", () => {
  test("placeholders never appear in search results", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const input = page.locator('[data-test-id="arena-search"]');
    await input.fill("placeholder");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-test-id="arena-search-panel"] [data-placeholder="true"]')).toHaveCount(0);
  });

  test("an active search query does not re-introduce placeholders into the Lobby rails", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const input = page.locator('[data-test-id="arena-search"]');
    await input.fill("dice");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
  });
});

test.describe("Casino placeholder fixtures — interaction", () => {
  test("clicking a placeholder shows the exact message and never navigates", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const before = page.url();
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.click();
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
    expect(page.url()).toBe(before);
    // Never mounts an active game surface.
    await expect(page.locator('[data-test-id="game-stage"]')).toHaveCount(0);
  });

  test("keyboard activation (Enter and Space) shows the same message", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
  });

  test("rapid repeated clicks never stack more than one instance of the message", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.click();
    await placeholder.click();
    await placeholder.click();
    await expect(page.getByText("It's not a real game, you fool!")).toHaveCount(1);
  });

  test("a placeholder card has no favorite control", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await expect(placeholder.locator('[data-fav]')).toHaveCount(0);
  });

  test("the accessible name states testing status, not the click message", async ({ page }) => {
    await gotoLobbyWithPlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await expect(placeholder).toHaveAttribute("aria-label", "Placeholder game. UI testing only.");
  });
});
