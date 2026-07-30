import { test } from "@playwright/test";

// PHASE 5 — ACCEPTANCE. Walks as many of §11's literal criteria as can be
// live-exercised against the running app, logging exactly what was
// observed at each URL/interaction. Not a pass/fail assertion file (this
// is a discovery/reporting pass, not a regression gate) — the actual
// verdicts are written up separately based on this output plus code review
// for structural/static items that don't need a browser.

test("routing: literal spec paths", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/casino/home/live-casino");
  await page.waitForTimeout(300);
  console.log(`[routing] /casino/home/live-casino -> resolved URL: ${page.url()}`);
  console.log(`[routing] chip rail present: ${await page.locator('[data-test-id^="category-nav-"]').count()}`);

  await page.goto("/casino/lobby/live-casino");
  await page.waitForTimeout(300);
  console.log(`[routing] /casino/lobby/live-casino (our actual "home" route) -> URL: ${page.url()}`);
  console.log(`[routing] chip rail present: ${await page.locator('[data-test-id^="category-nav-"]').count()}`);
  console.log(`[routing] rail (horizontal scroll) sections present: ${await page.locator('section[data-test-id$="-rail"]').count()}`);

  await page.goto("/casino/category/live-casino");
  await page.waitForTimeout(300);
  console.log(`[routing] /casino/category/live-casino -> URL: ${page.url()}`);
  console.log(`[routing] chip rail present: ${await page.locator('[data-test-id^="category-nav-"]').count()}`);
  console.log(`[routing] filter select present: ${await page.locator('[data-test-id="category-filter"]').count()}`);
  console.log(`[routing] sort select present: ${await page.locator('[data-test-id="category-sort"]').count()}`);
  console.log(`[routing] wallet promo tile present (promo strip marker): ${await page.locator('[data-test-id="wallet-tile-view"], [data-test-id="wallet-tile-connect"]').count()}`);

  // PROVIDERS RE-ENABLE: provider-1/2/3 are now real (this used to be the
  // spec's illustrative slug vs. our then-only-real "tribet-studio" — that
  // gap is closed now, both resolve the same real provider).
  await page.goto("/casino/provider/provider-1");
  await page.waitForTimeout(300);
  console.log(`[routing] /casino/provider/provider-1 -> URL: ${page.url()}, h1: ${(await page.locator("h1").first().textContent().catch(() => null))}`);
  console.log(`[routing] provider filter present on provider page: ${await page.locator('[data-test-id="category-filter"]').count()}`);
});

test("search: scope counts + empty state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.locator('[data-test-id="arena-search"]').click();
  await page.waitForTimeout(200);
  const scopeButtonText = await page.locator('[data-test-id="search-scope"]').textContent();
  console.log(`[search] scope trigger text (does it show a count?): "${scopeButtonText}"`);
  await page.locator('[data-test-id="search-scope"]').click();
  await page.waitForTimeout(150);
  const scopeMenuText = await page.locator('[role="radiogroup"]').first().innerText({ timeout: 2000 }).catch(() => "n/a");
  console.log(`[search] scope dropdown full text (checking for counts per scope): ${JSON.stringify(scopeMenuText)}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  const panelText = await page.locator('[data-test-id="arena-search-panel"]').innerText({ timeout: 2000 }).catch(() => "");
  console.log(`[search] empty-state panel text sample: ${JSON.stringify(panelText.slice(0, 300))}`);
});

// HEART REDESIGN — the Follow-writes-to-Following round trip this test used
// to exercise no longer applies: the Following feature has been removed
// entirely. Kept as a tile-shape/count check plus a removal verification.
test("providers: tile shapes, no Follow control anywhere", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/collection/provider");
  await page.waitForSelector('[data-test-id="main-content"]');
  const providerCount = await page.locator('a[data-test-id^="provider-tile-"], [data-test-id^="provider-tile-"]').count();
  console.log(`[providers] tiles found on /casino/collection/provider: ${providerCount}`);

  await page.goto("/casino/provider/provider-1");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(200);
  const followCount = await page.locator('[data-test-id^="follow-provider-"]').count();
  console.log(`[providers] follow-provider-* controls on provider detail page: ${followCount}`);
});

test("content rules + layout: coming soon, filled buttons, sidebar rows", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  const myBets = await page.getByText("My Bets", { exact: false }).count();
  console.log(`[layout] "My Bets" text found anywhere in sidebar/page: ${myBets}`);

  // Restricted to global chrome only (header + sidebar) — not the whole
  // page, which would also catch in-content active-pill/selected-state
  // background tints that are a different visual language, not "filled
  // CTA buttons."
  const filledButtons = await page.evaluate(() => {
    const scopes = Array.from(document.querySelectorAll("header, aside"));
    const candidates = scopes.flatMap((scope) => Array.from(scope.querySelectorAll("button, a")));
    const isFilled = (el) => {
      const bg = getComputedStyle(el).backgroundColor;
      return bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
    };
    return candidates.filter((el) => el.offsetParent !== null && isFilled(el)).map((el) => el.textContent?.trim().slice(0, 30) || el.getAttribute("aria-label") || el.getAttribute("data-test-id"));
  });
  console.log(`[layout] visible header/sidebar elements with a non-transparent background: ${JSON.stringify(filledButtons)}`);
});

test("count badges: logged-out PERSONAL band state", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
  await page.waitForTimeout(300);
  const favBadge = await page.locator('[data-test-id="sidebar-favorites-count"]').innerText().catch(() => "(not present)");
  console.log(`[badges] Favorites row content (fresh/logged-out session): "${favBadge}"`);
  const anyBadgeInSidebar = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    if (!aside) return "no aside found";
    return Array.from(aside.querySelectorAll("[aria-label*='favorite'], [aria-label*='Favorite']")).map((el) => el.getAttribute("aria-label"));
  });
  console.log(`[badges] aria-labels mentioning favorite in sidebar: ${JSON.stringify(anyBadgeInSidebar)}`);
});
