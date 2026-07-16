import { Search, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROMOS } from "@/lib/mockData";
import { useWallet, shortAddress } from "@/web3/useWallet";

// Compact promo tile — same art/overlay treatment as the old full hero, just
// clamped to a fixed height (h-40/h-44) instead of a min-h-[300px+] banner.
function PromoTile({ promo }) {
  return (
    <div className="relative h-40 shrink-0 overflow-hidden rounded-xl border border-[var(--casino-primary-border)] bg-[#0C080C] sm:h-44">
      <div
        className={cn("hero-bg absolute inset-0", promo.image ? "hero-bg--img" : "hero-bg--fallback")}
        style={promo.image ? { backgroundImage: `url(${promo.image})` } : undefined}
      />
      <div className="hero-overlay pointer-events-none absolute inset-0" />
      <div className="relative flex h-full flex-col justify-between p-4">
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

// "Player's info glimpse" — a compact summary card, not a wallet dashboard:
// balance + truncated address when connected, a Connect prompt otherwise.
function PlayerGlimpse() {
  const { address, isConnected, casinoBalance, casinoSymbol, connect, openAccount } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        data-test-id="promo-connect-wallet"
        className="flex h-40 shrink-0 flex-col justify-between rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casino-primary)] sm:h-44"
      >
        <Wallet className="size-5 text-zinc-400" />
        <div>
          <div className="text-sm font-bold text-white">Connect Wallet</div>
          <div className="text-xs text-zinc-500">Track balance &amp; activity</div>
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={openAccount}
      data-test-id="promo-account"
      className="flex h-40 shrink-0 flex-col justify-between rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casino-primary)] sm:h-44"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-zinc-400">Your account</span>
        <span className="truncate font-mono text-xs text-zinc-500">{shortAddress(address)}</span>
      </div>
      <div>
        <div className="text-[11px] uppercase tracking-wide text-zinc-500">Balance</div>
        <div className="truncate text-xl font-black text-white">
          {casinoBalance.toFixed(5)} <span className="text-sm font-semibold text-zinc-400">{casinoSymbol}</span>
        </div>
      </div>
    </button>
  );
}

// Top-of-lobby strip: two promo tiles + a player glimpse in one compact row
// (max ~176px tall, well under the old ~300-340px hero), with the games search
// directly beneath so the first game row is visible without scrolling. Swipes
// horizontally on mobile instead of stacking three tall cards.
export function PromoStrip({ query, onQuery }) {
  const [p1, p2] = PROMOS;
  return (
    <div className="space-y-3">
      <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        <div className="w-[82%] shrink-0 snap-start sm:w-auto"><PromoTile promo={p1} /></div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto"><PromoTile promo={p2} /></div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto"><PlayerGlimpse /></div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search games"
          aria-label="Search games"
          data-test-id="casino-search"
          className="h-10 w-full rounded-lg border border-white/10 bg-zinc-900 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--casino-primary)]"
        />
      </div>
    </div>
  );
}
