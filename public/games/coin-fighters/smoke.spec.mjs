/**
 * Coin Fighters — automated smoke suite (CF-SMOKE-01…08)
 *
 *   npx playwright test --config=public/games/coin-fighters/playwright.config.mjs
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.CF_BASE_URL || 'http://127.0.0.1:4177/games/coin-fighters/index.html';

async function waitReady(page) {
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  for (let i = 0; i < 5; i++) {
    const select = page.locator('#charSelect:not([hidden])');
    const loadErr = page.locator('#overlayTitle', { hasText: 'LOAD ERROR' });
    await Promise.race([
      select.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
      loadErr.waitFor({ state: 'visible', timeout: 20000 }).catch(() => null),
    ]);
    if (await select.isVisible().catch(() => false)) {
      await page.waitForFunction(() => window.__cfGame != null, null, { timeout: 10000 });
      return;
    }
    await page.reload({ waitUntil: 'domcontentloaded' });
  }
  throw new Error('Game never reached character select (asset load failed)');
}

async function startFight(page) {
  await page.locator('#skipVideosToggle').check({ force: true });
  await page.locator('#btnToggleMusic').click().catch(() => {});
  await page.locator('#btnToggleSfx').click().catch(() => {});
  await page.locator('#btnFight').click();
  await expect(page.locator('#charSelect')).toBeHidden({ timeout: 10000 });
  await expect(page.locator('#btnHi')).toBeEnabled({ timeout: 8000 });
}

async function waitBetting(page) {
  await expect(page.locator('#btnHi')).toBeEnabled({ timeout: 25000 });
}

/** Force the next flip outcome without relying on RNG. */
async function forceNext(page, playerWon) {
  await page.evaluate((won) => {
    const g = window.__cfGame;
    const fair = g.fairness;
    const orig = fair.nextCard.bind(fair);
    fair.nextCard = async (choice = 'HEADS') => {
      fair.nextCard = orig;
      const face = won ? choice : choice === 'HEADS' ? 'PAWS' : 'HEADS';
      fair.lastRoll = won ? 0.01 : 0.99;
      fair.lastOutcome = face;
      fair.nonce += 1;
      return { face, isHeads: face === 'HEADS', playerWon: won, roll: fair.lastRoll };
    };
  }, playerWon);
}

test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page }) => {
  await waitReady(page);
});

test('CF-SMOKE-01 load → character select', async ({ page }) => {
  await expect(page.locator('#charSelect')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SELECT YOUR FIGHTER' })).toBeVisible();
  await expect(page.locator('.char-card[data-char="rookie"]')).toBeVisible();
  await expect(page.locator('.char-card[data-char="trump"]')).toBeVisible();
  await expect(page.locator('#portraitRookie')).toHaveAttribute('src', /.+/);
  await expect(page.locator('#portraitTrump')).toHaveAttribute('src', /.+/);
});

test('CF-SMOKE-02 FIGHT → betting enabled', async ({ page }) => {
  await startFight(page);
  await expect(page.locator('#balanceValue')).toHaveText('1000');
  await expect(page.locator('#betInput')).toHaveValue('10');
  await expect(page.locator('#btnHi')).toBeEnabled();
  await expect(page.locator('#btnLo')).toBeEnabled();
  await expect(page.locator('#btnCashOut')).toBeDisabled();
  await expect(page.locator('#btnCharSelect')).toBeVisible();
});

test('CF-SMOKE-03 win path', async ({ page }) => {
  await startFight(page);
  await forceNext(page, true);
  await page.locator('#btnHi').click();
  await waitBetting(page);
  await expect(page.locator('#roundHistory')).toContainText('W');
  await expect(page.locator('#btnCashOut')).toBeEnabled();
  const win = Number(await page.locator('#winValue').textContent());
  expect(win).toBeGreaterThanOrEqual(20);
  const bal = Number(await page.locator('#balanceValue').textContent());
  expect(bal).toBe(990);
});

test('CF-SMOKE-04 lose path', async ({ page }) => {
  await startFight(page);
  await forceNext(page, false);
  await page.locator('#btnLo').click();
  await waitBetting(page);
  await expect(page.locator('#roundHistory')).toContainText('L');
  await expect(page.locator('#btnCashOut')).toBeDisabled();
  const bal = Number(await page.locator('#balanceValue').textContent());
  expect(bal).toBe(990);
});

test('CF-SMOKE-05 cash out', async ({ page }) => {
  await startFight(page);
  await forceNext(page, true);
  await page.locator('#btnHi').click();
  await waitBetting(page);
  const before = Number(await page.locator('#balanceValue').textContent());
  const payout = Number(await page.locator('#winValue').textContent());
  await page.locator('#btnCashOut').click();
  await expect(page.locator('#btnCashOut')).toBeDisabled();
  const after = Number(await page.locator('#balanceValue').textContent());
  expect(after).toBe(before + payout);
});

test('CF-SMOKE-06 CHANGE returns to select', async ({ page }) => {
  await startFight(page);
  await page.locator('#btnCharSelect').click();
  await expect(page.locator('#charSelect')).toBeVisible({ timeout: 8000 });
  await expect(page.locator('#btnHi')).toBeDisabled();
});

test('CF-SMOKE-07 Fairness modal', async ({ page }) => {
  await startFight(page);
  await expect(page.locator('#rtpPercent')).toHaveText(/97%/);
  await page.locator('#btnFairness').click();
  await expect(page.locator('#fairnessModal')).toBeVisible();
  await expect(page.locator('#rtpHash')).not.toHaveText('—');
  await expect(page.locator('#rtpClient')).not.toHaveText('—');
  await page.locator('#btnCloseFairness').click();
  await expect(page.locator('#fairnessModal')).toBeHidden();
});

test('CF-SMOKE-08 stage right edge not a black bar after hit', async ({ page }) => {
  await startFight(page);
  await forceNext(page, true);
  await page.locator('#btnHi').click();
  await waitBetting(page);
  // Give a frame for render after resolve
  await page.waitForTimeout(200);
  const fill = await page.evaluate(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    // Re-draw isn't needed — last RAF frame is on the buffer. Sample CSS-pixel space via dpr.
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.width / dpr;
    const cssH = canvas.height / dpr;
    const x = Math.floor((cssW - 3) * dpr);
    let nonBlack = 0;
    let samples = 0;
    for (let yCss = Math.floor(cssH * 0.25); yCss < Math.floor(cssH * 0.75); yCss += 3) {
      const y = Math.floor(yCss * dpr);
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
      samples += 1;
      if (r + g + b > 40) nonBlack += 1;
    }
    return { nonBlack, samples };
  });
  expect(
    fill.nonBlack / fill.samples,
    `right-edge fill ratio ${fill.nonBlack}/${fill.samples}`
  ).toBeGreaterThan(0.15);
});
