import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
await p.goto('https://tribet.gg/casino/lobby?play=provider:tumble', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(6000);
const out = await p.evaluate(() => {
  const main = document.querySelector('main');
  const walk = (el, depth, acc) => {
    for (const k of el.children) {
      const r = k.getBoundingClientRect();
      acc.push({ d: depth, tag: k.tagName.toLowerCase(), id: k.dataset.testId || '', cls: (k.className||'').toString().slice(0,42), top: Math.round(r.top), h: Math.round(r.height) });
      if (depth < 2) walk(k, depth + 1, acc);
    }
    return acc;
  };
  return { scrollH: main.scrollHeight, clientH: main.clientHeight, tree: walk(main, 0, []) };
});
console.log('main scrollH', out.scrollH, 'clientH', out.clientH);
for (const r of out.tree) console.log(`  ${'  '.repeat(r.d)}<${r.tag}> ${r.id} top=${r.top} h=${r.h} ${r.cls}`);
await b.close();
