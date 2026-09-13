import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
await p.goto('https://tribet.gg/casino/lobby', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(3000);
const rows = await p.evaluate(() => {
  // Walk the visible top-of-page boxes and report the vertical gap between
  // each consecutive sibling, so wasted space is obvious.
  const stage = document.querySelector('[data-test-id="arena-content-stage"]');
  const col = stage.querySelector('div > div') || stage.firstElementChild;
  const kids = [...col.children];
  const out = [];
  let prevBottom = null;
  for (const k of kids.slice(0, 8)) {
    const r = k.getBoundingClientRect();
    if (r.height === 0) continue;
    const cs = getComputedStyle(k);
    const gap = prevBottom === null ? null : Math.round(r.top - prevBottom);
    out.push(`${gap === null ? '   -' : String(gap).padStart(4)}px gap | top=${Math.round(r.top)} h=${Math.round(r.height)} mt=${cs.marginTop} pt=${cs.paddingTop} | ${(k.className||'').toString().slice(0,52)}`);
    prevBottom = r.bottom;
  }
  return out;
});
rows.forEach(r => console.log('  ' + r));
await b.close();
