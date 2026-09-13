import { chromium } from 'playwright';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = 'https://demo.bgaming-network.com/play/AmericanRoulette/FUN?server=demo';
let status = 429;
for (let i = 0; i < 120 && status === 429; i++) {
  await sleep(30000);
  try { status = (await fetch(URL, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' } })).status; } catch { status = 0; }
}
console.log('demo host status now:', status);
if (status !== 429 && status !== 0) {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const hits = [];
  p.on('response', r => { if (r.url().includes('bgaming-network')) hits.push(r.status()); });
  await p.goto('https://tribet.gg/casino/lobby?play=bgaming:american-roulette', { waitUntil: 'networkidle', timeout: 60000 });
  await p.waitForTimeout(12000);
  console.log('iframe responses:', hits.join(','));
  await p.screenshot({ path: process.argv[2] + '/launch-verified.png' });
  const f = p.frames().find(fr => fr.url().includes('bgaming-network'));
  console.log('frame rendered elements:', f ? await f.locator('canvas, div').count().catch(() => 0) : 'no frame');
  await b.close();
}
