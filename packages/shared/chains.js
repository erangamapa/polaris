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

// Casino CONTENT source selector — separate from the chain/env flags above.
// This decides whether the Casino catalog (CasinoCatalog.jsx's ALL_GAMES,
// the one collection every rail/search/favorites/recently-played/category
// surface reads from) includes the vendored local PROVIDER_GAMES catalog or
// only BetSwirl's six on-chain games. Read via VITE_CASINO_CONTENT_MODE
// (build-time, Vite-inlined — no runtime/player toggle exists or should be
// added; see DevPanel.jsx's read-only indicator). Only the exact string
// 'mixed' restores the combined catalog; anything else (unset, empty, a
// typo) defaults to 'betswirl' — the smaller, fully-attributed catalog is
// the safe default, and showing local/fixture content is the deliberate
// opt-in, not the fallback.
const rawCasinoContentMode = String(readEnv('VITE_CASINO_CONTENT_MODE') ?? '').trim().toLowerCase();
export const CASINO_CONTENT_MODE = rawCasinoContentMode === 'mixed' ? 'mixed' : 'betswirl';

// Casino NAVIGATION mode — separate again from the content filter above.
// This decides how much of the Casino category taxonomy (the sidebar's
// "Games" section, the horizontal CategoryNav pill row, Popular/New
// Releases/Live Casino/Game Shows/Providers as reachable nav destinations)
// actually renders. It does NOT touch CASINO_CATEGORIES/CASINO_PROVIDERS
// themselves, the routes, or any component — those stay fully intact so
// 'full' mode needs zero code changes to restore. Read via
// VITE_CASINO_NAV_MODE. Only the exact string 'full' restores the richer
// navigation; anything else (unset, empty, a typo) defaults to 'minimal' —
// appropriate while the visible catalog is BetSwirl's six games (see
// CASINO_CONTENT_MODE above), same "narrower is the default, wider is the
// deliberate opt-in" pattern used throughout this file.
const rawCasinoNavMode = String(readEnv('VITE_CASINO_NAV_MODE') ?? '').trim().toLowerCase();
export const CASINO_NAV_MODE = rawCasinoNavMode === 'full' ? 'full' : 'minimal';

// Casino LAYOUT/presentation mode — a second, alternate presentation of the
// SAME Casino Lobby (same game data, search, Favorites/Recently Played,
// content/nav-mode gating — see CASINO_CONTENT_MODE/CASINO_NAV_MODE above),
// never a different data source or a fork of any business logic. Read via
// VITE_CASINO_LAYOUT_MODE. 'classic' is the current, already-shipped Lobby
// (3 promo cards, standard-size cards, discovery rails) and is the default
// whenever this is unset — unlike CASINO_NAV_MODE/CASINO_CONTENT_MODE
// above, the SAFE default here is the EXISTING behavior, not a narrower new
// one, so restoring classic is always possible with zero Vercel config
// (see GameFirstLobby/FEATURED_GRID in CasinoCatalog.jsx). Only the exact
// string 'game-first' opts into the alternate presentation (no promo row,
// the games as the immediate hero, larger game cards) built for the
// current small BetSwirl-only catalog.
const rawCasinoLayoutMode = String(readEnv('VITE_CASINO_LAYOUT_MODE') ?? '').trim().toLowerCase();
export const CASINO_LAYOUT_MODE = rawCasinoLayoutMode === 'game-first' ? 'game-first' : 'classic';

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

// Third-party studio demo catalogues (see src/lib/catalog). Only the exact
// string 'true' turns a source on. Default OFF, and deliberately so: these are
// public marketing demo endpoints with no agreement behind them, so a source
// can start refusing traffic at any time. When it does, the failure is a
// lobby full of tiles that open an empty frame — strictly worse than not
// listing the games at all — and this flag is the switch that takes them out
// without a deploy-and-pray. BGaming did exactly that: it began returning
// HTTP 429 with a ~23h Retry-After to every IP tried, including a clean one.
export const ENABLE_BGAMING = String(readEnv('VITE_ENABLE_BGAMING') ?? '').trim().toLowerCase() === 'true';

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

// Native gas token sentinel used by BetSwirl for ETH bets.
export const GAS_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

// --- BetSwirl (casino) — @betswirl/sdk-core@0.1.27 -------------------------
// Base Sepolia reference data captured during Discovery. These addresses are
// NOT what the app bets against: useBetSwirl passes CASINO_CHAIN_ID to
// initViemBetSwirlClient and the SDK resolves the right deployment itself, so
// this block stays correct only for Base Sepolia and must not be treated as
// "the casino contracts" now that the network is switchable.
export const betswirlBaseSepolia = {
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

// BETSWIRL_ENV is the ONE centralized flag that decides which BetSwirl
// deployment config blob (bank/leaderboard/game addresses, subgraph, default
// affiliate) the app treats as authoritative. This is independent of
// CASINO_USE_MAINNET above, which picks the CHAIN bets are placed on — the
// SDK resolves the actual on-chain deployment from CASINO_CHAIN_ID itself, so
// switching to mainnet does not require this config blob to be populated.
// Read via VITE_BETSWIRL_ENV (Vite exposes only VITE_-prefixed vars to the
// client bundle) so it can be set per Vercel environment (Production vs
// Preview/Development) with no extra plumbing — leave it unset in
// Preview/Development to default to staging, set it only on Production when
// BetSwirl production is intentionally ready.
const rawBetswirlEnv = String(
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BETSWIRL_ENV) || 'staging',
).toLowerCase();
export const BETSWIRL_ENV = rawBetswirlEnv === 'production' ? 'production' : 'staging';
export const IS_BETSWIRL_PRODUCTION = BETSWIRL_ENV === 'production';

// Current, working config — Base Sepolia testnet. This is what the app has
// run on since Phase 4 and is exactly what ships when BETSWIRL_ENV=staging
// (the default). Reuses betswirlBaseSepolia above as the single source of
// truth for these addresses rather than duplicating them.
const BETSWIRL_STAGING_CONFIG = betswirlBaseSepolia;

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
