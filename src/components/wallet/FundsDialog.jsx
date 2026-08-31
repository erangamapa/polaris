import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, LogOut } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { WalletAvatar } from "@/components/wallet/WalletAvatar";
import { baseSepolia } from "@shared/chains";

// The one Tribet wallet popup — every wallet entry point in the app opens
// this (see WALLET UX AUDIT §1/§7: "AppKit owns connection only, Tribet
// owns the entire connected-wallet experience"). One screen, no tabs, no
// nested pages. Designed for the MVP (Casino only, one playable balance) —
// not for the repo's future Sports/Predictions support, which stays out of
// this popup entirely until it's real product surface (see WALLET MVP
// REDESIGN: "the UI must never expose roadmap complexity").
export function FundsDialog({ open, onClose, onCloseAutoFocus }) {
  const {
    isConnected, address, connectorName, casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError, disconnect,
  } = useWallet();

  // This is the CONNECTED-wallet popup — it has nothing honest to show once
  // disconnected (no fake address/avatar/balance). Reachable disconnected
  // either via a stale `?modal=funds` deep link or a real external
  // disconnect while the dialog is open; both self-close rather than keep
  // showing a stale "Connected" state (see WALLET MVP REDESIGN QA: "wallet
  // reconnect", "wallet disconnected externally").
  useEffect(() => {
    if (open && !isConnected) onClose();
  }, [open, isConnected, onClose]);

  const explorer = `${baseSepolia.blockExplorers.default.url}/address/${address}`;
  const [copied, setCopied] = useState(false);
  const isZero = !casinoBalanceLoading && !casinoBalanceError && casinoBalance === 0;

  if (!isConnected) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked — icon simply doesn't confirm */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Wallet</DialogTitle>
          <DialogDescription className="sr-only">Your connected wallet.</DialogDescription>
        </DialogHeader>

        {/* CONNECTED */}
        <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
          <WalletAvatar address={address} size={32} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-semibold">{shortAddress(address)}</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success)]">
                <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" /> Connected
              </span>
            </div>
            {connectorName && <div className="truncate text-xs text-muted-foreground">{connectorName}</div>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={copy}
              aria-label="Copy address"
              data-test-id="wallet-copy"
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {copied ? <Check className="size-4 text-[var(--success)]" /> : <Copy className="size-4" />}
            </button>
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              aria-label="View on explorer"
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>

        {/* BALANCE — the one number this popup exists to show. Everything
            else in the dialog is deliberately smaller/quieter than this
            (see WALLET MVP REDESIGN — "technical metadata should never
            compete with the playable balance"). */}
        <div className="flex flex-col items-center gap-1 py-6 text-center">
          {casinoBalanceLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : casinoBalanceError ? (
            <div className="text-sm font-medium text-muted-foreground">Balance unavailable</div>
          ) : (
            <div className="font-mono text-4xl font-bold tabular-nums">
              {casinoBalance.toFixed(3)} <span className="text-2xl font-semibold text-muted-foreground">{casinoSymbol}</span>
            </div>
          )}
          <div className="text-xs text-muted-foreground">{baseSepolia.name} Testnet</div>

          {isZero && (
            <a
              href="https://portal.cdp.coinbase.com/products/faucet"
              target="_blank"
              rel="noreferrer"
              className="mt-3 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              No balance available. Get testnet ETH →
            </a>
          )}
        </div>

        {/* FOOTER */}
        <button
          onClick={() => { disconnect(); onClose(); }}
          data-test-id="disconnect"
          className="flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium text-[var(--danger)] transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LogOut className="size-4" /> Disconnect Wallet
        </button>
      </DialogContent>
    </Dialog>
  );
}
