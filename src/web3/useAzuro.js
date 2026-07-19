// Azuro sports integration bound to the connected wallet (Polygon Amoy).
// Read: bettable games/markets from the live Amoy feed. Write: the gasless order
// flow (mint/approve USDT -> EIP-712 sign -> createBet) with our affiliate
// enforced, auto-switching the wallet to the sports chain at bet time.
import { useCallback, useEffect, useState } from 'react';
import { useAccount, useConfig } from 'wagmi';
import { getWalletClient, getPublicClient, switchChain } from '@wagmi/core';
import { parseUnits, erc20Abi } from 'viem';
import { getConditionsByGameIds, getBetFee, getBetTypedData, createBet } from '@azuro-org/toolkit';
import { azuro, SPORTS_CHAIN_ID } from '@shared/chains';
import { normalizeAzuroGame } from '@/lib/sportsModel';

const AFFILIATE = import.meta.env.VITE_AFFILIATE_ADDRESS;
const USDT = azuro.betToken.address;
const DECIMALS = azuro.betToken.decimals;
const CORE = azuro.contracts.core;
const RELAYER = azuro.contracts.relayer;
const FEED = azuro.graphql.feed;
const ATTENTION = 'By signing this transaction, I agree to place a bet for an event on Azuro Protocol';

const usdtAbi = [
  { name: 'mint', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  ...erc20Abi,
];

// A slow/unreachable RPC node can leave an SDK call pending forever rather
// than rejecting — without a bound, that would hang `loading` indefinitely
// and leave the customer-facing empty state ("provider temporarily
// unavailable") unreachable. Reject after `ms` instead of waiting forever.
const CONDITION_FETCH_TIMEOUT_MS = 6000;
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

// Fetch games that have active markets. Each game is tagged `bettable` = its
// kickoff is still in the future — only those can actually be bet (Azuro's
// relayer rejects bets on games that have already started, "Game is not active").
// We poll so a freshly-seeded live game appears without a manual refresh.
export function useBettableGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const now = Math.floor(Date.now() / 1000);
        const q = { query: `{ games(first:40, orderBy: startsAt, orderDirection: desc){ gameId startsAt title sport{name slug} league{name} country{name} participants{name image} } }` };
        const res = await fetch(FEED, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q) });
        const feed = (await res.json()).data?.games ?? [];
        // Fetched concurrently, not sequentially — a slow/unreachable RPC
        // node must cost at most one timeout period total, not one timeout
        // *per game* (which could otherwise multiply into minutes and leave
        // `loading` stuck for the whole batch).
        const settled = await Promise.allSettled(
          feed.slice(0, 20).map((g) =>
            withTimeout(getConditionsByGameIds({ chainId: SPORTS_CHAIN_ID, gameIds: [g.gameId], extended: true }), CONDITION_FETCH_TIMEOUT_MS)
              .then((conds) => ({ g, arr: Array.isArray(conds) ? conds : conds.conditions ?? [] }))
          )
        );
        const out = [];
        for (const s of settled) {
          if (s.status !== 'fulfilled') continue;
          const { g, arr } = s.value;
          const markets = arr.filter((c) => c.state === 'Active' && c.outcomes?.length);
          if (markets.length) out.push({ ...g, markets, bettable: Number(g.startsAt) > now });
          if (out.length >= 12) break;
        }
        // Bettable (upcoming) games first.
        out.sort((a, b) => Number(b.bettable) - Number(a.bettable) || Number(a.startsAt) - Number(b.startsAt));
        if (!cancelled) setGames(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return { games, loading, bettableCount: games.filter((g) => g.bettable).length };
}

// Normalized view of useBettableGames() for every customer-facing sports
// page (Sports Home, sport landing, live, league, event detail) — the raw
// `game` shape (and its raw markets/outcomes) stay attached via `.raw` on
// each normalized event/market/outcome so AzuroBetSlip's existing
// { game, market, outcome } contract can be reconstructed unchanged when an
// odds button is clicked. Games outside the 5-sport MVP whitelist are
// dropped (normalizeAzuroGame returns null for them), not shown as "Other".
export function useNormalizedAzuroEvents() {
  const { games, loading, bettableCount } = useBettableGames();
  const events = games.map(normalizeAzuroGame).filter(Boolean);
  return { events, loading, bettableCount };
}

export function useAzuroBet() {
  const { isConnected } = useAccount();
  const config = useConfig();

  // Mint test USDT to the connected wallet (public faucet on the token).
  const mintUsdt = useCallback(
    async (amount = 100) => {
      await switchChain(config, { chainId: SPORTS_CHAIN_ID });
      const walletClient = await getWalletClient(config, { chainId: SPORTS_CHAIN_ID });
      const publicClient = getPublicClient(config, { chainId: SPORTS_CHAIN_ID });
      const hash = await walletClient.writeContract({ address: USDT, abi: usdtAbi, functionName: 'mint', args: [parseUnits(String(amount), DECIMALS)] });
      await publicClient.waitForTransactionReceipt({ hash });
    },
    [config],
  );

  // Full gasless order: ensure chain + USDT, approve relayer, sign, submit.
  const placeBet = useCallback(
    async ({ conditionId, outcomeId, odds, amountUsdt, onStep }) => {
      onStep?.('switching');
      await switchChain(config, { chainId: SPORTS_CHAIN_ID });
      const walletClient = await getWalletClient(config, { chainId: SPORTS_CHAIN_ID });
      const publicClient = getPublicClient(config, { chainId: SPORTS_CHAIN_ID });
      const account = walletClient.account.address;
      const amount = parseUnits(String(amountUsdt), DECIMALS);

      onStep?.('funding');
      const bal = await publicClient.readContract({ address: USDT, abi: erc20Abi, functionName: 'balanceOf', args: [account] });
      if (bal < amount) {
        const hash = await walletClient.writeContract({ address: USDT, abi: usdtAbi, functionName: 'mint', args: [parseUnits('100', DECIMALS)] });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      onStep?.('approving');
      const allowance = await publicClient.readContract({ address: USDT, abi: erc20Abi, functionName: 'allowance', args: [account, RELAYER] });
      if (allowance < amount) {
        const hash = await walletClient.writeContract({ address: USDT, abi: erc20Abi, functionName: 'approve', args: [RELAYER, amount * 1000n] });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      onStep?.('signing');
      const fee = await getBetFee(SPORTS_CHAIN_ID);
      const minOdds = BigInt(Math.floor(Number(odds) * 0.9 * 1e12)).toString();
      const clientData = {
        attention: ATTENTION,
        affiliate: AFFILIATE,
        core: CORE,
        expiresAt: Math.floor(Date.now() / 1000) + 300,
        chainId: SPORTS_CHAIN_ID,
        relayerFeeAmount: fee.relayerFeeAmount,
        isBetSponsored: false,
        isFeeSponsored: false,
        isSponsoredBetReturnable: false,
      };
      const bet = { conditionId, outcomeId, minOdds, amount: amount.toString(), nonce: String(Date.now()) };
      const { account: _a, ...typed } = getBetTypedData({ account, clientData, bet });
      const signature = await walletClient.signTypedData(typed);

      onStep?.('submitting');
      const res = await createBet({ account, clientData, bet, signature });
      if (res.error || res.errorMessage) throw new Error(res.errorMessage || res.error);
      return res;
    },
    [config],
  );

  return { ready: isConnected, placeBet, mintUsdt };
}
