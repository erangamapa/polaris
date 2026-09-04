import { describe, it, expect, afterEach, vi } from 'vitest';

// The casino network is resolved once at module load from VITE_USE_MAINNET, so
// every case re-imports the module with a fresh env. The behaviour under test is
// deliberately asymmetric: mainnet is strictly opt-in, and ANY value that isn't
// exactly 'true' (unset, empty, 'false', a typo, a truthy-looking '1') must
// leave the app on testnet. Getting this backwards would silently point players
// at real funds, so it is pinned here rather than left to the implementation.
async function loadChains(flag, contentMode, navMode, appMode, layoutMode) {
  vi.resetModules();
  if (flag === undefined) vi.stubEnv('VITE_USE_MAINNET', '');
  else vi.stubEnv('VITE_USE_MAINNET', flag);
  if (contentMode === undefined) vi.stubEnv('VITE_CASINO_CONTENT_MODE', '');
  else vi.stubEnv('VITE_CASINO_CONTENT_MODE', contentMode);
  if (navMode === undefined) vi.stubEnv('VITE_CASINO_NAV_MODE', '');
  else vi.stubEnv('VITE_CASINO_NAV_MODE', navMode);
  if (appMode === undefined) vi.stubEnv('VITE_APP_MODE', '');
  else vi.stubEnv('VITE_APP_MODE', appMode);
  if (layoutMode === undefined) vi.stubEnv('VITE_CASINO_LAYOUT_MODE', '');
  else vi.stubEnv('VITE_CASINO_LAYOUT_MODE', layoutMode);
  return import('./chains.js');
}

async function loadChainsWithPromoFlags(welcomeBonus, weeklyRace) {
  vi.resetModules();
  if (welcomeBonus === undefined) vi.stubEnv('VITE_ENABLE_WELCOME_BONUS', '');
  else vi.stubEnv('VITE_ENABLE_WELCOME_BONUS', welcomeBonus);
  if (weeklyRace === undefined) vi.stubEnv('VITE_ENABLE_WEEKLY_RACE', '');
  else vi.stubEnv('VITE_ENABLE_WEEKLY_RACE', weeklyRace);
  return import('./chains.js');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('casino network selection', () => {
  it('defaults to testnet when the flag is unset', async () => {
    const m = await loadChains(undefined);
    expect(m.CASINO_USE_MAINNET).toBe(false);
    expect(m.CASINO_CHAIN_ID).toBe(m.BASE_SEPOLIA_ID);
    expect(m.CASINO_CHAIN.testnet).toBe(true);
  });

  it("switches to the mainnet target only for exactly 'true'", async () => {
    const m = await loadChains('true');
    expect(m.CASINO_USE_MAINNET).toBe(true);
    expect(m.CASINO_CHAIN_ID).toBe(m.CASINO_MAINNET_ID);
    expect(m.CASINO_CHAIN.testnet).toBe(false);
  });

  it.each(['TRUE', 'True', '  true  '])('accepts %s (case/whitespace tolerant)', async (flag) => {
    const m = await loadChains(flag);
    expect(m.CASINO_USE_MAINNET).toBe(true);
  });

  it.each(['false', 'FALSE', '', 'yes', '1', 'mainnet', 'undefined'])(
    'stays on testnet for %s',
    async (flag) => {
      const m = await loadChains(flag);
      expect(m.CASINO_USE_MAINNET).toBe(false);
      expect(m.CASINO_CHAIN_ID).toBe(m.BASE_SEPOLIA_ID);
    },
  );

  it('keeps sports on Polygon Amoy regardless of the casino flag', async () => {
    const testnet = await loadChains('false');
    const mainnet = await loadChains('true');
    expect(testnet.SPORTS_CHAIN_ID).toBe(testnet.POLYGON_AMOY_ID);
    expect(mainnet.SPORTS_CHAIN_ID).toBe(mainnet.POLYGON_AMOY_ID);
  });

  it('exposes an explorer and chain entry for whichever casino chain is active', async () => {
    for (const flag of ['false', 'true']) {
      const m = await loadChains(flag);
      expect(m.CHAINS_BY_ID[m.CASINO_CHAIN_ID]).toBe(m.CASINO_CHAIN);
      expect(m.CASINO_EXPLORER).toBe(m.EXPLORERS[m.CASINO_CHAIN_ID]);
      expect(m.CASINO_EXPLORER).toMatch(/^https:\/\//);
    }
  });
});

describe('casino content mode selection', () => {
  it('defaults to betswirl-only when the flag is unset', async () => {
    const m = await loadChains(undefined, undefined);
    expect(m.CASINO_CONTENT_MODE).toBe('betswirl');
  });

  it("switches to the combined catalog only for exactly 'mixed'", async () => {
    const m = await loadChains(undefined, 'mixed');
    expect(m.CASINO_CONTENT_MODE).toBe('mixed');
  });

  it.each(['MIXED', 'Mixed', '  mixed  '])('accepts %s (case/whitespace tolerant)', async (mode) => {
    const m = await loadChains(undefined, mode);
    expect(m.CASINO_CONTENT_MODE).toBe('mixed');
  });

  it.each(['betswirl', 'BETSWIRL', '', 'all', 'tribet', 'undefined'])(
    'stays betswirl-only for %s',
    async (mode) => {
      const m = await loadChains(undefined, mode);
      expect(m.CASINO_CONTENT_MODE).toBe('betswirl');
    },
  );
});

describe('casino nav mode selection', () => {
  it('defaults to minimal when the flag is unset', async () => {
    const m = await loadChains(undefined, undefined, undefined);
    expect(m.CASINO_NAV_MODE).toBe('minimal');
  });

  it("switches to the full nav only for exactly 'full'", async () => {
    const m = await loadChains(undefined, undefined, 'full');
    expect(m.CASINO_NAV_MODE).toBe('full');
  });

  it.each(['FULL', 'Full', '  full  '])('accepts %s (case/whitespace tolerant)', async (mode) => {
    const m = await loadChains(undefined, undefined, mode);
    expect(m.CASINO_NAV_MODE).toBe('full');
  });

  it.each(['minimal', 'MINIMAL', '', 'mvp', 'basic', 'undefined'])(
    'stays minimal for %s',
    async (mode) => {
      const m = await loadChains(undefined, undefined, mode);
      expect(m.CASINO_NAV_MODE).toBe('minimal');
    },
  );
});

describe('app mode selection', () => {
  it('defaults to mvp when the flag is unset', async () => {
    const m = await loadChains(undefined, undefined, undefined, undefined);
    expect(m.APP_MODE).toBe('mvp');
  });

  it("switches to full only for exactly 'full'", async () => {
    const m = await loadChains(undefined, undefined, undefined, 'full');
    expect(m.APP_MODE).toBe('full');
  });

  it.each(['FULL', 'Full', '  full  '])('accepts %s (case/whitespace tolerant)', async (mode) => {
    const m = await loadChains(undefined, undefined, undefined, mode);
    expect(m.APP_MODE).toBe('full');
  });

  it.each(['mvp', 'MVP', '', 'minimal', 'basic', 'undefined'])(
    'stays mvp for %s',
    async (mode) => {
      const m = await loadChains(undefined, undefined, undefined, mode);
      expect(m.APP_MODE).toBe('mvp');
    },
  );
});

describe('casino layout mode selection', () => {
  it('defaults to classic when the flag is unset', async () => {
    const m = await loadChains(undefined, undefined, undefined, undefined, undefined);
    expect(m.CASINO_LAYOUT_MODE).toBe('classic');
  });

  it("switches to game-first only for exactly 'game-first'", async () => {
    const m = await loadChains(undefined, undefined, undefined, undefined, 'game-first');
    expect(m.CASINO_LAYOUT_MODE).toBe('game-first');
  });

  it.each(['GAME-FIRST', 'Game-First', '  game-first  '])('accepts %s (case/whitespace tolerant)', async (mode) => {
    const m = await loadChains(undefined, undefined, undefined, undefined, mode);
    expect(m.CASINO_LAYOUT_MODE).toBe('game-first');
  });

  it.each(['classic', 'CLASSIC', '', 'gamefirst', 'featured', 'undefined'])(
    'stays classic for %s',
    async (mode) => {
      const m = await loadChains(undefined, undefined, undefined, undefined, mode);
      expect(m.CASINO_LAYOUT_MODE).toBe('classic');
    },
  );
});

describe('promo card feature flags', () => {
  it('default to disabled (informational fallback cards) when unset', async () => {
    const m = await loadChainsWithPromoFlags(undefined, undefined);
    expect(m.ENABLE_WELCOME_BONUS).toBe(false);
    expect(m.ENABLE_WEEKLY_RACE).toBe(false);
  });

  it("enable only for exactly 'true', independently of each other", async () => {
    const m = await loadChainsWithPromoFlags('true', 'false');
    expect(m.ENABLE_WELCOME_BONUS).toBe(true);
    expect(m.ENABLE_WEEKLY_RACE).toBe(false);
  });

  it.each(['TRUE', 'True', '  true  '])('accepts %s (case/whitespace tolerant)', async (value) => {
    const m = await loadChainsWithPromoFlags(value, value);
    expect(m.ENABLE_WELCOME_BONUS).toBe(true);
    expect(m.ENABLE_WEEKLY_RACE).toBe(true);
  });

  it.each(['false', 'FALSE', '', 'yes', '1', 'enabled', 'undefined'])('stays disabled for %s', async (value) => {
    const m = await loadChainsWithPromoFlags(value, value);
    expect(m.ENABLE_WELCOME_BONUS).toBe(false);
    expect(m.ENABLE_WEEKLY_RACE).toBe(false);
  });
});
