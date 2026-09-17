import { externalGames } from '../../src/lib/catalog/index.js';

export function validateQuestion(body) {
  return typeof body?.message === 'string' && body.message.trim().length > 0 && body.message.length <= 500;
}

export function findConciergeGames(terms) {
  const words = typeof terms === 'string' ? terms.toLowerCase().match(/[a-z0-9]{3,}/g)?.slice(0, 8) || [] : [];
  return externalGames().map(game => ({ game, score: words.reduce((score, word) =>
    score + (`${game.title} ${game.tags?.join(' ')}`.toLowerCase().includes(word) ? 1 : 0), 0) }))
    .filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3)
    .map(({ game }) => ({ id: game.favId, title: game.title, image: game.image,
      href: `/casino/lobby?play=${encodeURIComponent(game.favId)}` }));
}

export function safeTopicReply(message) {
  if (/recover|chasing|lost|losses|addict|can't stop|cannot stop|under.?18|underage|suicid/i.test(message)) {
    return 'I can’t recommend games to recover losses or continue harmful play. You can take a break and find responsible-play information in our Help guide.';
  }
  if (/win|profit|predict|guarantee|strategy|best odds|rtp|volatility|rules|explain|wallet|deposit|withdraw|seed|private key/i.test(message)) {
    return 'This early version helps find games by title or category. I can’t predict wins or verify game rules and financial details. Use the game’s official rules or our Help guide. Never share private keys or recovery phrases.';
  }
  return null;
}
