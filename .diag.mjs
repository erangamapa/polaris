import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
await p.goto('https://tribet.gg/casino/lobby?play=provider:tumble', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(6000);
const out = await p.evaluate(() => {
  const main = document.querySelector('main');
  const page = document.querySelector('[data-test-id="casino-game-page"]');
  const rows = [];
  const add = (label, el) => { if (!el) return rows.push([label, 'MISSING']); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    rows.push([label, `top=${Math.round(r.top)} h=${Math.round(r.height)} styleH=${el.style.height || '-'} minH=${cs.minHeight} flex=${cs.flex}`]); };
  add('main', main);
  add('gamePage', page);
  // walk the page's children
  let n = page;
  for (let d = 0; d < 6 && n; d++) {
    const kids = [...n.children];
    kids.forEach((k, i) => add(`  d${d}#${i} <${k.tagName.toLowerCase()}>`, k));
    n = kids.find(k => k.getBoundingClientRect().height > 200) || null;
  }
  return { mainOverflow: main.scrollHeight - main.clientHeight, mainH: Math.round(main.getBoundingClientRect().height), rows };
});
console.log('mainOverflow', out.mainOverflow, 'mainH', out.mainH);
for (const [a, bq] of out.rows) console.log('  ' + a.padEnd(22), bq);
await b.close();
