import { useState } from "react";
import { Search, Wallet, ChevronDown, Check, AlertTriangle, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROMOS } from "@/lib/mockData";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { toast } from "@/lib/toast";
import { CASINO_CHAIN_ID } from "@shared/chains";

// All three top cards share this fixed height at every breakpoint — identical
// width comes from the grid (grid-cols-3 = repeat(3, minmax(0, 1fr))), identical
// height comes from here. Neither is allowed to grow from content or artwork.
const CARD_H = "h-40"; // 160px — inside the 150-170px desktop target

// Compact promo tile — same art/overlay treatment as the old full hero, just
// clamped to CARD_H instead of a min-h-[300px+] banner.
function PromoTile({ promo }) {
  return (
    <div className={cn(CARD_H, "relative w-full min-w-0 overflow-hidden rounded-xl border border-[var(--casino-primary-border)] bg-[#0C080C]")}>
      <div
        className={cn("hero-bg absolute inset-0", promo.image ? "hero-bg--img" : "hero-bg--fallback")}
        style={promo.image ? { backgroundImage: `url(${promo.image})` } : undefined}
      />
      <div className="hero-overlay pointer-events-none absolute inset-0" />
      <div className="relative flex h-full min-w-0 flex-col justify-between p-4">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-[var(--casino-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--casino-text-accent)]">
            {promo.eyebrow}
          </span>
          <h3 className="mt-1.5 truncate text-base font-bold leading-tight text-[#F2F3F5]">{promo.title}</h3>
        </div>
        <button className="w-fit rounded-lg bg-[var(--casino-primary)] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[var(--casino-primary-hover)] active:bg-[var(--casino-primary-active)]">
          {promo.cta}
        </button>
      </div>
    </div>
  );
}

// Restrained decorative wallet mark — inspired by the reference art (dark
// bifold + a coin catching a teal glow), built as a small inline SVG rather
// than the generated image itself (no generated text, no background, no
// branded logos). Its own left edge is masked to transparent so it blends
// into the card instead of showing a hard image edge. Hidden below `sm:` —
// at the ~110px mobile card width (fixed by the existing 3-col grid) there
// isn't room for both a readable illustration and the text/CTA, and the
// mobile spec here prioritises text/CTA legibility over the artwork.
function WalletMark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 right-0 hidden w-24 select-none sm:block md:w-28"
      style={{ maskImage: "linear-gradient(to right, transparent, black 42%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 42%)" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(60% 55% at 62% 42%, rgba(25,199,165,0.26), transparent 72%)" }}
      />
      <svg viewBox="0 0 100 100" className="absolute bottom-2 right-2 h-20 w-20 md:h-24 md:w-24">
        <rect x="18" y="34" width="64" height="46" rx="9" fill="#0F1A20" stroke="rgba(25,199,165,0.32)" strokeWidth="1.5" />
        <path d="M18 46 h64" stroke="rgba(25,199,165,0.2)" strokeWidth="1" />
        <circle cx="70" cy="57" r="5" fill="#19C7A5" fillOpacity="0.9" />
        <rect x="30" y="16" width="30" height="20" rx="4" fill="#132229" stroke="rgba(25,199,165,0.26)" strokeWidth="1.5" transform="rotate(-8 45 26)" />
        <circle cx="56" cy="22" r="11" fill="#FFD36B" fillOpacity="0.9" />
        <circle cx="56" cy="22" r="6.5" fill="none" stroke="#0F1A20" strokeOpacity="0.5" strokeWidth="1" />
      </svg>
    </div>
  );
}

const BENEFITS = ["Instant deposits", "Provably fair", "Automatic rewards"];

// One combined wallet/player tile with five distinct states. Structurally
// identical to a promo tile (same CARD_H, same w-full so it matches the grid
// column exactly — a <button> is inline-block by default and won't stretch
// on its own). Every state uses the same top/middle/bottom flex skeleton so
// the card never changes height when the state changes (no layout shift).
function WalletCard({ children, tone = "neutral" }) {
  return (
    <div
      className={cn(
        CARD_H,
        "relative flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border p-4 text-left transition",
        tone === "warning" ? "border-amber-500/25 bg-zinc-900" : "border-white/10 bg-zinc-900"
      )}
    >
      <WalletMark />
      <div className="relative z-10 flex h-full min-w-0 flex-col justify-between sm:pr-9 md:pr-11">{children}</div>
    </div>
  );
}

// Deliberately the app's global teal CTA token (the same one the header's real
// Connect Wallet button uses), not --casino-primary — this tile is product
// utility, not a promotion, and needs to read as visually distinct from the
// pink promo-card CTAs beside it.
const PRIMARY_BTN = "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-[var(--global-cta)] px-3 text-xs font-bold text-[var(--global-cta-text)] transition hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--global-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900";

function PlayerTile() {
  const {
    address, isConnected, status, onCasinoChain, isSwitching,
    casinoBalance, casinoSymbol, casinoBalanceLoading, casinoBalanceError, refetchCasinoBalance,
    connect, openAccount, switchTo,
  } = useWallet();

  const connecting = !isConnected && (status === "connecting" || status === "reconnecting");

  // 1. Connecting — reuses the same connect() call already in flight; the
  // button is disabled so a second click can't fire another connect attempt.
  if (connecting) {
    return (
      <WalletCard>
        <Wallet className="size-5 text-zinc-500" aria-hidden="true" />
        <div className="min-w-0" role="status" aria-live="polite">
          <div className="text-sm font-bold text-white">Connecting…</div>
          <div className="truncate text-xs text-zinc-500">Approve the request in your wallet.</div>
        </div>
        <button type="button" disabled className={cn(PRIMARY_BTN, "w-full")} aria-label="Connecting to wallet">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Connecting…
        </button>
      </WalletCard>
    );
  }

  // 2. Disconnected — the product utility pitch. Same connect() the header's
  // WalletButton uses; no second wallet-connect implementation.
  if (!isConnected) {
    return (
      <WalletCard>
        <Wallet className="size-5 text-zinc-400" aria-hidden="true" />
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold leading-tight text-[#F2F3F5]">One wallet. Every game.</h3>
          <p className="mt-0.5 truncate text-[11px] leading-snug text-zinc-400">Connect once to play, track rewards and withdraw.</p>
          <div className="mt-1.5 hidden items-center gap-x-2 overflow-hidden text-[10px] text-zinc-500 sm:flex">
            {BENEFITS.map((b) => (
              <span key={b} className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap">
                <Check className="size-2.5 text-[var(--global-cta)]" aria-hidden="true" />
                {b}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={connect}
          data-test-id="wallet-tile-connect"
          className={cn(PRIMARY_BTN, "w-full")}
        >
          Connect wallet
        </button>
      </WalletCard>
    );
  }

  // 3. Connected on the wrong chain — same switchTo() the auth gate uses.
  if (!onCasinoChain) {
    return (
      <WalletCard tone="warning">
        <AlertTriangle className="size-5 text-amber-400" aria-hidden="true" />
        <div className="min-w-0" role="status" aria-live="polite">
          <div className="text-sm font-bold text-white">Wrong network</div>
          <div className="truncate text-xs text-zinc-400">Switch to Base Sepolia to continue.</div>
        </div>
        <button
          type="button"
          onClick={() => switchTo(CASINO_CHAIN_ID)}
          disabled={isSwitching}
          data-test-id="wallet-tile-switch-network"
          className={cn(PRIMARY_BTN, "w-full")}
        >
          {isSwitching && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {isSwitching ? "Switching…" : "Switch network"}
        </button>
      </WalletCard>
    );
  }

  // 4/5. Connected + right network — balance loading, load error, or ready.
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Couldn't copy address");
    }
  };

  return (
    <WalletCard>
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Wallet connected
        </span>
        <span className="shrink-0 truncate font-mono text-[10px] text-zinc-500">{shortAddress(address)}</span>
      </div>

      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">Balance</div>
        {casinoBalanceLoading ? (
          <div className="mt-1.5 h-5 w-24 animate-pulse rounded bg-white/10" role="status" aria-live="polite" aria-label="Loading balance" />
        ) : casinoBalanceError ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Balance unavailable</span>
            <button type="button" onClick={() => refetchCasinoBalance?.()} className="text-xs font-semibold text-[var(--global-cta)] hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <div className="truncate text-xl font-black text-white">
            {casinoBalance.toFixed(5)} <span className="text-sm font-semibold text-zinc-400">{casinoSymbol}</span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={openAccount} data-test-id="wallet-tile-view" className={cn(PRIMARY_BTN, "flex-1")}>
          View wallet
        </button>
        <button
          type="button"
          onClick={copyAddress}
          aria-label="Copy wallet address"
          data-test-id="wallet-tile-copy"
          className="grid size-11 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casino-primary)]"
        >
          <Copy className="size-4" aria-hidden="true" />
        </button>
      </div>
    </WalletCard>
  );
}

const SEARCH_SCOPES = [
  { id: "casino", label: "Casino", placeholder: "Search casino games" },
  { id: "predictions", label: "Predictions", placeholder: "Search prediction markets" },
  { id: "sports", label: "Sports", placeholder: "Search sports, leagues or teams" },
];

// One combined control — a borderless scope <select> and a borderless input
// sharing a single outer border/height/radius/focus ring, not two separate
// controls. Switching scope only swaps the placeholder copy: it doesn't
// navigate (Predictions/Sports each keep their own search on their own page)
// and never clears whatever the user already typed.
function ScopedSearch({ query, onQuery }) {
  const [scope, setScope] = useState("casino");
  const active = SEARCH_SCOPES.find((s) => s.id === scope);

  return (
    <div className="flex h-11 items-center rounded-lg border border-white/10 bg-zinc-900 focus-within:ring-2 focus-within:ring-[var(--casino-primary)]">
      <div className="relative flex h-full shrink-0 items-center">
        <select
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          aria-label="Search scope"
          data-test-id="search-scope"
          className="h-full appearance-none rounded-l-lg border-0 bg-transparent py-0 pl-3 pr-7 text-sm font-medium text-white focus-visible:outline-none"
        >
          {SEARCH_SCOPES.map((s) => (
            <option key={s.id} value={s.id} className="bg-zinc-900 text-white">{s.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 size-3.5 text-zinc-500" />
      </div>
      <span className="h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={active.placeholder}
          aria-label={active.placeholder}
          data-test-id="casino-search"
          className="h-full w-full min-w-0 rounded-r-lg border-0 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none"
        />
      </div>
    </div>
  );
}

// Top-of-lobby strip: two promo tiles + a player glimpse as three equal-width,
// equal-height cards (well under the old ~300-340px hero), with the scoped
// search directly beneath sharing the same wrapper/width so both edges align.
export function PromoStrip({ query, onQuery }) {
  const [p1, p2] = PROMOS;
  return (
    <div className="casino-content-column w-full space-y-3">
      <div className="top-card-grid grid grid-cols-3 gap-3">
        <PlayerTile />
        <PromoTile promo={p1} />
        <PromoTile promo={p2} />
      </div>
      <ScopedSearch query={query} onQuery={onQuery} />
    </div>
  );
}
