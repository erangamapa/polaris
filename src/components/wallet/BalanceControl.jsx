import { useRef } from "react";
import { ChevronDown, Wallet as WalletIcon, AlertTriangle } from "lucide-react";
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
//
// This is the LEFT half of the centered Balance+Wallet HUD (see TopBar.jsx):
// `rounded-s-lg border-e-0` so its right edge sits flush against the Wallet
// action button glued on beside it, sharing one continuous silhouette
// (see CENTER HUD STRUCTURE — "controls appear as one coherent unit"). Only
// ever rendered inside that HUD today, so this grouped shape is hardcoded
// rather than made prop-configurable for a second caller that doesn't exist.
//
// A fixed `min-w-[132px]` (not just `min-w-0` + content) is what actually
// satisfies "no width jump between zero, normal, and large balance" — content
// alone would make the trigger visibly grow/shrink as the digit count
// changes; the min-width absorbs that, and `truncate` is the safety net for
// values that still exceed it.
export function BalanceControl({ open, onOpenChange, isConnected, casinoBalance, casinoSymbol, casinoLoading, casinoBalanceError, sportsBalance, sportsSymbol, wrongNetwork, onManageWallet }) {
  const triggerRef = useRef(null);

  // Disconnected: no real balance to show, and nothing meaningful for the
  // popover to list either — a plain non-interactive placeholder rather
  // than a button that would open an empty/misleading dropdown (see WALLET
  // STATES: "do not show a fake balance").
  if (!isConnected) {
    return (
      <div
        className="flex h-11 min-w-[132px] shrink-0 items-center gap-1.5 rounded-s-lg border border-e-0 border-border bg-secondary/40 px-3 text-sm font-medium text-muted-foreground"
        aria-hidden="true"
      >
        <span className="truncate">Not connected</span>
      </div>
    );
  }

  const fullValue = `${casinoBalance.toFixed(8)} ${casinoSymbol}`;
  const displayValue = `${casinoBalance.toFixed(4)} ${casinoSymbol}`;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          title={casinoLoading || casinoBalanceError ? undefined : fullValue}
          aria-label={
            casinoBalanceError
              ? "Balance, unavailable"
              : `Balance, ${casinoLoading ? "loading" : fullValue}${wrongNetwork ? ", wrong network" : ""}`
          }
          className={cn(
            "flex h-11 min-w-[132px] shrink-0 items-center gap-1.5 rounded-s-lg border border-e-0 px-3 font-mono text-sm font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            wrongNetwork
              ? "border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--warning)]"
              : casinoBalanceError
                ? "border-border bg-secondary/40 text-muted-foreground"
                : "border-border bg-secondary/40 text-foreground"
          )}
        >
          {casinoLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : casinoBalanceError ? (
            <span className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" /> Unavailable
            </span>
          ) : (
            <span className="truncate">{displayValue}</span>
          )}
          <ChevronDown className={cn("ms-auto size-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={8}
          onCloseAutoFocus={(e) => { e.preventDefault(); triggerRef.current?.focus(); }}
          className="z-[var(--z-header-popover)] w-64 rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Balances</div>
          <BalanceRow label="Casino" network={baseSepolia.name} dot="#0052ff" amount={casinoBalance} symbol={casinoSymbol} decimals={4} error={casinoBalanceError} />
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

function BalanceRow({ label, network, dot, amount, symbol, decimals, error }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md px-2 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden="true" />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{label}</div>
          <div className="truncate text-[11px] text-muted-foreground">{network}</div>
        </div>
      </div>
      {error ? (
        <span className="shrink-0 whitespace-nowrap text-sm text-muted-foreground">Unavailable</span>
      ) : (
        <span className="shrink-0 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">{amount.toFixed(decimals)} {symbol}</span>
      )}
    </div>
  );
}
