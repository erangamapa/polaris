// Shared server helpers for the thin read/affiliate backend (Vercel functions).
// Non-custodial: the backend holds no keys and can never move user funds. It only
// reads on-chain data and enforces our affiliate address server-side.
import { createPublicClient, http, erc20Abi, formatEther } from 'viem';
import {
  CASINO_CHAIN_ID as SHARED_CASINO_CHAIN_ID,
  SPORTS_CHAIN_ID as SHARED_SPORTS_CHAIN_ID,
  CASINO_CHAIN,
  polygonAmoy as sharedPolygonAmoy,
} from '../packages/shared/chains.js';

// Casino chain follows VITE_USE_MAINNET (Vercel injects it into the function
// runtime too, so client and server resolve the same network from one
// variable); sports = Polygon Amoy (USDT) in both modes.
export const CASINO_CHAIN_ID = SHARED_CASINO_CHAIN_ID;
export const SPORTS_CHAIN_ID = SHARED_SPORTS_CHAIN_ID;
export const CASINO_RPC = CASINO_CHAIN.rpcUrls.default.http[0];
export const SPORTS_RPC = sharedPolygonAmoy.rpcUrls.default.http[0];
export const USDT = '0xCf1b86ceD971b88C042C64A9c099377e2738073C';

// Authoritative affiliate address — server-side env is the source of truth.
export const AFFILIATE = (process.env.AFFILIATE_ADDRESS || process.env.VITE_AFFILIATE_ADDRESS || '').toLowerCase();

export const AZURO_BETS_SUBGRAPH =
  'https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-polygon-amoy-dev-v3';

export const casinoClient = createPublicClient({ chain: CASINO_CHAIN, transport: http(CASINO_RPC) });
export const sportsClient = createPublicClient({ chain: sharedPolygonAmoy, transport: http(SPORTS_RPC) });

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
