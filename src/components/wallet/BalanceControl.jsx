import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BALANCE_STATUS } from "@/lib/casinoBalance";
import { shortAddress } from "@/web3/useWallet";
import { WalletAvatar } from "@/components/wallet/WalletAvatar";

// ONE combined identity+balance control — no intermediate Popover (see
// WALLET UX AUDIT: "no BalanceControl popover remains"). A single click
// opens the real Tribet wallet popup (FundsDialog) directly; there is no
// quick-glance layer in between anymore. Network is never shown here except
// as the wrong-network warning tone — the standing "Switch network" button
// TopBar renders beside this one still carries that flow (unchanged).
export function BalanceControl({
  address, primaryBalance, primarySymbol, primaryLoading, primaryError, primaryStatus, wrongNetwork, onManageWallet,
}) {
  const isStale = primaryStatus === BALANCE_STATUS.STALE;
  const fullValue = `${primaryBalance.toFixed(8)} ${primarySymbol}`;
  const displayValue = `${primaryBalance.toFixed(4)} ${primarySymbol}`;

  return (
    <button
      type="button"
      onClick={onManageWallet}
      title={primaryLoading || (primaryError && !isStale) ? undefined : fullValue}
      aria-label={
        primaryError && !isStale
          ? "Wallet, balance unavailable"
          : `Wallet, ${primaryLoading ? "loading" : fullValue}${wrongNetwork ? ", wrong network" : ""}`
      }
      data-test-id="wallet-hud-control"
      className={cn(
        "flex h-11 min-w-0 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        wrongNetwork
          ? "border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--warning)]"
          : "border-border bg-secondary/40 text-foreground"
      )}
    >
      <WalletAvatar address={address} size={20} />

      {primaryLoading ? (
        <Skeleton className="h-4 w-16" />
      ) : primaryError && !isStale ? (
        <span className="flex items-center gap-1.5 truncate text-sm font-medium">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" /> Unavailable
        </span>
      ) : (
        <span className="truncate font-mono text-sm font-semibold tabular-nums">{displayValue}</span>
      )}

      <span className="truncate font-mono text-xs text-muted-foreground">{shortAddress(address)}</span>
    </button>
  );
}
