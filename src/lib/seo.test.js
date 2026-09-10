import { describe, it, expect } from 'vitest';
import { metadataFor, CANONICAL_ORIGIN } from './seo.js';

// Every app URL is served from the same HTML shell, so these titles are the
// only thing distinguishing one route from another in a search result. The
// cases that matter are the ones that would otherwise collide: two different
// URLs must not produce the same title, and the brand must never render as
// "TriBet" (lib/brand.js: that styling is internal/legacy and must not reach
// player-visible copy - a <title> is about as player-visible as it gets).
const casino = (over = {}) => ({ product: 'casino', casinoCategory: 'Lobby', casinoView: 'dashboard', ...over });

describe('CANONICAL_ORIGIN', () => {
  it('is the production domain, not a deployment host', () => {
    expect(CANONICAL_ORIGIN).toBe('https://tribet.gg');
    expect(CANONICAL_ORIGIN).not.toContain('vercel.app');
  });
});

describe('metadataFor', () => {
  it('describes the lobby by default', () => {
    const m = metadataFor(casino());
    expect(m.title).toBe('Casino Lobby | Tribet');
    expect(m.description.length).toBeGreaterThan(50);
  });

  it('names the category on a category route', () => {
    expect(metadataFor(casino({ casinoCategory: 'Popular', casinoView: 'category' })).title).toBe('Popular Games | Tribet');
  });

  it('uses the display label, not the internal id', () => {
    // "New" renders as "New Releases", "Originals" as "BetSwirl" - the id is
    // a routing key and must never surface in a search result.
    expect(metadataFor(casino({ casinoCategory: 'New', casinoView: 'category' })).title).toBe('New Releases Games | Tribet');
    expect(metadataFor(casino({ casinoCategory: 'Originals', casinoView: 'category' })).title).toBe('BetSwirl Games | Tribet');
  });

  it.each([
    ['Favorites', 'Your Favorites | Tribet'],
    ['Recently Played', 'Recently Played | Tribet'],
  ])('gives %s its own title', (casinoCategory, expected) => {
    expect(metadataFor(casino({ casinoCategory })).title).toBe(expected);
  });

  it('titles the providers index and a single provider differently', () => {
    expect(metadataFor(casino({ casinoView: 'providers' })).title).toBe('Game Providers | Tribet');
    expect(metadataFor(casino({ casinoView: 'provider', casinoProviderSlug: 'provider-1' })).title).toBe('Provider #1 Games | Tribet');
  });

  it('falls back gracefully for an unknown provider slug', () => {
    const m = metadataFor(casino({ casinoView: 'provider', casinoProviderSlug: 'nope' }));
    expect(m.title).toBe('Provider Games | Tribet');
    expect(m.description).not.toContain('undefined');
  });

  it('covers the other two products', () => {
    expect(metadataFor({ product: 'sports', sportsView: 'home' }).title).toBe('Sports Betting | Tribet');
    expect(metadataFor({ product: 'predictions', predSection: 'Trending' }).title).toBe('Predictions — Trending | Tribet');
  });

  it('never emits the legacy "TriBet" styling', () => {
    const navs = [
      casino(),
      casino({ casinoCategory: 'Popular', casinoView: 'category' }),
      casino({ casinoView: 'providers' }),
      { product: 'sports', sportsView: 'home' },
      { product: 'predictions', predSection: 'Trending' },
    ];
    for (const nav of navs) {
      const { title, description } = metadataFor(nav);
      expect(title).not.toMatch(/TriBet/);
      expect(description).not.toMatch(/TriBet/);
    }
  });

  it('gives distinct routes distinct titles', () => {
    const titles = [
      casino(),
      casino({ casinoCategory: 'Popular', casinoView: 'category' }),
      casino({ casinoCategory: 'Favorites' }),
      casino({ casinoView: 'providers' }),
      { product: 'sports', sportsView: 'home' },
      { product: 'predictions', predSection: 'Trending' },
    ].map((n) => metadataFor(n).title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
