// Shared server helpers for the thin read/affiliate backend (Vercel functions).
// Non-custodial: the backend holds no keys and can never move user funds. It only
// reads on-chain data and enforces our affiliate address server-side.
import { createPublicClient, http, erc20Abi, formatEther } from 'viem';

export const CHAIN_ID = 84532;
export const RPC = 'https://sepolia.base.org';
export const WETH = '0x9e09f213Ff75e53D52e9e777A6567A68683E935f';

// Authoritative affiliate address — server-side env is the source of truth.
export const AFFILIATE = (process.env.AFFILIATE_ADDRESS || process.env.VITE_AFFILIATE_ADDRESS || '').toLowerCase();

export const AZURO_BETS_SUBGRAPH =
  'https://thegraph.onchainfeed.org/subgraphs/name/azuro-protocol/azuro-api-base-sepolia-dev-v3';

const baseSepolia = {
  id: CHAIN_ID,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC] } },
};

export const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

export async function readBalances(address) {
  const [eth, weth] = await Promise.all([
    publicClient.getBalance({ address }),
    publicClient.readContract({ address: WETH, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
  ]);
  return {
    eth: formatEther(eth),
    weth: formatEther(weth),
    // Both ETH-denominated on one chain -> a simple unified figure.
    unifiedEth: formatEther(eth + weth),
  };
}

export function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function json(res, status, body) {
  res.setHeader('content-type', 'application/json');
  res.status(status).send(JSON.stringify(body));
}
