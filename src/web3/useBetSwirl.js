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
// Re-exported for backward compatibility with any existing import of
// BETSWIRL_GAMES from this file — see betswirlCatalog.js for why the data
// itself now lives there (so importing just the catalog doesn't pull in
// this file's own @betswirl/sdk-core dependency).
export { BETSWIRL_GAMES } from './betswirlCatalog';

const AFFILIATE = import.meta.env.VITE_AFFILIATE_ADDRESS;
const ETH_TOKEN = { symbol: 'ETH', address: GAS_TOKEN_ADDRESS, decimals: 18 };

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
