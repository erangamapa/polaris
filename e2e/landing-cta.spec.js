import { test, expect } from '@playwright/test';
import { BGAMING_GAMES } from '../src/lib/catalog/adapters/bgaming.games.js';

test('static game links resolve to catalogue entries and FAQ schema matches visible text', async ({ page }) => {
  await page.goto('/');
  const links = await page.locator('.featured-game').evaluateAll((els) => els.map((e) => ({ href: e.getAttribute('href'), title: e.querySelector('.featured-game__title').textContent })));
  expect(links).toHaveLength(12);
  for (const link of links) {
    const key = new URL(link.href, 'https://tribet.gg').searchParams.get('play');
    const game = BGAMING_GAMES.find((g) => `bgaming:${g.slug}` === key);
    expect(game?.title).toBe(link.title);
    expect(Date.parse(game.released)).toBeLessThanOrEqual(Date.now());
  }
  const data = await page.evaluate(() => {
    const json = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => {
      const v = JSON.parse(s.textContent); return v['@graph'] ?? [v];
    });
    return {
      schema: json.find((x) => x['@type'] === 'FAQPage').mainEntity.map((x) => [x.name, x.acceptedAnswer.text]),
      visible: [...document.querySelectorAll('.faq-item')].map((x) => [x.querySelector('summary').textContent.trim(), x.querySelector('p').textContent.trim()]),
      dead: [...document.querySelectorAll('a')].filter((a) => !a.getAttribute('href') || a.getAttribute('href') === '#').length,
    };
  });
  expect(data.schema).toEqual(data.visible);
  expect(data.dead).toBe(0);
});

for (const width of [1440, 768, 390]) {
  test(`landing layout and images at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.locator('#faq').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.featured-game img').evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0)), { timeout: 25000 }).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const columns = await page.locator('.featured-games').evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(columns).toBe(width >= 1024 ? 6 : width > 600 ? 3 : 2);
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });
  });
}

test('wallet CTA opens the actual connection picker, not just the lobby', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Connect wallet', exact: true }).click();
  await expect(page.locator('w3m-modal')).toHaveAttribute('open', '', { timeout: 20000 });
  await expect(page.getByText('MetaMask', { exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(/modal=connect/);
  // No wallet selection, connection, signature or transaction is performed.
});

test('game card opens its own game page and help links resolve', async ({ page }) => {
  await page.goto('/');
  await page.locator('.featured-game').first().click();
  await expect(page.locator('[data-test-id="game-player-frame"]')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('[data-test-id="game-header"]')).toContainText('Alien Fruits');
  await page.goto('/help.html');
  await expect(page.getByRole('heading', { name: 'Game & wallet guide', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Open responsible gaming settings →' }).click();
  await expect(page.getByRole('dialog')).toBeVisible({ timeout: 20000 });
});
