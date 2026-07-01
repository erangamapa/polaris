import { Wallet, AlertTriangle, Loader2 } from "lucide-react";
import { useWallet, shortAddress } from "@/web3/useWallet";

// Replaces Login/Register. Three states: disconnected -> Connect Wallet;
// wrong network -> Switch CTA; connected -> address + ETH balance pill.
export function WalletButton({ onManage }) {
  const {
    address, isConnected, wrongNetwork, isSwitching,
    nativeBalance, nativeSymbol, connect, switchToBaseSepolia,
  } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        data-test-id="connect-wallet"
        className="flex items-center gap-2 rounded-lg bg-[var(--global-cta)] px-4 py-1.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Wallet className="size-4" />
        Connect Wallet
      </button>
    );
  }

  if (wrongNetwork) {
    return (
      <button
        onClick={switchToBaseSepolia}
        disabled={isSwitching}
        data-test-id="switch-network"
        className="flex items-center gap-2 rounded-lg bg-[var(--warning,#b45309)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {isSwitching ? <Loader2 className="size-4 animate-spin" /> : <AlertTriangle className="size-4" />}
        Switch to Base Sepolia
      </button>
    );
  }

  return (
    <button
      onClick={onManage}
      data-test-id="wallet-pill"
      className="flex items-center gap-2 rounded-lg bg-zinc-800/80 px-3 py-1.5 ring-1 ring-white/5 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid size-5 place-items-center rounded-full bg-[var(--brand-logo)] text-[10px] font-bold text-[var(--brand-logo-text)]">
        {address?.[2]?.toUpperCase() ?? "0"}
      </span>
      <span className="font-mono text-xs font-semibold tabular-nums text-white">
        {nativeBalance.toFixed(4)} {nativeSymbol}
      </span>
      <span className="hidden font-mono text-xs text-zinc-400 sm:inline">{shortAddress(address)}</span>
    </button>
  );
}
