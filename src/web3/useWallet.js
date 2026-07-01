// One friendly hook for everything the UI needs about the connected wallet.
// Two-chain aware: casino (BetSwirl) on Base Sepolia, sports (Azuro) on Polygon
// Amoy. Exposes per-chain balances and a generic switchTo(chainId).
import { useAccount, useBalance, useChainId, useDisconnect, useSwitchChain } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { azuro, CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from '@shared/chains';

export function useWallet() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { open } = useAppKit();

  // Casino stake/gas: native ETH on Base Sepolia.
  const { data: casinoBal } = useBalance({
    address, chainId: CASINO_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  // Sports stake: USDT on Polygon Amoy.
  const { data: sportsBal } = useBalance({
    address, chainId: SPORTS_CHAIN_ID, token: azuro.betToken.address,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  // Sports gas: native POL on Amoy.
  const { data: sportsGas } = useBalance({
    address, chainId: SPORTS_CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 30_000 },
  });

  const switchTo = async (targetChainId) => {
    if (chainId === targetChainId) return;
    await switchChainAsync({ chainId: targetChainId });
  };

  return {
    address,
    isConnected,
    status,
    chainId,
    onCasinoChain: chainId === CASINO_CHAIN_ID,
    onSportsChain: chainId === SPORTS_CHAIN_ID,
    casinoBalance: casinoBal ? Number(casinoBal.formatted) : 0,
    casinoSymbol: casinoBal?.symbol ?? 'ETH',
    sportsBalance: sportsBal ? Number(sportsBal.formatted) : 0,
    sportsSymbol: sportsBal?.symbol ?? 'USDT',
    sportsGas: sportsGas ? Number(sportsGas.formatted) : 0,
    sportsGasSymbol: sportsGas?.symbol ?? 'POL',
    isSwitching,
    connect: () => open({ view: 'Connect' }),
    openAccount: () => open({ view: 'Account' }),
    disconnect,
    switchTo,
  };
}

export function shortAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
