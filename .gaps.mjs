import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await p.goto('https://tribet.gg/casino/lobby', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(2500);
const out = await p.evaluate(() => {
  const col = document.querySelector('[data-test-id="arena-page-column"]');
  const res = [];
  const walk = (el, depth) => {
    for (const k of el.children) {
      const r = k.getBoundingClientRect();
      if (r.height === 0) continue;
      const cs = getComputedStyle(k);
      res.push({ depth, top: Math.round(r.top), bot: Math.round(r.bottom), h: Math.round(r.height),
        mt: cs.marginTop, mb: cs.marginBottom, pt: cs.paddingTop, pb: cs.paddingBottom,
        cls: (k.className || '').toString().slice(0, 46), tag: k.tagName.toLowerCase() });
      if (depth < 2 && r.top < 900) walk(k, depth + 1);
    }
  };
  walk(col, 0);
  return res.filter(r => r.top < 900).slice(0, 18);
});
let prev = null;
for (const r of out) {
  const gap = prev !== null && r.depth === 0 ? `gap=${String(r.top - prev).padStart(3)}px ` : '           ';
  if (r.depth === 0) prev = r.bot;
  console.log(`${'  '.repeat(r.depth)}${gap}top=${String(r.top).padStart(4)} h=${String(r.h).padStart(4)} mt=${r.mt.padEnd(6)} pt=${r.pt.padEnd(6)} <${r.tag}> ${r.cls}`);
}
await b.close();
