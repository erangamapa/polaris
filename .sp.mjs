import { chromium } from 'playwright';
const SP = process.argv[2];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
await p.goto('https://tribet.gg/casino/lobby', { waitUntil: 'networkidle', timeout: 60000 });
await p.waitForTimeout(3000);
await p.screenshot({ path: `${SP}/sp-top.png` });
await p.evaluate(() => document.querySelector('main').scrollTo(0, 99999));
await p.waitForTimeout(800);
await p.screenshot({ path: `${SP}/sp-bottom.png` });

const rows = await p.evaluate(() => {
  const out = [];
  const push = (label, el) => { if (!el) return out.push([label, 'MISSING']); const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    out.push([label, `top=${Math.round(r.top)} bot=${Math.round(r.bottom)} h=${Math.round(r.height)} mt=${cs.marginTop} mb=${cs.marginBottom} pt=${cs.paddingTop} pb=${cs.paddingBottom}`]); };
  push('header', document.querySelector('header'));
  push('main', document.querySelector('main'));
  const main = document.querySelector('main');
  [...main.children].forEach((c, i) => push(`main>child${i} <${c.tagName.toLowerCase()}>`, c));
  const stage = document.querySelector('[data-test-id="arena-content-stage"]');
  if (stage) [...stage.querySelectorAll(':scope > * > *')].slice(0,4).forEach((c,i)=>push(`  stage>>${i} <${c.tagName.toLowerCase()}> ${(c.className||'').toString().slice(0,30)}`, c));
  push('nav', document.querySelector('nav[aria-label="Main product navigation"]'));
  return out;
});
for (const [a, v] of rows) console.log('  ' + a.padEnd(34), v);
await b.close();
