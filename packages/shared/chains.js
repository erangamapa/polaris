// Pinned chain + protocol configuration for TriBet.
// Populated from live Discovery (Phase 0.5, docs/architecture/23) against the
// BetSwirl and Azuro SDKs on 2026-07-01.
//
// The casino (BetSwirl) runs on either a testnet or a mainnet, selected at build
// time by VITE_USE_MAINNET — see CASINO_USE_MAINNET below. Sports (Azuro) is
// testnet-only for now and is unaffected by that flag.
//
// Betting assets:
//   - BetSwirl casino  -> the chain's native gas token (address 0x0 = GAS_TOKEN)
//   - Azuro sports     -> USDT on Polygon Amoy (6 decimals)

export const BASE_SEPOLIA_ID = 84532;
export const POLYGON_AMOY_ID = 80002;
export const ARBITRUM_ID = 42161;

// Resolved from whichever runtime we're in: Vite inlines `import.meta.env` for
// the browser bundle, while Vercel's serverless functions see the same
// VITE_-prefixed variable on `process.env`. One variable, both sides.
function readEnv(name) {
  let viteEnv;
  try {
    viteEnv = import.meta.env;
  } catch {
    viteEnv = undefined;
  }
  const fromVite = viteEnv?.[name];
  if (fromVite !== undefined) return fromVite;
  if (typeof process !== 'undefined' && process.env) return process.env[name];
  return undefined;
}

// Casino network selector. Only the exact string 'true' opts into mainnet —
// anything else (unset, empty, 'false', a typo) stays on testnet. Real money is
// strictly opt-in: a missing or malformed value must never silently promote the
// app to a live-funds chain.
export const CASINO_USE_MAINNET = String(readEnv('VITE_USE_MAINNET')).trim().toLowerCase() === 'true';

// Casino mainnet target. BetSwirl is deployed on Arbitrum, Avalanche, BNB Chain,
// Polygon and Base, but Base's bank returns isAllowed=false / maxBet=0 for the
// native token, so it is not a viable target. Arbitrum is chosen because it has
// the deepest usable bankroll of the ETH-denominated deployments, which keeps
// the app's existing ETH labelling and USD pricing correct. To retarget, change
// this one constant (and CASINO_MAINNET below).
export const CASINO_MAINNET_ID = ARBITRUM_ID;

// Casino (BetSwirl) follows the flag; sports (Azuro) stays on Polygon Amoy —
// Amoy's Azuro dev feed carries more live markets, and mainnet Azuro needs a
// different contract set, subgraph and settlement token. The app auto-switches
// the wallet to the chain a given bet needs.
export const CASINO_CHAIN_ID = CASINO_USE_MAINNET ? CASINO_MAINNET_ID : BASE_SEPOLIA_ID;
export const SPORTS_CHAIN_ID = POLYGON_AMOY_ID;

// Real Welcome Bonus / Weekly Race promo cards (PromoStrip.jsx's
// WelcomeOfferCard/WeeklyRaceCard) vs. the informational fallback cards
// (AboutTribetCard/TransparentPlayCard) that render in their place while
// there's no live promotion to point them at. Read via
// VITE_ENABLE_WELCOME_BONUS / VITE_ENABLE_WEEKLY_RACE — only the exact
// string 'true' enables the real promo card; anything else (unset, empty,
// a typo) keeps the informational fallback, matching this file's "narrower/
// safer is the default" pattern. Independent flags, independent of
// CASINO_LAYOUT_MODE/CASINO_NAV_MODE/CASINO_CONTENT_MODE — flipping either
// back to 'true' restores the original promo card with no other change,
// once a real welcome offer / weekly race actually exists to link to.
export const ENABLE_WELCOME_BONUS = String(readEnv('VITE_ENABLE_WELCOME_BONUS') ?? '').trim().toLowerCase() === 'true';
export const ENABLE_WEEKLY_RACE = String(readEnv('VITE_ENABLE_WEEKLY_RACE') ?? '').trim().toLowerCase() === 'true';

// Overall product/app mode — the existing MVP/Full platform-scope concept
// (see lib/platformScope.js: Casino is always allowed, Sports/Predictions
// are gated to "Coming soon" in 'mvp'), now resolved from a real build-time
// flag instead of only ever being reachable through the Developer Panel's
// mock override. Read via VITE_APP_MODE. Only the exact string 'full'
// enables Sports/Predictions; anything else (unset, empty, a typo) defaults
// to 'mvp'. This is what App.jsx's platformScope resolution falls back to
// whenever the Dev Panel is disabled (see devPanelFlag.js) AND is what
// devMock.js's own resting default now derives from — so disabling the Dev
// Panel can never silently promote the product to Full mode, and opening
// the (developer-only) panel never silently changes what a real user with
// no panel interaction would see either. The Dev Panel is a developer
// control surface; APP_MODE is the actual product configuration.
const rawAppMode = String(readEnv('VITE_APP_MODE') ?? '').trim().toLowerCase();
export const APP_MODE = rawAppMode === 'full' ? 'full' : 'mvp';

export const baseSepolia = {
  id: BASE_SEPOLIA_ID,
  name: 'Base Sepolia',
  // Full player-facing label (used by the Wallet modal's identity card) —
  // deliberately its own field rather than synthesized from `.name` +
  // "Testnet", since that suffix rule wouldn't hold for every future chain
  // (a mainnet's display name won't always want "Mainnet" appended either).
  displayName: 'Base Sepolia Testnet',
  network: 'base-sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    fallback: { http: ['https://base-sepolia-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: {
      name: 'Basescan',
      url: 'https://sepolia.basescan.org',
      apiUrl: 'https://api-sepolia.basescan.org/api',
    },
  },
  testnet: true,
};

export const polygonAmoy = {
  id: POLYGON_AMOY_ID,
  name: 'Polygon Amoy',
  displayName: 'Polygon Amoy Testnet',
  network: 'polygon-amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc-amoy.polygon.technology'] } },
  blockExplorers: {
    default: { name: 'PolygonScan', url: 'https://amoy.polygonscan.com', apiUrl: 'https://api-amoy.polygonscan.com/api' },
  },
  testnet: true,
};

export const arbitrum = {
  id: ARBITRUM_ID,
  name: 'Arbitrum One',
  displayName: 'Arbitrum One',
  network: 'arbitrum',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://arb1.arbitrum.io/rpc'] },
    fallback: { http: ['https://arbitrum-one-rpc.publicnode.com'] },
  },
  blockExplorers: {
    default: { name: 'Arbiscan', url: 'https://arbiscan.io', apiUrl: 'https://api.arbiscan.io/api' },
  },
  testnet: false,
};

// chainId -> chain object, for surfaces that need to resolve "whatever
// network the wallet is actually on right now" generically (see Wallet
// modal identity card: "do not hardcode 'Base Sepolia Testnet' except
// where the current network genuinely is Base Sepolia... Ethereum Mainnet,
// Base, Solana, etc. should work automatically"). Add a chain here and its
// display name / testnet-ness resolve everywhere for free.
export const CHAINS_BY_ID = {
  [BASE_SEPOLIA_ID]: baseSepolia,
  [POLYGON_AMOY_ID]: polygonAmoy,
  [ARBITRUM_ID]: arbitrum,
};

// The casino chain currently in force. Prefer this over importing a named chain
// directly — `baseSepolia` is no longer a safe stand-in for "the casino chain"
// now that the network is switchable.
export const CASINO_CHAIN = CHAINS_BY_ID[CASINO_CHAIN_ID];

// Explorer lookup by chain id (bet/tx links are chain-aware now).
export const EXPLORERS = {
  [BASE_SEPOLIA_ID]: baseSepolia.blockExplorers.default.url,
  [POLYGON_AMOY_ID]: polygonAmoy.blockExplorers.default.url,
  [ARBITRUM_ID]: arbitrum.blockExplorers.default.url,
};

// Explorer for the active casino chain — what every casino tx/address link
// should be built from.
export const CASINO_EXPLORER = EXPLORERS[CASINO_CHAIN_ID];

// --- Azuro (sports/predictions) — @azuro-org/sdk@7.4.1 / toolkit@6.3.1 -------
// On Polygon Amoy (PolygonAmoyUSDT env) — more live markets than Base Sepolia.
// USDT is a plain ERC-20 with a public mint() faucet (6 decimals), so no wrapping.
export const azuro = {
  chainId: POLYGON_AMOY_ID,
  environment: 'PolygonAmoyUSDT',
  contracts: {
    lp: '0x0a75395Ff15d9557424b632cEBCac448D66F9779',
    core: '0xCD0Db5ef28C3Bd3a69283372dE923Eb4DA0585F6',
    relayer: '0x48c9bE88706F22838070eE7C4bC74Ad7A8eeF114',
    azuroBet: '0x4B75c071dFA5d537979E8b0615Bb97B6337dbFef',
    vault: '0x1Ed6CEEDf7033461a189FD7c3381C34846D7b25a',
    paymaster: '0x2d155962b708c931Fc695F674B415065E78D9F04',
    cashout: '0x7dF132Ad2334a667A004049a75a4a8a530dc24F2',
  },
  betToken: { symbol: 'USDT', address: '0xCf1b86ceD971b88C042C64A9c099377e2738073C', decimals: 6 },
  graphql: {
    bets: 'https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-polygon-amoy-dev-v3',
    feed: 'https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-polygon-amoy-dev',
  },
  api: 'https://dev-api.onchainfeed.org/api/v1/public',
  socket: 'wss://dev-streams.onchainfeed.org/v1/streams',
};

// House/affiliate address is injected at runtime from env (server) or the
// build-time public var (client). Never hardcode a wallet here.
export const AFFILIATE_ADDRESS_ENV = 'VITE_AFFILIATE_ADDRESS';
