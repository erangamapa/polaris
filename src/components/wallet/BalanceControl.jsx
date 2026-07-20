import { useRef } from "react";
import { ChevronDown, Wallet as WalletIcon } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { baseSepolia, polygonAmoy } from "@shared/chains";

// Compact grouped balance control: "Balance = what I have" (see TopBar.jsx's
// mental-model comment). A lightweight, non-modal Popover — never the full
// Funds/Wallet dialog just to glance at balances (see BALANCE SELECTOR:
// "Do not open the full Wallet dialog just to change display currency").
// Lists the two REAL balances this app actually has (Casino ETH on Base
// Sepolia, Sports USDT on Polygon Amoy — see web3/useWallet.js) — no
// invented currencies, no fiat conversion (no rate source exists in this
// app to derive one honestly from).
//
// `open`/`onOpenChange` are controlled by TopBar (one shared `activePopover`
// state — see OVERLAY OWNERSHIP), not owned locally, so this and
// ProfileMenu can never both be open at once by construction.
export function BalanceControl({ open, onOpenChange, casinoBalance, casinoSymbol, casinoLoading, sportsBalance, sportsSymbol, wrongNetwork, onManageWallet }) {
  const triggerRef = useRef(null);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          aria-label={`Balance, ${casinoLoading ? "loading" : `${casinoBalance.toFixed(4)} ${casinoSymbol}`}${wrongNetwork ? ", wrong network" : ""}`}
          className={cn(
            "flex h-10 min-w-0 shrink-0 items-center gap-1.5 rounded-lg border px-3 font-mono text-sm font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            wrongNetwork ? "border-[var(--warning)]/40 text-[var(--warning)]" : "border-border text-foreground"
          )}
        >
          {casinoLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : (
            <span className="truncate">{casinoBalance.toFixed(4)} {casinoSymbol}</span>
          )}
          <ChevronDown className={cn("size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={8}
          onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus(); }}
          className="z-[var(--z-header-popover)] w-64 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Balances</div>
          <BalanceRow label="Casino" network={baseSepolia.name} dot="#0052ff" amount={casinoBalance} symbol={casinoSymbol} decimals={4} />
          <BalanceRow label="Sports" network={polygonAmoy.name} dot="#8247e5" amount={sportsBalance} symbol={sportsSymbol} decimals={2} />
          <div className="my-1 border-t" aria-hidden="true" />
          <button
            onClick={() => { onOpenChange(false); onManageWallet(); }}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <WalletIcon className="size-4" aria-hidden="true" /> Manage wallet
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function BalanceRow({ label, network, dot, amount, symbol, decimals }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden="true" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="truncate text-[11px] text-muted-foreground">{network}</div>
        </div>
      </div>
      <span className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">{amount.toFixed(decimals)} {symbol}</span>
    </div>
  );
}
