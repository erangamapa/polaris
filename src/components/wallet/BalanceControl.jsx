import { useRef } from "react";
import { ChevronDown, Wallet as WalletIcon, AlertTriangle, RefreshCw } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { baseSepolia, polygonAmoy } from "@shared/chains";
import { BALANCE_STATUS } from "@/lib/casinoBalance";

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
// Only ever rendered while a wallet is connected — TopBar.jsx renders a
// single standalone "Connect Wallet" CTA instead of this control entirely
// while disconnected, so there is no empty/placeholder balance segment to
// build or maintain here (see WALLET STATES: "do not show a fake balance").
//
// A fixed `min-w-[132px]` (not just `min-w-0` + content) is what actually
// satisfies "no width jump between zero, normal, and large balance" — content
// alone would make the trigger visibly grow/shrink as the digit count
// changes; the min-width absorbs that, and `truncate` is the safety net for
// values that still exceed it.
export function BalanceControl({ open, onOpenChange, casinoBalance, casinoSymbol, casinoLoading, casinoBalanceError, casinoStatus, onRefreshBalance, sportsBalance, sportsSymbol, wrongNetwork, onManageWallet }) {
  const triggerRef = useRef(null);

  const fullValue = `${casinoBalance.toFixed(8)} ${casinoSymbol}`;
  const displayValue = `${casinoBalance.toFixed(4)} ${casinoSymbol}`;
  // STALE/SYNCING are both "we have a real value, just flag it" states — the
  // trigger keeps showing the real number in both cases (never a spinner in
  // place of a value that already exists — see BALANCE SYNCING STATE:
  // "retain the last known value... avoid confusing flicker"); only the
  // popover's own body adds the explanatory row + Refresh action for STALE.
  const isSyncing = casinoStatus === BALANCE_STATUS.SYNCING;
  const isStale = casinoStatus === BALANCE_STATUS.STALE;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={triggerRef}
          title={casinoLoading || (casinoBalanceError && !isStale) ? undefined : fullValue}
          aria-label={
            casinoBalanceError && !isStale
              ? "Balance, unavailable"
              : `Balance, ${casinoLoading ? "loading" : fullValue}${isStale ? ", may be out of date" : isSyncing ? ", updating" : ""}${wrongNetwork ? ", wrong network" : ""}`
          }
          className={cn(
            "flex h-11 min-w-[132px] shrink-0 items-center gap-1.5 rounded-s-lg border border-e-0 px-3 font-mono text-sm font-semibold tabular-nums transition-colors hover:bg-secondary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            wrongNetwork
              ? "border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--warning)]"
              : casinoBalanceError && !isStale
                ? "border-border bg-secondary/40 text-muted-foreground"
                : "border-border bg-secondary/40 text-foreground"
          )}
        >
          {/* STALE keeps showing the real last-known value (never replaced
              with "Unavailable") — only bare ERROR (no value ever obtained)
              falls back to the unavailable label (see BALANCE ERROR STATE:
              "do not replace the value with zero" — the same principle
              extends to not replacing a real stale value with nothing). */}
          {casinoLoading ? (
            <Skeleton className="h-4 w-16" />
          ) : casinoBalanceError && !isStale ? (
            <span className="flex items-center gap-1.5 truncate">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" /> Unavailable
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate">{displayValue}</span>
              {isSyncing && <RefreshCw className="size-3 shrink-0 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />}
              {isStale && <AlertTriangle className="size-3 shrink-0 text-[var(--warning)]" aria-hidden="true" />}
            </span>
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
          <div className="text-label px-2 py-1.5">Balances</div>
          <BalanceRow label="Casino" network={baseSepolia.name} dot="#0052ff" amount={casinoBalance} symbol={casinoSymbol} decimals={4} error={casinoBalanceError && !isStale} />
          <BalanceRow label="Sports" network={polygonAmoy.name} dot="#8247e5" amount={sportsBalance} symbol={sportsSymbol} decimals={2} />
          {isStale && (
            <div role="status" className="mx-2 mb-1.5 flex items-center justify-between gap-2 rounded-md bg-[var(--warning)]/10 px-2 py-1.5 text-xs text-[var(--warning)]">
              <span>Balance may be out of date</span>
              <button
                type="button"
                onClick={onRefreshBalance}
                data-test-id="balance-refresh"
                className="shrink-0 font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Refresh
              </button>
            </div>
          )}
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
