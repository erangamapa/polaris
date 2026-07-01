// Shared server helpers for the thin read/affiliate backend (Vercel functions).
// Non-custodial: the backend holds no keys and can never move user funds. It only
// reads on-chain data and enforces our affiliate address server-side.
import { createPublicClient, http, erc20Abi, formatEther } from 'viem';

// Casino = Base Sepolia (native ETH); sports = Polygon Amoy (USDT).
export const CASINO_CHAIN_ID = 84532;
export const SPORTS_CHAIN_ID = 80002;
export const CASINO_RPC = 'https://sepolia.base.org';
export const SPORTS_RPC = 'https://rpc-amoy.polygon.technology';
export const USDT = '0xCf1b86ceD971b88C042C64A9c099377e2738073C';

// Authoritative affiliate address — server-side env is the source of truth.
export const AFFILIATE = (process.env.AFFILIATE_ADDRESS || process.env.VITE_AFFILIATE_ADDRESS || '').toLowerCase();

export const AZURO_BETS_SUBGRAPH =
  'https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-polygon-amoy-dev-v3';

const baseSepolia = {
  id: CASINO_CHAIN_ID, name: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [CASINO_RPC] } },
};
const polygonAmoy = {
  id: SPORTS_CHAIN_ID, name: 'Polygon Amoy',
  nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
  rpcUrls: { default: { http: [SPORTS_RPC] } },
};

export const casinoClient = createPublicClient({ chain: baseSepolia, transport: http(CASINO_RPC) });
export const sportsClient = createPublicClient({ chain: polygonAmoy, transport: http(SPORTS_RPC) });

const fmtUsdt = (v) => (Number(v) / 1e6).toString();

export async function readBalances(address) {
  const [casinoEth, sportsUsdt, sportsPol] = await Promise.all([
    casinoClient.getBalance({ address }),
    sportsClient.readContract({ address: USDT, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    sportsClient.getBalance({ address }),
  ]);
  return {
    casino: { chainId: CASINO_CHAIN_ID, eth: formatEther(casinoEth) },
    sports: { chainId: SPORTS_CHAIN_ID, usdt: fmtUsdt(sportsUsdt), pol: formatEther(sportsPol) },
  };
}

export function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function json(res, status, body) {
  res.setHeader('content-type', 'application/json');
  res.status(status).send(JSON.stringify(body));
}
