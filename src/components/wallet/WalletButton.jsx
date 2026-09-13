import { AlertTriangle, Wallet } from "lucide-react";
import { shortAddress } from "@/web3/useWallet";
import { WalletAvatar } from "@/components/wallet/WalletAvatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Mobile's one wallet control — same architecture as the desktop
// BalanceControl (identity + primary balance, single tap opens FundsDialog
// directly, no separate mobile-only experience). All state is passed in
// from TopBar (the one place that resolves dev-mock overrides and the
// arena-aware primary balance), so this stays purely presentational rather
// than re-deriving wallet state a second way.
export function WalletButton({ onManage, isConnected, address, primaryBalance, primarySymbol, primaryLoading, primaryError, wrongNetwork }) {
  if (!isConnected) {
    return (
      <button
        onClick={onManage}
        data-test-id="connect-wallet"
        className="flex shrink-0 items-center gap-2 rounded-lg [background-image:var(--global-cta-gradient)] px-3 py-1.5 text-sm font-semibold text-[var(--global-cta-text)] hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
      >
        <Wallet className="size-4" />
        Connect<span className="hidden sm:inline"> Wallet</span>
      </button>
    );
  }

  return (
    <button
      onClick={onManage}
      aria-label={`Wallet, ${primaryLoading ? "loading" : `${primaryBalance.toFixed(4)} ${primarySymbol}`}${wrongNetwork ? ", wrong network" : ""}`}
      data-test-id="wallet-pill"
      className={cn(
        "flex min-w-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 ring-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        wrongNetwork ? "bg-[var(--warning)]/10 ring-[var(--warning)]/40" : "bg-zinc-800/80 ring-white/5 hover:bg-zinc-800"
      )}
    >
      <WalletAvatar address={address} size={18} />
      {primaryLoading ? (
        <Skeleton className="h-3.5 w-12" />
      ) : primaryError ? (
        <AlertTriangle className="size-3.5 shrink-0 text-[var(--warning)]" aria-hidden="true" />
      ) : (
        <span className="truncate font-mono text-xs font-semibold tabular-nums text-white">
          {primaryBalance.toFixed(4)} {primarySymbol}
        </span>
      )}
      <span className="truncate font-mono text-xs text-zinc-400">{shortAddress(address)}</span>
    </button>
  );
}
