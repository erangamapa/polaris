import { test, expect } from "@playwright/test";

// CASINO PLACEHOLDER FIXTURES — regression coverage for the dev-only
// UI-testing layer (lib/casinoPlaceholders.js, CasinoCatalog.jsx's
// PlaceholderGameCard). Matches this project's established convention: pure
// logic gets vitest unit tests (see lib/casinoPlaceholders.test.js), DOM/
// interaction behavior gets verified here via Playwright.

const ELIGIBLE_RAILS = [
  "originals-rail",
  "popular-rail",
  "new-releases-rail",
  "live-casino-rail",
  "game-shows-rail",
  "tribet-studio-rail",
];

async function gotoLobby(page) {
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
}

// The checkbox is a real <input type="checkbox"> wrapped in its own
// <label> (see DevPanel.jsx's Checkbox component) — clicking the label
// toggles it natively, so the same helper both enables and disables
// depending on the flag's current state.
async function togglePlaceholders(page) {
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
}
const enablePlaceholders = togglePlaceholders;
const disablePlaceholders = togglePlaceholders;

test.describe("Casino placeholder fixtures — Dev Panel gating", () => {
  test("disabled by default: no placeholders anywhere in a fresh session", async ({ page }) => {
    await gotoLobby(page);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
  });

  test("enabling the flag populates every eligible rail; disabling restores the real catalog only", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    for (const testId of ELIGIBLE_RAILS) {
      const count = await page.locator(`[data-test-id="${testId}"] [data-placeholder="true"]`).count();
      expect(count, `${testId} should contain at least one placeholder`).toBeGreaterThan(0);
    }

    await disablePlaceholders(page);
    await page.reload();
    await page.waitForSelector('[data-test-id="main-content"]');
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
  });
});

test.describe("Casino placeholder fixtures — ordering and overflow", () => {
  test("real games render before placeholders in the Popular rail", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    const cards = page.locator('[data-test-id="popular-rail"] [data-test-id^="game-card-"]');
    const isPlaceholderFlags = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-placeholder") === "true"));
    const firstPlaceholderIndex = isPlaceholderFlags.indexOf(true);
    expect(firstPlaceholderIndex).toBeGreaterThan(-1);
    // Nothing after the first placeholder should be a real (non-placeholder) card.
    expect(isPlaceholderFlags.slice(firstPlaceholderIndex).every(Boolean)).toBe(true);
  });

  test("each eligible rail overflows at 1920px (next-page control is enabled)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobby(page);
    await enablePlaceholders(page);
    for (const testId of ELIGIBLE_RAILS) {
      const nextBtn = page.locator(`[data-test-id="${testId}"] [aria-label^="Next "]`);
      await expect(nextBtn, `${testId} should have an enabled "next" control (overflow exists)`).toBeEnabled();
    }
  });
});

test.describe("Casino placeholder fixtures — contextual sections stay genuine", () => {
  test("Favorites rail/page receive no placeholders even with the flag on", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    await expect(page.locator('[data-test-id="favorites-rail"] [data-placeholder="true"]')).toHaveCount(0);

    await page.goto("/casino/favorites");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
    await expect(page.locator('[data-test-id^="game-card-"]')).toHaveCount(0); // genuine empty state, not filled with anything
  });

  test("Recently Played rail/page receive no placeholders even with the flag on", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    await expect(page.locator('[data-test-id="recently-played-rail"]')).toHaveCount(0); // self-hides when genuinely empty

    await page.goto("/casino/recently-played");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
    await expect(page.locator('[data-test-id^="game-card-"]')).toHaveCount(0);
  });
});

test.describe("Casino placeholder fixtures — See all pages", () => {
  test("Popular's See all page receives real games first, then placeholders", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    await page.goto("/casino/popular");
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
    await gotoLobby(page);
    await enablePlaceholders(page);
    const input = page.locator('[data-test-id="arena-search"]');
    await input.fill("placeholder");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-test-id="arena-search-panel"] [data-placeholder="true"]')).toHaveCount(0);
  });

  test("an active search query does not re-introduce placeholders into the Lobby rails", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    const input = page.locator('[data-test-id="arena-search"]');
    await input.fill("dice");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
  });
});

test.describe("Casino placeholder fixtures — interaction", () => {
  test("clicking a placeholder shows the exact message and never navigates", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    const before = page.url();
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.click();
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
    expect(page.url()).toBe(before);
    // Never mounts an active game surface.
    await expect(page.locator('[data-test-id="game-stage"]')).toHaveCount(0);
  });

  test("keyboard activation (Enter and Space) shows the same message", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
  });

  test("rapid repeated clicks never stack more than one instance of the message", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.click();
    await placeholder.click();
    await placeholder.click();
    await expect(page.getByText("It's not a real game, you fool!")).toHaveCount(1);
  });

  test("a placeholder card has no favorite control", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await expect(placeholder.locator('[data-fav]')).toHaveCount(0);
  });

  test("the accessible name states testing status, not the click message", async ({ page }) => {
    await gotoLobby(page);
    await enablePlaceholders(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await expect(placeholder).toHaveAttribute("aria-label", "Placeholder game. UI testing only.");
  });
});
