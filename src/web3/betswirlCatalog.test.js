import { describe, it, expect, afterEach, vi } from 'vitest';

// Playability is derived at module load from the active casino chain, so each
// case re-imports with a fresh env. What matters here is that flipping the
// network cannot leave a tile launchable for a game BetSwirl has paused on that
// deployment — the lobby would take a stake for a bet that reverts.
async function loadCatalog(flag) {
  vi.resetModules();
  vi.stubEnv('VITE_USE_MAINNET', flag);
  return import('./betswirlCatalog.js');
}

const playableKeys = (games) => games.filter((g) => g.playable).map((g) => g.key).sort();

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('BETSWIRL_GAMES playability', () => {
  it('keeps every game in the catalog in both modes', async () => {
    for (const flag of ['false', 'true']) {
      const { BETSWIRL_GAMES } = await loadCatalog(flag);
      expect(BETSWIRL_GAMES.map((g) => g.key)).toEqual([
        'dice', 'coin-toss', 'roulette', 'keno', 'wheel', 'plinko',
      ]);
    }
  });

  it('marks the verified Base Sepolia set playable on testnet', async () => {
    const { BETSWIRL_GAMES } = await loadCatalog('false');
    expect(playableKeys(BETSWIRL_GAMES)).toEqual(['coin-toss', 'dice', 'keno', 'roulette']);
  });

  it('drops keno on the Arbitrum mainnet target, where it is paused', async () => {
    const { BETSWIRL_GAMES } = await loadCatalog('true');
    expect(playableKeys(BETSWIRL_GAMES)).toEqual(['coin-toss', 'dice', 'roulette']);
  });

  it('never marks the weighted games playable on either chain', async () => {
    for (const flag of ['false', 'true']) {
      const { BETSWIRL_GAMES } = await loadCatalog(flag);
      const weighted = BETSWIRL_GAMES.filter((g) => g.control === 'weighted');
      expect(weighted).toHaveLength(2);
      expect(weighted.every((g) => !g.playable)).toBe(true);
    }
  });
});
