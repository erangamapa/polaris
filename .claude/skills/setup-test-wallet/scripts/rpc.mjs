// Resilient RPC transports for the setup scripts.
//
// WHY THIS EXISTS: the Polygon Amoy RPC pinned in packages/shared/chains.js
// (rpc-amoy.polygon.technology) is a free public endpoint that intermittently
// refuses connections — it was unreachable while this skill was written. During
// SETUP that failure mode is uniquely bad: someone is trying to work out whether
// their faucet request landed, and an RPC timeout looks identical to "the faucet
// gave me nothing". They go back and request again, hit the rate limit, and
// conclude the whole thing is broken.
//
// So the setup scripts read through a fallback list: the chain's own pinned
// endpoint first (so this never disagrees with the app about which chain it is
// talking to), then public backups. viem's fallback() transport walks the list
// on failure.
//
// Scope is deliberately limited to this skill. The app itself still uses the
// pinned endpoints from chains.js — changing what the running app talks to is a
// separate decision from making a setup helper robust.
import { fallback, http } from 'viem';

const BACKUPS = {
  84532: [
    'https://base-sepolia-rpc.publicnode.com',
    'https://sepolia.base.org',
  ],
  80002: [
    'https://polygon-amoy-bor-rpc.publicnode.com',
    'https://rpc.ankr.com/polygon_amoy',
  ],
};

export function transportFor(chain) {
  const pinned = chain.rpcUrls?.default?.http ?? [];
  const urls = [...new Set([...pinned, ...(BACKUPS[chain.id] ?? [])])];
  // Short timeout per endpoint: with several to try, waiting out a long stall on
  // a dead one is worse than moving to the next.
  return fallback(urls.map((url) => http(url, { timeout: 8_000, retryCount: 1 })));
}
