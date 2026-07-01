import { Wallet } from "lucide-react";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from "@shared/chains";

const NETWORK = {
  [CASINO_CHAIN_ID]: { label: "Base Sepolia", dot: "#0052ff" },
  [SPORTS_CHAIN_ID]: { label: "Polygon Amoy", dot: "#8247e5" },
};

// Replaces Login/Register. Disconnected -> Connect Wallet; connected -> a pill
// showing the active network (casino=Base Sepolia, sports=Amoy) + address.
// The correct chain is selected automatically at bet time, so no forced CTA here.
export function WalletButton({ onManage }) {
  const { address, isConnected, chainId } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={onManage}
        data-test-id="connect-wallet"
        className="flex items-center gap-2 rounded-lg bg-[var(--global-cta)] px-4 py-1.5 text-sm font-semibold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Wallet className="size-4" />
        Connect Wallet
      </button>
    );
  }

  const net = NETWORK[chainId] ?? { label: "Unknown", dot: "#a1a1aa" };

  return (
    <button
      onClick={onManage}
      data-test-id="wallet-pill"
      className="flex items-center gap-2 rounded-lg bg-zinc-800/80 px-3 py-1.5 ring-1 ring-white/5 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="inline-block size-2 rounded-full" style={{ background: net.dot }} aria-hidden />
      <span className="hidden text-xs font-medium text-zinc-300 sm:inline">{net.label}</span>
      <span className="font-mono text-xs text-white">{shortAddress(address)}</span>
    </button>
  );
}
