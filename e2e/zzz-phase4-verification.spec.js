import { test, expect } from "@playwright/test";

// PHASE 4 DEFINITION OF DONE — the spec explicitly requires walking both
// failure scenarios on a REAL browser back (page.goBack(), not an in-app
// router push) and reporting exactly what is observed. This file is that
// walk-through, kept as a throwaway verification artifact per this
// session's convention (e2e/zzz-*.spec.js), not a permanent regression test.

test("4b: expand a rail, enter a game, press back — scroll + expansion state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');

  // PROVIDERS RE-ENABLE: tribet-studio-rail no longer exists (the studio
  // catalog is now 3 providers of ~4 games each, well under the 8-item
  // page size) — New Releases (6 real) + placeholders on is the reliable
  // Load More target now. New Releases mixes onchain and provider games,
  // so the card picked below is scoped to a `provider:`-prefixed favId
  // specifically (vendored games) — not gated by the onchain
  // ensureAuth()/wallet.connect() flow that Originals-style onchain games
  // go through, so clicking it navigates straight into the game page.
  await page.keyboard.press("Shift+D");
  await page.waitForSelector("text=Developer Panel");
  await page.locator('label:has-text("Populate rails with placeholder tiles")').click();
  await page.locator('button[aria-label="Close Developer Panel"]').click();
  await page.waitForTimeout(200);

  // SCROLL/OVERFLOW TESTING PASS: placeholders now top every rail up to a
  // flat 24 (see PLACEHOLDER_TARGET_TOTAL) — New Releases (6 real) totals
  // 24, needing two Load More clicks (8 -> 16 -> 24) to fully exhaust.
  const loadMore = page.locator('[data-test-id="new-releases-rail-load-more"]');
  await loadMore.scrollIntoViewIfNeeded();
  await loadMore.click();
  await page.waitForTimeout(200);
  await loadMore.click();
  await page.waitForTimeout(200);

  // Confirm the rail is actually fully expanded (Load More control gone).
  await expect(loadMore).toHaveCount(0);

  // Scroll to the game card we're about to click FIRST (Playwright's own
  // click() auto-scrolls its target into view, which would silently move
  // scrollTop out from under a value set beforehand) — only then read the
  // real, settled scrollTop that will actually be in effect at launch time.
  const card = page.locator('[data-test-id="new-releases-rail"] a[data-test-id^="game-card-provider-"]').first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  const scrollBefore = await page.evaluate(
    () => document.querySelector('[data-test-id="main-content"]').scrollTop
  );

  // Enter a game from within the now-expanded rail.
  await card.click();
  await page.waitForSelector('[data-test-id="casino-game-page"]');

  // REAL browser back — not an in-app router push.
  await page.goBack();
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(500);

  const stillExpanded = await page.locator('[data-test-id="new-releases-rail-load-more"]').count();
  const scrollAfter = await page.evaluate(
    () => document.querySelector('[data-test-id="main-content"]').scrollTop
  );

  console.log(`[4b] scrollTop before game: ${scrollBefore}`);
  console.log(`[4b] scrollTop after browser back: ${scrollAfter}`);
  console.log(`[4b] Load More button count after back (0 = still expanded, kept its depth): ${stillExpanded}`);

  expect(stillExpanded).toBe(0); // rail stayed expanded — depth survived the round trip
  expect(Math.abs(scrollAfter - scrollBefore)).toBeLessThan(20); // scroll position restored to the exact prior value
});

test("4a: open a modal via its URL, press back — modal closes and URL reverts", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');

  const urlBefore = page.url();

  // Responsible Gaming / Support are reachable via the Profile menu in
  // every auth state (guest included) — unlike Fund/Wallet, they aren't
  // gated behind ensureAuth()'s wallet.connect() branch.
  await page.locator('[data-test-id="profile-trigger"]').click();
  await page.waitForTimeout(150);
  await page.getByRole("menuitem", { name: "Responsible Gaming" }).click();
  await page.waitForTimeout(300);

  const urlWithModal = page.url();
  const modalParamOpen = new URL(urlWithModal).searchParams.get("modal");
  console.log(`[4a] URL before opening modal: ${urlBefore}`);
  console.log(`[4a] URL after opening modal: ${urlWithModal} (modal param = ${modalParamOpen})`);
  expect(modalParamOpen).toBeTruthy();

  const dialogVisibleBefore = await page.locator('[role="dialog"]').count();
  console.log(`[4a] visible dialog count while modal open: ${dialogVisibleBefore}`);

  // REAL browser back.
  await page.goBack();
  await page.waitForTimeout(300);

  const urlAfter = page.url();
  const modalParamAfter = new URL(urlAfter).searchParams.get("modal");
  const dialogVisibleAfter = await page.locator('[role="dialog"]').count();

  console.log(`[4a] URL after browser back: ${urlAfter} (modal param = ${modalParamAfter})`);
  console.log(`[4a] visible dialog count after back: ${dialogVisibleAfter}`);

  expect(modalParamAfter).toBeFalsy();
  expect(dialogVisibleAfter).toBe(0);
  expect(urlAfter).toBe(urlBefore);
});

test("4c: Escape and click-outside still dismiss the search overlay", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');

  const searchInput = page.locator('[data-test-id="arena-search"]');
  await searchInput.click();
  await page.waitForTimeout(150);
  const panelVisible = await page.locator('[data-test-id="arena-search-panel"]').count();
  console.log(`[4c] search panel present after focusing search: ${panelVisible}`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const panelAfterEscape = await page.locator('[data-test-id="arena-search-panel"]').count();
  console.log(`[4c] search panel present after Escape: ${panelAfterEscape}`);
  expect(panelAfterEscape).toBe(0);

  // Click-outside: a FRESH page load, not a re-click of the same input —
  // Escape closes the panel but leaves the input focused (see onKeyDown),
  // so re-clicking an already-focused input fires no new `focus` event and
  // never reopens it. A reload guarantees a genuine open->outside-click.
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await searchInput.click();
  await page.waitForTimeout(150);
  await expect(page.locator('[data-test-id="arena-search-panel"]')).toHaveCount(1);

  const urlBeforeOutsideClick = page.url();
  const sidebarRow = page.locator("#nav-item-Popular-expanded");
  await sidebarRow.click({ force: true });
  await page.waitForTimeout(150);
  const panelAfterOutsideClick = await page.locator('[data-test-id="arena-search-panel"]').count();
  const urlAfterOutsideClick = page.url();
  console.log(`[4c] search panel present after outside click: ${panelAfterOutsideClick}`);
  console.log(`[4c] URL unchanged by the absorbed click (spec §8 requires true): ${urlAfterOutsideClick === urlBeforeOutsideClick} (before=${urlBeforeOutsideClick}, after=${urlAfterOutsideClick})`);
  expect(panelAfterOutsideClick).toBe(0);
  expect(urlAfterOutsideClick).toBe(urlBeforeOutsideClick);
});
