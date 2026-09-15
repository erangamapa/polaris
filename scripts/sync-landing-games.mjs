// Only these marked fragments are generated; marketing copy stays hand-authored.
import fs from 'node:fs';
import { BGAMING_GAMES } from '../src/lib/catalog/adapters/bgaming.games.js';

const slugs = ['alien-fruits', 'aloha-king-elvis', 'american-roulette', 'balloon-mania', 'chicken-shot', 'dice-clash', 'alien-fruits-3', 'always-up', 'aviamasters-2', 'blazing-fire-pots-hold-spin', 'bling-blitz-diamond-drop', '3-kings-scratch'];
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const games = slugs.map((slug) => {
  const game = BGAMING_GAMES.find((g) => g.slug === slug);
  if (!game?.image || Date.parse(game.released) > Date.now()) throw new Error(`Invalid featured game: ${slug}`);
  return game;
});
const cards = games.map((g) => `          <li><a class="featured-game" href="/casino/lobby?play=bgaming%3A${g.slug}"><img src="${escape(g.image)}" alt="" width="455" height="574" loading="lazy" decoding="async" /><span class="featured-game__title">${escape(g.title)}</span><span class="featured-game__meta">${escape(g.genre)} · BGaming</span></a></li>`).join('\n');
const hero = [games[0], games[10], games[4]].map((g, i) => `            <img class="hero-visual__game hero-visual__${['dice', 'coin', 'roulette'][i]}" src="${escape(g.image)}" alt="" width="455" height="574" decoding="async" ${i === 1 ? 'fetchpriority="high"' : ''}/>`).join('\n');
const file = new URL('../landing/index.html', import.meta.url);
const old = fs.readFileSync(file, 'utf8');
let html = old;
for (const [name, content] of [['featured-games', cards], ['featured-hero', hero]]) {
  const pattern = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!pattern.test(html)) throw new Error(`Missing ${name} markers`);
  html = html.replace(pattern, `$1\n${content}\n$2`);
}
if (process.argv.includes('--check')) {
  if (html !== old) throw new Error('Featured games are stale. Run node scripts/sync-landing-games.mjs');
} else if (html !== old) fs.writeFileSync(file, html);
