// Pinned chain + protocol configuration for WildStakes (testnet-only).
// Populated from live Discovery (Phase 0.5, docs/architecture/23) against the
// BetSwirl and Azuro SDKs on 2026-07-01. Both verticals co-locate on Base Sepolia.
//
// Betting assets on Base Sepolia:
//   - BetSwirl casino  -> native ETH (token address 0x0 = GAS_TOKEN)
//   - Azuro sports     -> WETH (0x9e09...935f)
// Both are ETH-denominated on one chain, so funding = ETH (+ wrap some to WETH).

export const BASE_SEPOLIA_ID = 84532;

export const baseSepolia = {
  id: BASE_SEPOLIA_ID,
  name: 'Base Sepolia',
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

// Native gas token sentinel used by BetSwirl for ETH bets.
export const GAS_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

// --- BetSwirl (casino) — @betswirl/sdk-core@0.1.27 -------------------------
export const betswirl = {
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

// --- Azuro (sports/predictions) — @azuro-org/sdk@7.4.1 / toolkit@6.3.1 -----
export const azuro = {
  chainId: BASE_SEPOLIA_ID,
  environment: 'BaseSepoliaWETH',
  contracts: {
    lp: '0x4fE86EddCC22dc992b7994878169201Ec7ea50AB',
    core: '0x679CC42F69F98631668348d088086359D4217Ffa',
    relayer: '0x2De54cABa6A8198D9Dc51931485Bfdc8017aB0c5',
    azuroBet: '0xD031C4BDd4b7c30e3725132109786B8E158A4c07',
    vault: '0x6910dE58f350CE0A8b42D27004313346A31b3540',
    paymaster: '0xC2577cdcF684C9756f2C81efdA001CbEFEf3Dd92',
    cashout: '0xf52Eb6ec19d81Ea623A7d7Ad397287C0C40f2F37',
  },
  betToken: { symbol: 'WETH', address: '0x9e09f213Ff75e53D52e9e777A6567A68683E935f', decimals: 18 },
  graphql: {
    bets: 'https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-base-sepolia-dev-v3',
    feed: 'https://thegraph-1.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-data-feed-base-sepolia-dev',
  },
  api: 'https://dev-api.onchainfeed.org/api/v1/public',
  socket: 'wss://dev-streams.onchainfeed.org/v1/streams',
};

// House/affiliate address is injected at runtime from env (server) or the
// build-time public var (client). Never hardcode a wallet here.
export const AFFILIATE_ADDRESS_ENV = 'VITE_AFFILIATE_ADDRESS';
