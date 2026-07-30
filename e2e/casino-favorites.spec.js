import { test, expect } from "@playwright/test";

// CASINO FAVORITES REGRESSION — covers a bug where the heart toggle's toast
// ("Added to Favorites" / "Removed from Favorites") fired correctly while
// the actual favorite state, heart icon, Favorites rail/page and count all
// stayed visually frozen. Root cause: App.jsx's `effectiveIsFav` — the
// value every heart/Favorites surface actually reads through — defers to a
// FIXED, mock answer whenever the Dev Panel's `favoritesPreset` isn't
// "default" (see devMock.js), completely ignoring the real `favs` Set that
// `toggleFav` was (and always had been) correctly mutating. If that mock
// preset is left non-default in a session (sessionStorage-persisted, no
// visual indicator it's active), every real click looked identically
// broken in both directions while the toast/telemetry beneath it kept
// firing normally — exactly the reported symptom. Fixed in App.jsx's
// `toggleFav`: a real, user-initiated toggle now resets `favoritesPreset`
// back to "default" first, so a genuine action always supersedes a stale
// preview instead of being silently absorbed by it. Also hardened the
// same function against a rapid-click race (reading `favs` from the
// closure rather than the functional `setFavs` form could let two clicks
// fired before a re-render both compute from the same stale snapshot).

async function gotoLobby(page) {
  await page.goto("/casino/lobby");
  await page.waitForSelector('[data-test-id="main-content"]');
}

async function setDevMock(page, patch) {
  await page.addInitScript((patch) => {
    window.sessionStorage.setItem(
      "tribet-dev-panel-state",
      JSON.stringify({
        version: 2,
        panelOpen: false,
        authStatus: "default",
        walletStatus: "default",
        balancePreset: "default",
        platformScope: "full",
        favoritesPreset: "default",
        recentlyPlayedPreset: "default",
        ...patch,
      })
    );
  }, patch);
}

// PLAYER SETTINGS MIGRATION: favorites moved off the old standalone
// `tribet_favs` localStorage key onto the shared player-settings envelope
// (see lib/playerSettingsStorage.js / lib/usePlayerSettings.jsx) —
// `tribet.settings.v1.device` for a disconnected/no-wallet session (every
// test in this file), `data.casino.favorites` inside that envelope.
async function readStoredFavorites(page) {
  const raw = await page.evaluate(() => localStorage.getItem("tribet.settings.v1.device"));
  const envelope = raw ? JSON.parse(raw) : null;
  return envelope?.data?.casino?.favorites ?? [];
}

// Scoped to a single rail so the locator can't match the same game's card
// twice once it also appears in the Favorites rail.
function heartIn(page, railTestId, gameTestId) {
  return page
    .locator(`[data-test-id="${railTestId}"]`)
    .locator(`[data-test-id="${gameTestId}"]`)
    .locator("xpath=..")
    .locator("[data-fav]");
}

test.describe("Favorites toggle — core state flow", () => {
  // FAVORITES LOBBY REMOVAL: there is no more favorites-rail — Favorites is
  // a dedicated sidebar destination now (see casino-lobby-visual-refresh.
  // spec.js's own "Favorites section" describe block for the "reachable and
  // launchable from there" coverage). This test now checks the sidebar
  // count directly instead of a rail that no longer exists.
  test("unfavorited card: heart activates, sidebar count updates, no navigation, correct toast", async ({ page }) => {
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await expect(heart).toHaveAttribute("aria-pressed", "false");

    await heart.click();

    // 1. Card must not launch/navigate.
    expect(page.url()).not.toContain("play=");
    // 2 & 3. Canonical state + icon update immediately.
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await expect(heart.locator("svg")).toHaveClass(/fill-\[var\(--favorite-heart\)\]/);
    // 4. Sidebar count updates immediately.
    await expect(page.locator('[data-test-id="sidebar-favorites-count"]').getByText("1", { exact: true })).toBeVisible();
    // 5. There is still no favorites-rail anywhere in the Lobby.
    await expect(page.locator('[data-test-id="favorites-rail"]')).toHaveCount(0);
    // 7. Toast reflects the real, final state.
    await expect(page.getByText("Added to Favorites")).toBeVisible();
  });

  test("favorited card: heart deactivates, disappears from Favorites, correct toast", async ({ page }) => {
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    await heart.click();

    expect(page.url()).not.toContain("play=");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    // Sidebar count badge hides entirely at zero (existing convention).
    await expect(page.locator('[data-test-id="sidebar-favorites-count"] [aria-label*="favorite" i]')).toHaveCount(0);
    await expect(page.getByText("Removed from Favorites")).toBeVisible();
  });

  test("persistence: localStorage reflects the toggled state", async ({ page }) => {
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await heart.click();
    await expect(heart).toHaveAttribute("aria-pressed", "true");

    const favorites = await readStoredFavorites(page);
    expect(favorites).toContain("casino:dice");
  });

  test("state survives a page refresh", async ({ page }) => {
    await gotoLobby(page);
    await heartIn(page, "originals-rail", "game-card-casino-dice").click();
    await expect(heartIn(page, "originals-rail", "game-card-casino-dice")).toHaveAttribute("aria-pressed", "true");

    await page.reload();
    await page.waitForSelector('[data-test-id="main-content"]');
    await expect(heartIn(page, "originals-rail", "game-card-casino-dice")).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Favorites toggle — click isolation", () => {
  test("heart click does not launch the game or trigger the card's own action", async ({ page }) => {
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await heart.click();
    await page.waitForTimeout(150);
    expect(page.url()).toContain("/casino/lobby");
    expect(page.url()).not.toContain("play=");
    // The underlying game link/button never received the click either — and
    // FAVORITES LOBBY REMOVAL means there's no favorites-rail to duplicate
    // the card into anymore, so exactly one copy is the correct count now.
    await expect(page.locator('[data-test-id="game-card-casino-dice"]')).toHaveCount(1);
  });

  test("keyboard activation (Enter and Space) toggles the heart", async ({ page }) => {
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await heart.focus();
    await page.keyboard.press("Enter");
    await expect(heart).toHaveAttribute("aria-pressed", "true");
    await page.keyboard.press(" ");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
  });

});

test.describe("Favorites toggle — robustness", () => {
  // LOBBY HIERARCHY PASS: switched from two racing `heart.click()` calls to
  // two rapid keyboard activations. This test exists to verify App.jsx's
  // functional setState guard against a stale-closure race in the toggle
  // handler itself — it was never about whether two physical mouse clicks
  // can land on a moving target. Favoriting Dice inserts the whole
  // Favorites rail above Tribet Originals (pre-existing behavior, not new
  // this pass), shifting Originals — and this heart — further down the
  // page; the hierarchy pass's own larger inter-section gap before
  // Originals amplified that shift enough to occasionally beat Playwright's
  // per-click actionability re-check, making the SECOND mouse click land at
  // a stale pre-reflow coordinate and silently miss the (moved) heart. Two
  // `keyboard.press("Enter")` calls on the already-focused heart don't
  // depend on screen position at all, so they exercise the exact same
  // rapid-toggle race in App.jsx without being coupled to how far the page
  // happens to reflow in between.
  test("rapid double-activation nets out to the original state, no corruption", async ({ page }) => {
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await expect(heart).toHaveAttribute("aria-pressed", "false");
    await heart.focus();

    await Promise.all([page.keyboard.press("Enter"), page.keyboard.press("Enter")]);
    await page.waitForTimeout(300);

    expect(await heart.getAttribute("aria-pressed")).toBe("false");
    const favorites = await readStoredFavorites(page);
    expect(favorites).not.toContain("casino:dice");
  });

  // Placeholder-specific behavior (click-to-toast, no favorite heart, never
  // mixed into Favorites/Recently Played) already has its own dedicated
  // suite — see casino-placeholder-fixtures.spec.js's "a placeholder card
  // has no favorite control" and related tests. Not duplicated here.

  test("Dev Panel favoritesPreset mock never masks a real toggle (the regression this file guards)", async ({ page }) => {
    await setDevMock(page, { favoritesPreset: "populated" });
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await expect(heart).toBeVisible();

    await heart.click();
    await page.waitForTimeout(150);

    // The mock preset must be superseded by the real action...
    const preset = await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("tribet-dev-panel-state")).favoritesPreset
    );
    expect(preset).toBe("default");
    // ...and the real, persisted state must reflect the actual toggle.
    const favorites = await readStoredFavorites(page);
    expect(favorites).toContain("casino:dice");
    await expect(heart).toHaveAttribute("aria-pressed", "true");
  });
});

// WALLET-SYNC HYDRATION TOAST — separate regression from the mock-preset
// bug above. App.jsx's account-favorites merge effect (keyed on
// `[wallet.isConnected, wallet.address]`) used to unconditionally show
// `toast.success("Synced N favorites from your wallet")` whenever it merged
// in any new id — including on ROUTINE hydration (initial load with an
// already-connected wallet, a plain refresh, a hard refresh, reconnecting
// the same wallet), since the ref that guards against re-merging the same
// address always starts back at null on a fresh page load. Fixed by
// removing the success toast from that hydration path entirely — this app
// has no separate "manual sync" action anywhere, so every call site was
// routine background sync and none of them should ever have shown it.
//
// NOTE ON COVERAGE: `useWallet()` wraps real wagmi hooks with no
// Dev-Panel-mockable override (confirmed directly in source — App.jsx's
// `wallet` variable is the raw `useWallet()`, never the dev-aware wrapper;
// only a separate `devWallet` variable used elsewhere is mockable), so this
// suite cannot literally simulate "page loads with an already-connected
// wallet" without injecting a real EIP-1193 provider. What IS verified
// here: (a) the merge/dedup logic itself is unit-tested and untouched by
// this fix (see casinoFavorites.test.js's mergeAccountFavorites suite,
// unchanged); (b) no wallet-sync toast text appears during any normal
// load/refresh, a real regression guard against ever reintroducing an
// unconditional toast on mount; (c) the one remaining, always-reachable
// success toast (manual add/remove) still fires correctly and is
// unaffected, proving the fix didn't touch toast plumbing in general.
test.describe("Wallet-sync hydration must stay silent", () => {
  test("no 'Synced ... favorites' toast appears on initial load", async ({ page }) => {
    await gotoLobby(page);
    await page.waitForTimeout(500); // give any startup effect time to fire
    await expect(page.getByText(/Synced .* favorites? from your wallet/)).toHaveCount(0);
  });

  test("no 'Synced ... favorites' toast appears after a refresh", async ({ page }) => {
    await gotoLobby(page);
    await page.reload();
    await page.waitForSelector('[data-test-id="main-content"]');
    await page.waitForTimeout(500);
    await expect(page.getByText(/Synced .* favorites? from your wallet/)).toHaveCount(0);
  });

  test("manual add/remove feedback is unaffected by the hydration-toast fix", async ({ page }) => {
    await gotoLobby(page);
    const heart = heartIn(page, "originals-rail", "game-card-casino-dice");
    await heart.click();
    await expect(page.getByText("Added to Favorites")).toBeVisible();
    await heart.click();
    await expect(page.getByText("Removed from Favorites")).toBeVisible();
  });
});
