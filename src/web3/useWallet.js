// One friendly hook for everything the UI needs about the connected wallet.
// Two-chain aware: casino (BetSwirl) on Base Sepolia, sports (Azuro) on Polygon
// Amoy. Exposes per-chain balances and a generic switchTo(chainId).
//
// NOTE: wagmi v3's useBalance returns { value, decimals, symbol } (no `.formatted`)
// and has no `token` param — so native balances are formatted from `value` and
// the ERC-20 (USDT) balance is read via useReadContract.
import { useAccount, useBalance, useChainId, useDisconnect, useReadContract, useSwitchChain } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { formatUnits, erc20Abi } from 'viem';
import { azuro, CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from '@shared/chains';

const fmt = (bal) => (bal ? Number(formatUnits(bal.value, bal.decimals)) : 0);

export function useWallet() {
  // `connector` is wagmi's own already-reactive record of which provider is
  // active — reading its name is display-only, not new wallet logic (see
  // WALLET UX REDESIGN §5 — "provider name if reliably available").
  const { address, isConnected, status, connector } = useAccount();
  const chainId = useChainId();
  const { disconnect, disconnectAsync } = useDisconnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { open } = useAppKit();

  const enabled = Boolean(address);

  // Casino stake/gas: native ETH on Base Sepolia. `isFetching` (react-query,
  // under wagmi) is exposed separately from `isLoading` so callers can tell
  // "no value yet" (loading) apart from "refreshing a value we already have"
  // (syncing) — see lib/casinoBalance.js's resolveBalanceStatus, which is
  // the one place that distinction turns into a customer-facing status.
  const { data: casinoBal, isLoading: casinoBalLoading, isFetching: casinoBalFetching, isError: casinoBalError, refetch: refetchCasinoBalance } = useBalance({
    address, chainId: CASINO_CHAIN_ID,
    query: { enabled, refetchInterval: 15_000 },
  });

  // Sports gas: native POL on Polygon Amoy.
  const { data: sportsGasBal } = useBalance({
    address, chainId: SPORTS_CHAIN_ID,
    query: { enabled, refetchInterval: 30_000 },
  });

  // Sports stake: USDT (ERC-20) on Polygon Amoy — read via balanceOf.
  const { data: usdtRaw } = useReadContract({
    address: azuro.betToken.address, abi: erc20Abi, functionName: 'balanceOf',
    args: [address], chainId: SPORTS_CHAIN_ID,
    query: { enabled, refetchInterval: 15_000 },
  });

  const switchTo = async (targetChainId) => {
    if (chainId === targetChainId) return;
    await switchChainAsync({ chainId: targetChainId });
  };

  return {
    address,
    isConnected,
    status,
    connectorName: connector?.name,
    chainId,
    onCasinoChain: chainId === CASINO_CHAIN_ID,
    onSportsChain: chainId === SPORTS_CHAIN_ID,
    casinoBalance: fmt(casinoBal),
    casinoSymbol: casinoBal?.symbol ?? 'ETH',
    casinoBalanceLoading: casinoBalLoading,
    casinoBalanceFetching: casinoBalFetching,
    casinoBalanceError: casinoBalError,
    refetchCasinoBalance,
    sportsBalance: usdtRaw !== undefined ? Number(formatUnits(usdtRaw, azuro.betToken.decimals)) : 0,
    sportsSymbol: azuro.betToken.symbol,
    sportsGas: fmt(sportsGasBal),
    sportsGasSymbol: sportsGasBal?.symbol ?? 'POL',
    isSwitching,
    connect: () => open({ view: 'Connect' }),
    disconnect,
    disconnectAsync,
    switchTo,
  };
}

export function shortAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
