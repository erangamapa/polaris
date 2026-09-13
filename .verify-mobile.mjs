import { chromium } from 'playwright';
const SP = process.argv[2];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const probe = async (url, label, shot) => {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(5000);
  const m = await p.evaluate(() => {
    const box = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) }; };
    const main = document.querySelector('main');
    return {
      vh: innerHeight,
      mainOverflow: main ? main.scrollHeight - main.clientHeight : null,
      mainPadBottom: main ? getComputedStyle(main).paddingBottom : null,
      iframe: box('iframe'),
      nav: box('nav[aria-label="Main product navigation"]'),
    };
  });
  console.log(label, JSON.stringify(m));
  await p.screenshot({ path: `${SP}/${shot}` });
};
await probe('https://tribet.gg/casino/lobby', 'LOBBY', 'v-lobby.png');
await probe('https://tribet.gg/casino/lobby?play=provider:tumble', 'GAME ', 'v-game.png');
await b.close();
