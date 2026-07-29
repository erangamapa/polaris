import { test, expect } from "@playwright/test";

// CASINO PLACEHOLDER FIXTURES — regression coverage for the dev-only
// UI-testing layer (lib/casinoPlaceholders.js, CasinoCatalog.jsx's
// PlaceholderGameCard). Matches this project's established convention: pure
// logic gets vitest unit tests (see lib/casinoPlaceholders.test.js), DOM/
// interaction behavior gets verified here via Playwright.
//
// DEFAULT FLIPPED TO ON (explicit request, 2026): `casinoPlaceholderRails`
// in lib/devMock.js now defaults to `true`, so every visitor sees populated
// rails without touching the Dev Panel — this used to be opt-in only. Every
// test below no longer needs to explicitly enable the flag; the "gating"
// describe block instead verifies the new default directly and that a
// developer can still turn it off via the panel.

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
// toggles it natively, so this same helper both enables and disables
// depending on the flag's current state (now defaults checked).
async function togglePlaceholders(page) {
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
}

test.describe("Casino placeholder fixtures — Dev Panel gating", () => {
  test("enabled by default: placeholders present in a fresh session", async ({ page }) => {
    await gotoLobby(page);
    for (const testId of ELIGIBLE_RAILS) {
      const count = await page.locator(`[data-test-id="${testId}"] [data-placeholder="true"]`).count();
      expect(count, `${testId} should contain at least one placeholder by default`).toBeGreaterThan(0);
    }
  });

  test("a developer can still disable the flag via the Dev Panel, and re-enable it", async ({ page }) => {
    await gotoLobby(page);
    await togglePlaceholders(page); // default is on -> this disables it
    await page.reload();
    await page.waitForSelector('[data-test-id="main-content"]');
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);

    await togglePlaceholders(page); // re-enable
    for (const testId of ELIGIBLE_RAILS) {
      const count = await page.locator(`[data-test-id="${testId}"] [data-placeholder="true"]`).count();
      expect(count, `${testId} should contain at least one placeholder`).toBeGreaterThan(0);
    }
  });
});

test.describe("Casino placeholder fixtures — ordering and overflow", () => {
  test("real games render before placeholders in the Popular rail", async ({ page }) => {
    await gotoLobby(page);
    const cards = page.locator('[data-test-id="popular-rail"] [data-test-id^="game-card-"]');
    const isPlaceholderFlags = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("data-placeholder") === "true"));
    const firstPlaceholderIndex = isPlaceholderFlags.indexOf(true);
    expect(firstPlaceholderIndex).toBeGreaterThan(-1);
    // Nothing after the first placeholder should be a real (non-placeholder) card.
    expect(isPlaceholderFlags.slice(firstPlaceholderIndex).every(Boolean)).toBe(true);
  });

  // LOBBY HIERARCHY PASS: this used to assert every eligible rail overflows
  // at 1920px, back when placeholders always topped every rail up to a flat
  // 14 tiles regardless of real content — a section with 1 real game got 13
  // fake ones just to guarantee overflow for this test. That's exactly the
  // "wall of fake cards" the hierarchy pass rules out (see
  // lib/casinoPlaceholders.js and LobbyDashboard's `withPlaceholders`:
  // placeholders are now capped at the real game count, so a sparse
  // section — Popular has 4 real games, Live Casino/Game Shows have 1 each
  // — stays sparse and honest instead of padded to force a scrollbar).
  // Rails with enough real content (Originals/New Releases/Tribet Studio)
  // still overflow and still exercise the carousel; the sparse ones now
  // correctly show a disabled "next" control instead, which is the other
  // half of this same regression check — not a separate, unrelated
  // assertion, but the direct consequence of "never more placeholders than
  // real games" being true.
  test("rails with enough content overflow at 1920px; sparse rails correctly do not", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await gotoLobby(page);

    const OVERFLOWING = ["originals-rail", "new-releases-rail", "tribet-studio-rail"];
    const SPARSE = ["popular-rail", "live-casino-rail", "game-shows-rail"];

    for (const testId of OVERFLOWING) {
      const nextBtn = page.locator(`[data-test-id="${testId}"] [aria-label^="Next "]`);
      await expect(nextBtn, `${testId} should have an enabled "next" control (overflow exists)`).toBeEnabled();
    }
    for (const testId of SPARSE) {
      const nextBtn = page.locator(`[data-test-id="${testId}"] [aria-label^="Next "]`);
      await expect(nextBtn, `${testId} should have a disabled "next" control (real content is sparse, not padded to force overflow)`).toBeDisabled();
    }
  });
});

test.describe("Casino placeholder fixtures — contextual sections stay genuine", () => {
  test("Favorites rail/page receive no placeholders even with the flag on", async ({ page }) => {
    await gotoLobby(page);
    await expect(page.locator('[data-test-id="favorites-rail"] [data-placeholder="true"]')).toHaveCount(0);

    await page.goto("/casino/favorites");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
    await expect(page.locator('[data-test-id^="game-card-"]')).toHaveCount(0); // genuine empty state, not filled with anything
  });

  test("Recently Played rail/page receive no placeholders even with the flag on", async ({ page }) => {
    await gotoLobby(page);
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
    const input = page.locator('[data-test-id="arena-search"]');
    await input.fill("placeholder");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-test-id="arena-search-panel"] [data-placeholder="true"]')).toHaveCount(0);
  });

  test("an active search query does not re-introduce placeholders into the Lobby rails", async ({ page }) => {
    await gotoLobby(page);
    const input = page.locator('[data-test-id="arena-search"]');
    await input.fill("dice");
    await page.waitForTimeout(200);
    await expect(page.locator('[data-placeholder="true"]')).toHaveCount(0);
  });
});

test.describe("Casino placeholder fixtures — interaction", () => {
  test("clicking a placeholder shows the exact message and never navigates", async ({ page }) => {
    await gotoLobby(page);
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
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
    await page.keyboard.press("Space");
    await expect(page.getByText("It's not a real game, you fool!")).toBeVisible();
  });

  test("rapid repeated clicks never stack more than one instance of the message", async ({ page }) => {
    await gotoLobby(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await placeholder.click();
    await placeholder.click();
    await placeholder.click();
    await expect(page.getByText("It's not a real game, you fool!")).toHaveCount(1);
  });

  test("a placeholder card has no favorite control", async ({ page }) => {
    await gotoLobby(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await expect(placeholder.locator('[data-fav]')).toHaveCount(0);
  });

  test("the accessible name states testing status, not the click message", async ({ page }) => {
    await gotoLobby(page);
    const placeholder = page.locator('[data-placeholder="true"]').first();
    await expect(placeholder).toHaveAttribute("aria-label", "Placeholder game. UI testing only.");
  });
});
