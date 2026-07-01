// BetSwirl casino integration bound to the connected wallet.
// Places real on-chain bets (Chainlink VRF) with our affiliate attached.
import { useCallback, useMemo } from 'react';
import { usePublicClient, useWalletClient } from 'wagmi';
import { parseEther } from 'viem';
import { initViemBetSwirlClient, GAS_TOKEN_ADDRESS } from '@betswirl/sdk-core';
import { CHAIN } from './config';

const AFFILIATE = import.meta.env.VITE_AFFILIATE_ADDRESS;

// BetSwirl games we surface in the lobby. `play` maps to the sdk client method.
export const BETSWIRL_GAMES = [
  { key: 'dice', title: 'Dice', method: 'playDice', wait: 'waitDice', hue: 'from-violet-600 to-fuchsia-700' },
  { key: 'coin-toss', title: 'Coin Toss', method: 'playCoinToss', wait: 'waitCoinToss', hue: 'from-amber-500 to-orange-600' },
];

export function useBetSwirl() {
  const publicClient = usePublicClient({ chainId: CHAIN.id });
  const { data: walletClient } = useWalletClient({ chainId: CHAIN.id });

  const client = useMemo(() => {
    if (!publicClient || !walletClient) return null;
    return initViemBetSwirlClient(publicClient, walletClient, {
      chainId: CHAIN.id,
      affiliate: AFFILIATE,
    });
  }, [publicClient, walletClient]);

  // Dice: cap 1-99, higher cap = higher win chance. Returns the rolled result.
  const playDice = useCallback(
    async ({ betEth, cap = 50, onBetPlaced }) => {
      if (!client) throw new Error('Connect your wallet first');
      const betAmount = parseEther(String(betEth));
      const { placedBet, receipt } = await client.playDice(
        { betAmount, cap, tokenAddress: GAS_TOKEN_ADDRESS, affiliate: AFFILIATE },
        { pollingInterval: 2500 },
      );
      onBetPlaced?.({ betTxnHash: receipt.transactionHash, id: placedBet.id });
      const { rolledBet } = await client.waitRolledBet(placedBet, { pollingInterval: 2500, timeout: 120_000 });
      return { placedBet, rolledBet };
    },
    [client],
  );

  // Coin toss: choose 'HEADS' | 'TAILS'.
  const playCoinToss = useCallback(
    async ({ betEth, face = 'HEADS', onBetPlaced }) => {
      if (!client) throw new Error('Connect your wallet first');
      const betAmount = parseEther(String(betEth));
      const { placedBet, receipt } = await client.playCoinToss(
        { betAmount, face, tokenAddress: GAS_TOKEN_ADDRESS, affiliate: AFFILIATE },
        { pollingInterval: 2500 },
      );
      onBetPlaced?.({ betTxnHash: receipt.transactionHash, id: placedBet.id });
      const { rolledBet } = await client.waitRolledBet(placedBet, { pollingInterval: 2500, timeout: 120_000 });
      return { placedBet, rolledBet };
    },
    [client],
  );

  return { ready: Boolean(client), playDice, playCoinToss };
}
