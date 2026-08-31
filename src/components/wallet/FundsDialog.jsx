import { useState } from "react";
import { Check, Copy, ExternalLink, LogOut } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { WalletAvatar } from "@/components/wallet/WalletAvatar";
import { baseSepolia, polygonAmoy } from "@shared/chains";
import { BRAND_NAME } from "@/lib/brand";

// The one Tribet wallet popup — every wallet entry point in the app opens
// this (see WALLET UX AUDIT §1/§7: "AppKit owns connection only, Tribet
// owns the entire connected-wallet experience"). One screen, no tabs, no
// nested dialogs — non-custodial: this only ever shows the player's own
// on-chain balances and links out to faucets, never a deposit/withdraw flow.
export function FundsDialog({ open, onClose, onCloseAutoFocus }) {
  const {
    address, connectorName, casinoBalance, casinoSymbol, sportsBalance, sportsSymbol, sportsGas, sportsGasSymbol, disconnect,
  } = useWallet();

  const explorer = `${baseSepolia.blockExplorers.default.url}/address/${address}`;
  const [copied, setCopied] = useState(false);

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
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>Wallet</DialogTitle>
          <DialogDescription className="sr-only">
            Your connected wallet — {BRAND_NAME} never holds your funds.
          </DialogDescription>
        </DialogHeader>

        {/* CONNECTED IDENTITY */}
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
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {copied ? <Check className="size-4 text-[var(--success)]" /> : <Copy className="size-4" />}
            </button>
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              aria-label="View on explorer"
              className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>

        {/* BALANCES */}
        <div className="space-y-2">
          <div className="rounded-lg border bg-card px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Casino</div>
                <div className="text-xs text-muted-foreground">{baseSepolia.name}</div>
              </div>
              <div className="font-mono text-lg font-semibold tabular-nums">
                {casinoBalance.toFixed(5)} <span className="text-xs font-semibold text-muted-foreground">{casinoSymbol}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="text-sm font-medium">Sportsbook</div>
                <div className="text-xs text-muted-foreground">{polygonAmoy.name}</div>
              </div>
              <div className="font-mono text-lg font-semibold tabular-nums">
                {sportsBalance.toFixed(2)} <span className="text-xs font-semibold text-muted-foreground">{sportsSymbol}</span>
              </div>
            </div>
            {/* Gas is real information, not a peer balance — kept small and
                muted so the playable stake above stays the one number that
                reads as "money" (see WALLET UX REDESIGN §5 — "gas must be
                visually secondary"). */}
            <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">
              Gas: {sportsGas.toFixed(4)} {sportsGasSymbol}
            </div>
          </div>

          {/* Predictions has no wallet-backed balance yet — an honest
              "Coming soon" row, never a fabricated number (see WALLET UX
              REDESIGN §5 — "do not invent a fake Predictions balance"). */}
          <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2.5 text-muted-foreground">
            <div className="text-sm font-medium">Predictions</div>
            <div className="text-xs">Coming soon</div>
          </div>
        </div>

        {/* TESTNET SUPPORT — a developer/testnet convenience, not core
            wallet information, so it stays a single muted line rather than
            a promo box (see WALLET UX REDESIGN §5). */}
        <p className="text-xs text-muted-foreground">
          Need testnet funds?{" "}
          <a href="https://portal.cdp.coinbase.com/products/faucet" target="_blank" rel="noreferrer" className="font-medium text-[var(--global-cta-hover)] hover:underline">
            Casino faucet
          </a>
          {" · "}
          <a href="https://faucet.polygon.technology/" target="_blank" rel="noreferrer" className="font-medium text-[var(--global-cta-hover)] hover:underline">
            Sports faucet
          </a>
        </p>

        {/* FOOTER */}
        <button
          onClick={() => { disconnect(); onClose(); }}
          data-test-id="disconnect"
          className="flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium text-[var(--danger)] hover:bg-secondary"
        >
          <LogOut className="size-4" /> Disconnect Wallet
        </button>
      </DialogContent>
    </Dialog>
  );
}
