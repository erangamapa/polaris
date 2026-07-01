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

// Fetch games that currently have active markets to bet on (all markets shown).
export function useBettableGames() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = { query: `{ games(first:40, orderBy: startsAt, orderDirection: desc){ gameId startsAt title sport{name} league{name} } }` };
        const res = await fetch(FEED, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(q) });
        const feed = (await res.json()).data?.games ?? [];
        const out = [];
        for (const g of feed.slice(0, 20)) {
          const conds = await getConditionsByGameIds({ chainId: SPORTS_CHAIN_ID, gameIds: [g.gameId], extended: true });
          const arr = Array.isArray(conds) ? conds : conds.conditions ?? [];
          const markets = arr.filter((c) => c.state === 'Active' && c.outcomes?.length);
          if (markets.length) out.push({ ...g, markets });
          if (out.length >= 12) break;
        }
        if (!cancelled) setGames(out);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { games, loading };
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
