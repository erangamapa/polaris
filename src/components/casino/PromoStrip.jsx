import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROMOS } from "@/lib/mockData";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { toast } from "@/lib/toast";
import { CASINO_CHAIN_ID } from "@shared/chains";

// All three top cards share this fixed height at every breakpoint — identical
// width comes from the grid (grid-cols-3 = repeat(3, minmax(0, 1fr))), identical
// height comes from here. Neither is allowed to grow from content or artwork.
// Exported so Sports/Predictions can build their own tiles at the exact same
// dimensions (see ArenaPromoTile) without duplicating the constant.
export const CARD_H = "h-40"; // 160px — inside the 150-170px desktop target

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

// A clearly legible wallet mark — inspired by the reference art (dark bifold +
// a coin catching a teal glow), built as an inline SVG (no generated text, no
// background, no branded logos), sized to actually fill its column rather
// than fade away. Only a soft radial glow behind it, full-opacity clean edges.
function WalletMark() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(65% 65% at 50% 45%, rgba(25,199,165,0.22), transparent 72%)" }}
      />
      <svg viewBox="0 0 100 100" className="relative h-[82%] w-[82%] max-h-28 max-w-28">
        <rect x="12" y="32" width="76" height="52" rx="10" fill="#101C22" stroke="rgba(25,199,165,0.45)" strokeWidth="2" />
        <path d="M12 47 h76" stroke="rgba(25,199,165,0.3)" strokeWidth="1.2" />
        <circle cx="76" cy="60" r="6" fill="#19C7A5" />
        <rect x="26" y="12" width="36" height="24" rx="5" fill="#16262E" stroke="rgba(25,199,165,0.4)" strokeWidth="1.5" transform="rotate(-8 44 24)" />
        <circle cx="54" cy="20" r="13" fill="#FFD36B" />
        <circle cx="54" cy="20" r="7.5" fill="none" stroke="#16262E" strokeOpacity="0.55" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

// Two-column shell every wallet-tile state shares: text column (~60-64%, its
// own justify-between so heading/body/CTA space out instead of clustering at
// the top) + a fixed-width illustration column (~36-40%) that can never be
// overlapped by text since they're separate flex children, not a text-over-
// image overlay. Same CARD_H/width as a promo tile — a bare <button> is
// inline-block and won't stretch on its own, which is why the outer div (not
// the button) owns `w-full`. Illustration hidden below `sm:`: at the ~110px
// mobile card width fixed by the existing 3-col grid there isn't room for a
// legible illustration alongside readable text and a tappable CTA.
function WalletCard({ children, tone = "neutral" }) {
  return (
    <div
      className={cn(
        CARD_H,
        "relative flex w-full min-w-0 items-stretch gap-3 overflow-hidden rounded-xl border p-4 text-left transition",
        tone === "warning" ? "border-amber-500/25 bg-zinc-900" : "border-white/10 bg-zinc-900"
      )}
    >
      <div className="flex h-full min-w-0 flex-1 flex-col justify-between">{children}</div>
      <div className="hidden w-[36%] shrink-0 sm:block lg:w-[40%]">
        <WalletMark />
      </div>
    </div>
  );
}

// Shared shape/size for every promo-style CTA in the app (Casino's "Claim
// bonus"/"View race", the wallet tile, and Sports/Predictions' arena promos)
// — same rounded-lg, px-3 py-1.5, text-xs font-bold everywhere. Callers add
// their own color classes (this has none baked in).
export const PROMO_CTA_BASE = "w-fit shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900";

// The wallet tile's own CTA: PROMO_CTA_BASE recoloured teal (--global-cta) so
// it still reads as product utility rather than a promotion, never visually
// heavier than "Claim bonus" / "View race" beside it.
const PROMO_BTN = "w-fit shrink-0 flex items-center gap-1.5 rounded-lg bg-[var(--global-cta)] px-3 py-1.5 text-xs font-bold text-[var(--global-cta-text)] transition hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--global-cta)] focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900";
const LABEL = "text-[10px] font-semibold uppercase tracking-wider text-zinc-500";

// Exported: this is the one shared "Tribet infrastructure" tile reused as the
// first card on Casino, Sports and Predictions (see ArenaTileRow). It has no
// arena-specific content by design — same wallet, same CTA, everywhere.
export function PlayerTile() {
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
        <div className="min-w-0" role="status" aria-live="polite">
          <div className={LABEL}>Wallet</div>
          <h3 className="mt-1 text-base font-bold leading-snug text-[#F2F3F5]">Connecting…</h3>
          <p className="mt-1 text-xs leading-snug text-zinc-400">Approve the request in your wallet.</p>
        </div>
        <button type="button" disabled className={PROMO_BTN} aria-label="Connecting to wallet">
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
        <div className="min-w-0">
          <div className={LABEL}>Wallet</div>
          <h3 className="mt-0.5 text-base font-bold leading-tight text-[#F2F3F5] sm:mt-1.5 sm:leading-snug">One wallet. Every game.</h3>
          <p className="mt-1.5 hidden text-xs leading-snug text-zinc-400 xl:block">Play, earn and withdraw with one connection.</p>
        </div>
        <button type="button" onClick={connect} data-test-id="wallet-tile-connect" className={PROMO_BTN}>
          Connect wallet
        </button>
      </WalletCard>
    );
  }

  // 3. Connected on the wrong chain — same switchTo() the auth gate uses.
  if (!onCasinoChain) {
    return (
      <WalletCard tone="warning">
        <div className="min-w-0" role="status" aria-live="polite">
          <div className={cn(LABEL, "text-amber-400/80")}>Wallet</div>
          <h3 className="mt-0.5 text-base font-bold leading-tight text-[#F2F3F5] sm:mt-1 sm:leading-snug">Wrong network</h3>
          <p className="mt-1 hidden text-xs leading-snug text-zinc-400 sm:block">Switch to Base Sepolia to continue.</p>
        </div>
        <button
          type="button"
          onClick={() => switchTo(CASINO_CHAIN_ID)}
          disabled={isSwitching}
          data-test-id="wallet-tile-switch-network"
          className={PROMO_BTN}
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
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Wallet connected
        </span>
        <div className="mt-1 truncate font-mono text-xs text-zinc-400">{shortAddress(address)}</div>
        <div className="mt-1.5">
          {casinoBalanceLoading ? (
            <div className="h-6 w-24 animate-pulse rounded bg-white/10" role="status" aria-live="polite" aria-label="Loading balance" />
          ) : casinoBalanceError ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Balance unavailable</span>
              <button type="button" onClick={() => refetchCasinoBalance?.()} className="text-xs font-semibold text-[var(--global-cta)] hover:underline">
                Retry
              </button>
            </div>
          ) : (
            <div className="truncate text-lg font-black text-white">
              {casinoBalance.toFixed(5)} <span className="text-xs font-semibold text-zinc-400">{casinoSymbol}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={openAccount} data-test-id="wallet-tile-view" className={PROMO_BTN}>
          View wallet
        </button>
        <button
          type="button"
          onClick={copyAddress}
          aria-label="Copy wallet address"
          data-test-id="wallet-tile-copy"
          className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/10 text-zinc-400 transition hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--global-cta)]"
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
// navigate — Casino/Sports/Predictions each search their own page's own
// content, and `defaultScope` just seeds which one this instance opens on
// (Sports opens on "sports", Predictions on "predictions", etc). Exported:
// this is the one search implementation shared by all three arenas — the
// arena-tinted focus ring comes from --product-primary, which the page root's
// [data-product] attribute already resolves per arena.
//
// `results` is optional — pass it (Casino does; Sports/Predictions don't yet,
// per "casino first") to get real combobox behaviour: a keyboard-navigable
// results dropdown, Enter-to-open, and a zero-results state with a "Browse
// games" way out instead of a silent empty pane. Without `results` this is
// just the scoped input, filtering whatever's below it inline (unchanged
// behaviour for Sports/Predictions).
export function ScopedSearch({ query, onQuery, defaultScope = "casino", results, onSelectResult, onBrowseAll, onZeroResults }) {
  const [scope, setScope] = useState(defaultScope);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef(null);
  const zeroReportedFor = useRef(null);
  const active = SEARCH_SCOPES.find((s) => s.id === scope);

  const hasResults = results !== undefined;
  const trimmed = query.trim();
  const showDropdown = hasResults && open && trimmed.length > 0;
  const shown = results?.slice(0, 8) ?? [];

  useEffect(() => { setActiveIndex(-1); }, [query, scope]);

  useEffect(() => {
    if (showDropdown && shown.length === 0 && zeroReportedFor.current !== trimmed) {
      zeroReportedFor.current = trimmed;
      onZeroResults?.(trimmed);
    }
  }, [showDropdown, shown.length, trimmed]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectResult = (game) => {
    onSelectResult?.(game);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!showDropdown || shown.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); selectResult(shown[activeIndex]); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  // Close only when focus truly leaves the whole combobox (input, listbox,
  // scope select) — not on every internal focus move.
  const onBlur = (e) => {
    if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
  };

  return (
    <div className="space-y-1.5">
      <label htmlFor="arena-search-input" className="block px-0.5 text-xs font-medium text-zinc-400">
        Search
      </label>
      <div ref={rootRef} onBlur={onBlur} className="relative">
        <div className="flex h-11 items-center rounded-lg border border-white/10 bg-zinc-900 focus-within:ring-2 focus-within:ring-[var(--product-primary)]">
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
              id="arena-search-input"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder={active.placeholder}
              data-test-id="arena-search"
              role={hasResults ? "combobox" : undefined}
              aria-expanded={hasResults ? showDropdown : undefined}
              aria-controls={hasResults ? "arena-search-listbox" : undefined}
              aria-activedescendant={activeIndex >= 0 ? `arena-search-opt-${activeIndex}` : undefined}
              aria-autocomplete={hasResults ? "list" : undefined}
              autoComplete="off"
              className="h-full w-full min-w-0 rounded-r-lg border-0 bg-transparent pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none"
            />
          </div>
        </div>

        {showDropdown && (
          <ul
            id="arena-search-listbox"
            role="listbox"
            aria-label="Search results"
            data-test-id="arena-search-listbox"
            className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 py-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
          >
            {shown.length === 0 ? (
              <li className="px-4 py-6 text-center" data-test-id="arena-search-zero">
                <p className="text-sm text-zinc-400">No games match “{trimmed}”.</p>
                <button
                  type="button"
                  onClick={() => { onBrowseAll?.(); setOpen(false); }}
                  className="mt-2 text-sm font-semibold text-[var(--product-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Browse games
                </button>
              </li>
            ) : (
              shown.map((game, i) => (
                <li
                  key={game.favId}
                  id={`arena-search-opt-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectResult(game)}
                  data-test-id={`arena-search-opt-${game.key}`}
                  className={cn(
                    "mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm",
                    i === activeIndex ? "bg-white/10 text-white" : "text-zinc-300"
                  )}
                >
                  <img src={game.image} alt="" className="size-7 shrink-0 rounded object-cover" />
                  <span className="truncate">{game.title}</span>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

// Top-of-lobby strip: two promo tiles + a player glimpse as three equal-width,
// equal-height cards (well under the old ~300-340px hero), with the scoped
// search directly beneath sharing the same wrapper/width so both edges align.
export function PromoStrip({ query, onQuery, searchResults, onSelectResult, onBrowseAll, onZeroResults }) {
  const [p1, p2] = PROMOS;
  return (
    <div className="casino-content-column w-full space-y-3">
      <div className="top-card-grid grid grid-cols-3 gap-3">
        <PlayerTile />
        <PromoTile promo={p1} />
        <PromoTile promo={p2} />
      </div>
      <ScopedSearch
        query={query}
        onQuery={onQuery}
        results={searchResults}
        onSelectResult={onSelectResult}
        onBrowseAll={onBrowseAll}
        onZeroResults={onZeroResults}
      />
    </div>
  );
}
