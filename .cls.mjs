import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await p.goto('https://tribet.gg/casino/lobby', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2500);
const r = await p.evaluate(() => {
  const col = document.querySelector('[data-test-id="arena-page-column"]');
  const kids = col ? [...col.children].filter(k => k.getBoundingClientRect().height > 0) : [];
  return {
    found: Boolean(col),
    cls: col ? col.className : null,
    childMargins: kids.slice(0, 5).map(k => getComputedStyle(k).marginTop),
    footerMt: getComputedStyle(document.querySelector('footer')).marginTop,
  };
});
console.log(JSON.stringify(r, null, 1));
await b.close();
