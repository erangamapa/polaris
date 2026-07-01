// Azuro sports integration bound to the connected wallet.
// Read: bettable games/conditions from the live feed. Write: the gasless order
// flow (wrap WETH -> approve relayer -> EIP-712 sign -> createBet) with our
// affiliate enforced. Verified end-to-end in packages/shared/scripts/bet-sports.mjs.
import { useCallback, useEffect, useState } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, erc20Abi } from 'viem';
import {
  baseSepoliaData, getConditionsByGameIds, getBetFee, getBetTypedData, createBet,
} from '@azuro-org/toolkit';
import { azuro } from '@shared/chains';
import { CHAIN } from './config';

const AFFILIATE = import.meta.env.VITE_AFFILIATE_ADDRESS;
const WETH = azuro.betToken.address;
const CORE = azuro.contracts.core;
const RELAYER = azuro.contracts.relayer;
const FEED = azuro.graphql.feed;
const ATTENTION = 'By signing this transaction, I agree to place a bet for an event on Azuro Protocol';

const wethAbi = [
  { name: 'deposit', type: 'function', stateMutability: 'payable', inputs: [], outputs: [] },
  ...erc20Abi,
];

// Fetch games that currently have an Active, prematch-enabled condition to bet on.
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
          const conds = await getConditionsByGameIds({ chainId: CHAIN.id, gameIds: [g.gameId], extended: true });
          const arr = Array.isArray(conds) ? conds : conds.conditions ?? [];
          const active = arr.find((c) => c.state === 'Active' && c.isPrematchEnabled && c.outcomes?.length);
          if (active) out.push({ ...g, condition: active });
          if (out.length >= 8) break;
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
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const { data: walletClient } = useWalletClient({ chainId: CHAIN.id });

  // Full gasless order: ensure WETH, approve relayer, sign EIP-712, submit.
  const placeBet = useCallback(
    async ({ conditionId, outcomeId, odds, amountEth, onStep }) => {
      if (!walletClient || !publicClient) throw new Error('Connect your wallet first');
      const account = walletClient.account.address;
      const amount = parseEther(String(amountEth));

      onStep?.('funding');
      const weth = await publicClient.readContract({ address: WETH, abi: erc20Abi, functionName: 'balanceOf', args: [account] });
      if (weth < amount) {
        const hash = await walletClient.writeContract({ address: WETH, abi: wethAbi, functionName: 'deposit', value: amount - weth });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      onStep?.('approving');
      const allowance = await publicClient.readContract({ address: WETH, abi: erc20Abi, functionName: 'allowance', args: [account, RELAYER] });
      if (allowance < amount) {
        const hash = await walletClient.writeContract({ address: WETH, abi: erc20Abi, functionName: 'approve', args: [RELAYER, amount * 100n] });
        await publicClient.waitForTransactionReceipt({ hash });
      }

      onStep?.('signing');
      const fee = await getBetFee(CHAIN.id);
      const minOdds = BigInt(Math.floor(Number(odds) * 0.9 * 1e12)).toString();
      const clientData = {
        attention: ATTENTION,
        affiliate: AFFILIATE,
        core: CORE,
        expiresAt: Math.floor(Date.now() / 1000) + 300,
        chainId: CHAIN.id,
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
    [walletClient, publicClient],
  );

  return { ready: Boolean(walletClient), placeBet };
}

// Marker used only for the reference/toolkit domain (kept for clarity).
export const AZURO_ENV = baseSepoliaData.environment;
