import { useState } from "react";
import { Search, Wallet, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROMOS } from "@/lib/mockData";
import { useWallet, shortAddress } from "@/web3/useWallet";

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

// Player info glimpse. Structurally identical to a promo tile (same width via
// the grid, same CARD_H, same p-4 padding, same alignment) — a <button> is
// inline-block by default and won't stretch on its own, so `w-full` here is
// what actually keeps it exactly as wide as the promo tiles.
function PlayerTile() {
  const { address, isConnected, casinoBalance, casinoSymbol, connect, openAccount } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        data-test-id="promo-connect-wallet"
        className={cn(CARD_H, "flex w-full min-w-0 flex-col justify-between rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casino-primary)]")}
      >
        <Wallet className="size-5 text-zinc-400" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">Connect Wallet</div>
          <div className="truncate text-xs text-zinc-500">Track balance &amp; activity</div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={openAccount}
      data-test-id="promo-account"
      className={cn(CARD_H, "flex w-full min-w-0 flex-col justify-between rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casino-primary)]")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate rounded-full bg-[var(--casino-primary-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--casino-text-accent)]">
          10% cashback
        </span>
        <span className="shrink-0 truncate font-mono text-xs text-zinc-500">{shortAddress(address)}</span>
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">Balance</div>
        <div className="truncate text-xl font-black text-white">
          {casinoBalance.toFixed(5)} <span className="text-sm font-semibold text-zinc-400">{casinoSymbol}</span>
        </div>
      </div>
    </button>
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
