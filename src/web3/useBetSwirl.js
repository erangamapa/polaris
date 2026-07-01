// BetSwirl casino integration bound to the connected wallet (Base Sepolia).
// Auto-switches the wallet to the casino chain at bet time, then places a real
// on-chain bet (Chainlink VRF) with our affiliate attached.
import { useCallback } from 'react';
import { useAccount, useConfig } from 'wagmi';
import { getWalletClient, getPublicClient, switchChain } from '@wagmi/core';
import { parseEther } from 'viem';
import {
  initViemBetSwirlClient, GAS_TOKEN_ADDRESS,
  getKenoConfigurationFunctionData, parseRawKenoConfiguration,
} from '@betswirl/sdk-core';
import { CASINO_CHAIN_ID } from '@shared/chains';

const AFFILIATE = import.meta.env.VITE_AFFILIATE_ADDRESS;
const ETH_TOKEN = { symbol: 'ETH', address: GAS_TOKEN_ADDRESS, decimals: 18 };

// The full BetSwirl catalog on Base Sepolia. `image` = self-hosted BetSwirl card
// art (public/img/games). `playable` games are wired + verified on-chain; the
// weighted games (wheel/plinko) revert on this testnet deployment, so they show
// in the catalog but aren't bettable here.
export const BETSWIRL_GAMES = [
  { key: 'dice', title: 'Dice', image: '/img/games/dice.webp', playable: true, control: 'dice' },
  { key: 'coin-toss', title: 'Coin Toss', image: '/img/games/coin-toss.webp', playable: true, control: 'coin' },
  { key: 'roulette', title: 'Roulette', image: '/img/games/roulette.webp', playable: true, control: 'roulette' },
  { key: 'keno', title: 'Keno', image: '/img/games/keno.webp', playable: true, control: 'keno' },
  { key: 'wheel', title: 'Wheel', image: '/img/games/wheel.webp', playable: false, control: 'weighted' },
  { key: 'plinko', title: 'Plinko', image: '/img/games/plinko.webp', playable: false, control: 'weighted' },
];

export function useBetSwirl() {
  const { isConnected } = useAccount();
  const config = useConfig();

  // Build a BetSwirl client bound to Base Sepolia, switching the wallet if needed.
  const getClient = useCallback(async () => {
    await switchChain(config, { chainId: CASINO_CHAIN_ID });
    const walletClient = await getWalletClient(config, { chainId: CASINO_CHAIN_ID });
    const publicClient = getPublicClient(config, { chainId: CASINO_CHAIN_ID });
    return initViemBetSwirlClient(publicClient, walletClient, { chainId: CASINO_CHAIN_ID, affiliate: AFFILIATE });
  }, [config]);

  const loadKenoConfig = useCallback(async () => {
    const fd = getKenoConfigurationFunctionData(GAS_TOKEN_ADDRESS, CASINO_CHAIN_ID);
    const publicClient = getPublicClient(config, { chainId: CASINO_CHAIN_ID });
    const raw = await publicClient.readContract({
      address: fd.data.to, abi: fd.data.abi, functionName: fd.data.functionName, args: fd.data.args,
    });
    return parseRawKenoConfiguration(raw, ETH_TOKEN, CASINO_CHAIN_ID);
  }, [config]);

  // Place a bet on any playable game, wait for the VRF roll, return the result.
  const play = useCallback(
    async ({ gameKey, betEth, selection, onBetPlaced }) => {
      const client = await getClient();
      const base = { betAmount: parseEther(String(betEth)), tokenAddress: GAS_TOKEN_ADDRESS, affiliate: AFFILIATE };
      const opts = { pollingInterval: 2500 };

      let placed;
      if (gameKey === 'dice') placed = await client.playDice({ ...base, cap: selection.cap }, opts);
      else if (gameKey === 'coin-toss') placed = await client.playCoinToss({ ...base, face: selection.face }, opts);
      else if (gameKey === 'roulette') placed = await client.playRoulette({ ...base, numbers: selection.numbers }, opts);
      else if (gameKey === 'keno') {
        const kenoConfig = await loadKenoConfig();
        placed = await client.playKeno({ ...base, balls: selection.balls, kenoConfig }, opts);
      } else throw new Error(`${gameKey} is not available on this testnet`);

      onBetPlaced?.({ betTxnHash: placed.receipt.transactionHash, id: placed.placedBet.id });
      const { rolledBet } = await client.waitRolledBet(placed.placedBet, { pollingInterval: 2500, timeout: 120_000 });
      return { placedBet: placed.placedBet, rolledBet };
    },
    [getClient, loadKenoConfig],
  );

  return { ready: isConnected, play };
}
