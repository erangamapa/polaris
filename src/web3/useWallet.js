// One friendly hook for everything the UI needs about the connected wallet.
// Hides wagmi/Reown specifics behind a stable shape.
import { useAccount, useBalance, useChainId, useDisconnect, useSwitchChain } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { azuro } from '@shared/chains';
import { CHAIN } from './config';

const CHAIN_ID = CHAIN.id;

export function useWallet() {
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { open } = useAppKit();

  // Native ETH balance on Base Sepolia (BetSwirl bets + gas).
  const { data: nativeBalance } = useBalance({
    address,
    chainId: CHAIN_ID,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  // WETH balance — Azuro's bet token on Base Sepolia.
  const { data: wethBalance } = useBalance({
    address,
    chainId: CHAIN_ID,
    token: azuro.betToken.address,
    query: { enabled: Boolean(address), refetchInterval: 15_000 },
  });

  const wrongNetwork = isConnected && chainId !== CHAIN_ID;

  return {
    address,
    isConnected,
    status,
    chainId,
    wrongNetwork,
    isSwitching,
    // Native balance as a display string, e.g. "0.0203".
    nativeBalance: nativeBalance ? Number(nativeBalance.formatted) : 0,
    nativeSymbol: nativeBalance?.symbol ?? CHAIN.nativeCurrency.symbol,
    wethBalance: wethBalance ? Number(wethBalance.formatted) : 0,
    connect: () => open({ view: 'Connect' }),
    openAccount: () => open({ view: 'Account' }),
    disconnect,
    switchToBaseSepolia: () => switchChain({ chainId: CHAIN_ID }),
  };
}

export function shortAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
