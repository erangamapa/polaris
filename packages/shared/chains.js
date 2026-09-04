// Pinned chain + protocol configuration for TriBet (testnet-only).
// Populated from live Discovery (Phase 0.5, docs/architecture/23) against the
// BetSwirl and Azuro SDKs on 2026-07-01. Both verticals co-locate on Base Sepolia.
//
// Betting assets on Base Sepolia:
//   - BetSwirl casino  -> native ETH (token address 0x0 = GAS_TOKEN)
//   - Azuro sports     -> WETH (0x9e09...935f)
// Both are ETH-denominated on one chain, so funding = ETH (+ wrap some to WETH).

export const BASE_SEPOLIA_ID = 84532;
export const POLYGON_AMOY_ID = 80002;

// Two-chain split: casino (BetSwirl) on Base Sepolia, sports (Azuro) on Polygon
// Amoy — Amoy's Azuro dev feed carries more live markets. The app auto-switches
// the wallet to the chain a given bet needs.
//
// NOT wired to BETSWIRL_ENV (see the BetSwirl section below): production
// would need its own confirmed chain id/RPC/explorer plus AppKit network
// entries in src/web3/config.js, and a handful of components still import
// `baseSepolia` directly for explorer links (BetSwirlGame.jsx,
// CasinoRoundReceipt.jsx, FundsDialog.jsx) rather than resolving via
// CASINO_CHAIN_ID/EXPLORERS. None of that is safe to wire up without a real
// production chain to point at — see BETSWIRL_PRODUCTION_MISSING_FIELDS.
export const CASINO_CHAIN_ID = BASE_SEPOLIA_ID;
export const SPORTS_CHAIN_ID = POLYGON_AMOY_ID;

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

// chainId -> chain object, for surfaces that need to resolve "whatever
// network the wallet is actually on right now" generically (see Wallet
// modal identity card: "do not hardcode 'Base Sepolia Testnet' except
// where the current network genuinely is Base Sepolia... Ethereum Mainnet,
// Base, Solana, etc. should work automatically"). Add a chain here and its
// display name / testnet-ness resolve everywhere for free.
export const CHAINS_BY_ID = {
  [BASE_SEPOLIA_ID]: baseSepolia,
  [POLYGON_AMOY_ID]: polygonAmoy,
};

// Explorer lookup by chain id (bet/tx links are chain-aware now).
export const EXPLORERS = {
  [BASE_SEPOLIA_ID]: baseSepolia.blockExplorers.default.url,
  [POLYGON_AMOY_ID]: polygonAmoy.blockExplorers.default.url,
};

// Native gas token sentinel used by BetSwirl for ETH bets.
export const GAS_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

// --- BetSwirl (casino) — @betswirl/sdk-core@0.1.27 -------------------------
//
// BETSWIRL_ENV is the ONE centralized flag that decides which BetSwirl
// deployment the app targets. Read via VITE_BETSWIRL_ENV (Vite exposes only
// VITE_-prefixed vars to the client bundle) so it can be set per Vercel
// environment (Production vs Preview/Development) with no extra plumbing —
// leave it unset in Preview/Development to default to staging, set it only
// on Production when BetSwirl production is intentionally ready.
const rawBetswirlEnv = String(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BETSWIRL_ENV) || 'staging',
).toLowerCase();
export const BETSWIRL_ENV = rawBetswirlEnv === 'production' ? 'production' : 'staging';
export const IS_BETSWIRL_PRODUCTION = BETSWIRL_ENV === 'production';

// Current, working config — Base Sepolia testnet. This is what the app has
// run on since Phase 4 and is exactly what ships when BETSWIRL_ENV=staging
// (the default).
const BETSWIRL_STAGING_CONFIG = {
  chainId: BASE_SEPOLIA_ID,
  bank: '0x637D401554875a330264e910A3778DAf549F2021',
  leaderboard: '0xd60Fac02E78e2a4E37501053ab3E822E330dd970',
  games: {
    dice: '0x76e982a4823bEd3ed77d8E0b4c3FAa616385a286',
    'coin-toss': '0x431c7E0856C0DEf20e50A809cBDdEcF5F8dD6142',
    roulette: '0x441b191bc9253ab4E16D7d90E99650bb71D0E4f4',
    keno: '0xb5C9f183C1E5D2e9d0CA0679D7149ea075E0e82F',
    wheel: '0x011e537eB2313fc0096a87AA4ACC3750f712Ce2D',
    plinko: '0x011e537eB2313fc0096a87AA4ACC3750f712Ce2D',
  },
  // Bets settle in native ETH on Base Sepolia (bank.getTokens -> [ETH @ 0x0]).
  bettingToken: { symbol: 'ETH', address: GAS_TOKEN_ADDRESS, decimals: 18 },
  // NOTE (Discovery): the SDK's default subgraph endpoint returns "Not found";
  // bet placement/settlement is read directly from chain via VRF receipts. The
  // studio subgraph is only needed for aggregated history (Phase 6) — revisit.
  subgraph: 'https://api.studio.thegraph.com/query/80936/betswirl-base-sepolia-v2/v0.1.3',
  sdkDefaultAffiliate: '0x057BcBF736DADD774A8A45A185c1697F4cF7517D',
};

// Production config — intentionally EMPTY. Every field here is a real value
// BetSwirl or our own ops team has to hand over before production traffic can
// go live (production chain id, deployed bank/leaderboard/game contract
// addresses, production subgraph endpoint, production default affiliate).
// None of these exist in this repo, env, or prior history as of this change
// — do not fill them with guesses. Populate this object once confirmed, then
// set VITE_BETSWIRL_ENV=production (Production environment only).
const BETSWIRL_PRODUCTION_CONFIG = {
  chainId: undefined,
  bank: undefined,
  leaderboard: undefined,
  games: {
    dice: undefined,
    'coin-toss': undefined,
    roulette: undefined,
    keno: undefined,
    wheel: undefined,
    plinko: undefined,
  },
  bettingToken: undefined,
  subgraph: undefined,
  sdkDefaultAffiliate: undefined,
};

function findMissingBetswirlProductionFields(config) {
  const missing = [];
  for (const key of ['chainId', 'bank', 'leaderboard', 'bettingToken', 'subgraph', 'sdkDefaultAffiliate']) {
    if (!config[key]) missing.push(key);
  }
  for (const [game, address] of Object.entries(config.games)) {
    if (!address) missing.push(`games.${game}`);
  }
  return missing;
}

// Non-empty only once BETSWIRL_PRODUCTION_CONFIG above is actually filled in.
export const BETSWIRL_PRODUCTION_MISSING_FIELDS = findMissingBetswirlProductionFields(BETSWIRL_PRODUCTION_CONFIG);

function resolveBetswirlConfig() {
  if (BETSWIRL_ENV !== 'production') return BETSWIRL_STAGING_CONFIG;
  if (BETSWIRL_PRODUCTION_MISSING_FIELDS.length) {
    // Fail loudly but not fatally — falling back to staging keeps the app
    // (including unrelated Sports/Predictions, which import this same
    // module) functional rather than crashing on a misconfigured flag.
    console.error(
      `[BetSwirl] VITE_BETSWIRL_ENV=production but BETSWIRL_PRODUCTION_CONFIG in ` +
      `packages/shared/chains.js is missing: ${BETSWIRL_PRODUCTION_MISSING_FIELDS.join(', ')}. ` +
      'Falling back to BetSwirl staging (Base Sepolia) until these are populated.',
    );
    return BETSWIRL_STAGING_CONFIG;
  }
  return BETSWIRL_PRODUCTION_CONFIG;
}

// Single resolved config every consumer should read — never branch on
// BETSWIRL_ENV outside this file.
export const betswirl = resolveBetswirlConfig();

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
