import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Copy, Loader2, X } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";
import { PROMOS } from "@/lib/mockData";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { toast } from "@/lib/toast";
import { track } from "@/lib/telemetry";
import { CASINO_CHAIN_ID } from "@shared/chains";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { PromoCard, CARD_H } from "@/components/shell/PromoCard";
import { GlowBackdrop } from "@/components/shell/artwork/GlowBackdrop";
import { MicroLabel } from "@/components/ui/micro-label";
import { useDevMockState } from "@/lib/devMock";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { isArenaAllowed } from "@/lib/platformScope";
import { ARENAS } from "@/lib/arenas";

export { CARD_H };

// A clearly legible wallet mark — inspired by the reference art (dark bifold +
// a coin catching a glow tinted with the current Platform Action color),
// built as an inline SVG (no generated text, no background, no branded
// logos), sized to actually fill its column rather than fade away. RESKIN
// BUG FOUND: this had been hardcoded to a literal hex (first ivory Halo,
// then Mint) rather than a var() reference, so it silently survived two
// prior color migrations unnoticed. Now reads var(--global-cta) directly
// (color-mix() for the partial-opacity strokes/glow) so a future Platform
// Action color change reaches this automatically — no more stale copies.
// MOCKUP ALIGNMENT CORRECTION: size caps raised (max-h/w-28 -> -44) now
// that CARD_H is taller on desktop (see PromoCard.jsx) — at the old cap
// this mark stayed pinned at ~112px inside a much bigger artwork zone,
// reading as a small disconnected icon adrift in empty space rather than
// artwork with real presence.
// SURFACE HIERARCHY POLISH: 82%/44 -> 90%/48 (176px -> 192px, ~9% larger)
// on all three promo illustrations (this one, WelcomeArtwork, RaceArtwork
// below) — still expressed as a percentage of the artwork zone (itself
// unchanged: card width/height, CTA placement and the zone's own 38%/42%
// split are all untouched), so this scales down safely at narrower
// desktop widths exactly as before; only the upper-bound cap and relative
// fill percentage grew.
function WalletMark() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <GlowBackdrop />
      <svg viewBox="0 0 100 100" className="relative h-[90%] w-[90%] max-h-48 max-w-48">
        <rect x="12" y="32" width="76" height="52" rx="10" fill="#101418" stroke="color-mix(in srgb, var(--global-cta) 35%, transparent)" strokeWidth="2" />
        <path d="M12 47 h76" stroke="color-mix(in srgb, var(--global-cta) 24%, transparent)" strokeWidth="1.2" />
        <circle cx="76" cy="60" r="6" fill="var(--global-cta)" />
        <rect x="26" y="12" width="36" height="24" rx="5" fill="#181C22" stroke="color-mix(in srgb, var(--global-cta) 30%, transparent)" strokeWidth="1.5" transform="rotate(-8 44 24)" />
        <circle cx="54" cy="20" r="13" fill="#FFD36B" />
        <circle cx="54" cy="20" r="7.5" fill="none" stroke="#181C22" strokeOpacity="0.55" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

// Two-column shell every wallet-tile state shares: text column (~60-64%, its
// own justify-between so heading/body/CTA space out instead of clustering at
// the top) + a fixed-width illustration column (~36-40%) that can never be
// overlapped by text since they're separate flex children, not a text-over-
// image overlay. Same CARD_H/radius/border/background tokens as PromoCard
// (this tile sits in the exact same row) — a bare <button> is inline-block
// and won't stretch on its own, which is why the outer div (not the button)
// owns `w-full`. Illustration hidden below `sm:`: at the ~110px mobile card
// width fixed by the existing 3-col grid there isn't room for a legible
// illustration alongside readable text and a tappable CTA.
function WalletCard({ children, tone = "neutral" }) {
  return (
    <div
      // CARD POLISH: same subtle resting elevation as the promo cards
      // beside it in this row (--elevation-low).
      className={cn(
        CARD_H,
        "relative flex w-full min-w-0 items-stretch gap-3 overflow-hidden rounded-lg border p-4 text-left shadow-[var(--elevation-low)] transition duration-150",
        tone === "warning" ? "border-[var(--warning)]/30 bg-[var(--card)]" : "border-[var(--border)] bg-[var(--card)]"
      )}
    >
      <div className="flex h-full min-w-0 flex-1 flex-col justify-between">{children}</div>
      {/* MOCKUP ALIGNMENT CORRECTION: ratio unified with PromoCard's own
          artwork zone (was 36%/40%, PromoCard uses 38%/42% — "consistent
          artwork zone" across all three cards), and the same soft left-
          edge fade applied so the wallet mark blends into the card the
          same way the other two cards' artwork now does. */}
      <div
        className="hidden w-[38%] shrink-0 sm:block lg:w-[42%]"
        style={{
          maskImage: "linear-gradient(to right, transparent, black 30%)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 30%)",
        }}
      >
        <WalletMark />
      </div>
    </div>
  );
}

// MOCKUP ALIGNMENT CORRECTION: the previous pass filled these slots with
// the repository's raster hero photos (public/heroes/casino-welcome.png,
// casino-race.png). Reviewed against the approved direction and found
// wrong on two counts: (1) at this card's actual rendered box they read
// as small disconnected photo thumbnails, not integrated artwork — a hard
// object-cover rectangle sitting inside an otherwise plain card, exactly
// the "thumbnail-card-inside-card" effect the correction calls out; (2)
// both photos are warm pink/magenta/gold, contradicting the approved
// blue/violet atmosphere ("avoid red or magenta-dominant cards"). No
// transparent PNG/WebP asset in the correct palette exists in the repo,
// so per the task's own fallback guidance ("if proper standalone artwork
// is not available, use tasteful abstract CSS-backed art zones rather
// than low-quality thumbnail images") these are restrained SVG motifs —
// same construction technique as WalletMark (a handful of shapes, one
// brand-tinted radial glow, color-mix() strokes/fills reading var(
// --global-cta) directly so a future brand recolor reaches these too),
// so all three cards' artwork now visibly belong to one system instead
// of "one icon + two unrelated photos". Real campaign artwork can replace
// either of these later by swapping just the component passed as
// `artwork` — PromoCard's contract (a zero-prop component reference) is
// unchanged. GlowBackdrop itself now lives in shell/artwork/ (shared with
// Sports/Predictions' own artwork, which reuses this exact recipe).

// Gift-box motif for the welcome/deposit-bonus offer.
function WelcomeArtwork() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <GlowBackdrop />
      <svg viewBox="0 0 100 100" className="relative h-[90%] w-[90%] max-h-48 max-w-48">
        <rect x="18" y="42" width="64" height="42" rx="6" fill="#101418" stroke="color-mix(in srgb, var(--global-cta) 35%, transparent)" strokeWidth="2" />
        <rect x="14" y="30" width="72" height="16" rx="5" fill="#181C22" stroke="color-mix(in srgb, var(--global-cta) 40%, transparent)" strokeWidth="2" />
        <rect x="45" y="30" width="10" height="54" fill="color-mix(in srgb, var(--global-cta) 55%, transparent)" />
        <path
          d="M50 30 C40 30 34 20 42 14 C48 10 50 22 50 30 Z M50 30 C60 30 66 20 58 14 C52 10 50 22 50 30 Z"
          fill="var(--global-cta)"
        />
        <circle cx="26" cy="70" r="2.5" fill="color-mix(in srgb, var(--global-cta) 45%, transparent)" />
        <circle cx="76" cy="58" r="2" fill="color-mix(in srgb, var(--global-cta) 35%, transparent)" />
        <circle cx="72" cy="76" r="1.6" fill="#FFD36B" />
      </svg>
    </div>
  );
}

// Trophy motif for the weekly race/leaderboard promo.
function RaceArtwork() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <GlowBackdrop />
      <svg viewBox="0 0 100 100" className="relative h-[90%] w-[90%] max-h-48 max-w-48">
        <path
          d="M38 20 h24 v20 c0 10 -5.4 16 -12 16 s-12 -6 -12 -16 Z"
          fill="#181C22"
          stroke="color-mix(in srgb, var(--global-cta) 40%, transparent)"
          strokeWidth="2"
        />
        <path d="M38 24 c-9 0 -13 5 -13 12 s5 12 11 12" fill="none" stroke="color-mix(in srgb, var(--global-cta) 45%, transparent)" strokeWidth="3" />
        <path d="M62 24 c9 0 13 5 13 12 s-5 12 -11 12" fill="none" stroke="color-mix(in srgb, var(--global-cta) 45%, transparent)" strokeWidth="3" />
        <circle cx="50" cy="32" r="6" fill="#FFD36B" />
        <rect x="46" y="55" width="8" height="12" fill="color-mix(in srgb, var(--global-cta) 55%, transparent)" />
        <rect x="34" y="67" width="32" height="8" rx="2" fill="#101418" stroke="color-mix(in srgb, var(--global-cta) 35%, transparent)" strokeWidth="2" />
        <rect x="28" y="75" width="44" height="9" rx="2.5" fill="var(--global-cta)" />
      </svg>
    </div>
  );
}

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
          <MicroLabel>Wallet</MicroLabel>
          <h3 className="mt-1.5 text-lg font-bold leading-tight text-[var(--foreground)]">Connecting…</h3>
          <p className="mt-1 text-xs leading-snug text-[var(--ink-dim)]">Approve the request in your wallet.</p>
        </div>
        <Button size="sm" disabled className="w-fit" aria-label="Connecting to wallet">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Connecting…
        </Button>
      </WalletCard>
    );
  }

  // 2. Disconnected — the product utility pitch. Same connect() the header's
  // WalletButton uses; no second wallet-connect implementation.
  if (!isConnected) {
    return (
      <WalletCard>
        <div className="min-w-0">
          <MicroLabel>Wallet</MicroLabel>
          {/* MOCKUP ALIGNMENT CORRECTION: text-base -> text-lg, matching
              PromoCard's title scale exactly ("consistent title scale
              across all three cards, no card title significantly smaller
              than another") — was visibly smaller than the other two
              cards' titles. Second line keeps the Casino/system accent
              (--global-cta-hover, not raw --global-cta — same AA-on-dark-
              surface reasoning as Sidebar.jsx's ACTIVE_ACCENT), still just
              two words of accent colour, not body copy. Supporting copy
              is no longer breakpoint-gated — shown at every size now,
              same as the other two cards' metadata. */}
          <h3 className="mt-1.5 text-lg font-bold leading-tight text-[var(--foreground)]">
            One wallet.
            <br />
            <span className="text-[var(--global-cta-hover)]">Every game.</span>
          </h3>
          <p className="mt-1 text-xs leading-snug text-[var(--ink-dim)]">Play, earn and withdraw with one connection.</p>
        </div>
        <Button size="sm" onClick={connect} data-test-id="wallet-tile-connect" className="w-fit">
          Connect wallet
        </Button>
      </WalletCard>
    );
  }

  // 3. Connected on the wrong chain — same switchTo() the auth gate uses.
  if (!onCasinoChain) {
    return (
      <WalletCard tone="warning">
        <div className="min-w-0" role="status" aria-live="polite">
          <MicroLabel className="text-amber-400/80">Wallet</MicroLabel>
          <h3 className="mt-1.5 text-lg font-bold leading-tight text-[var(--foreground)]">Wrong network</h3>
          <p className="mt-1 text-xs leading-snug text-[var(--ink-dim)]">Switch to Base Sepolia to continue.</p>
        </div>
        <Button
          size="sm"
          onClick={() => switchTo(CASINO_CHAIN_ID)}
          disabled={isSwitching}
          data-test-id="wallet-tile-switch-network"
          className="w-fit"
        >
          {isSwitching && <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />}
          {isSwitching ? "Switching…" : "Switch network"}
        </Button>
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
        <MicroLabel className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[var(--success)]" aria-hidden="true" />
          Wallet connected
        </MicroLabel>
        <div className="mt-1.5 truncate font-mono text-xs text-[var(--ink-dim)]">{shortAddress(address)}</div>
        {/* MOCKUP ALIGNMENT CORRECTION: text-lg -> text-2xl — the balance
            IS this card's "title" moment (there's no separate headline
            here the way the other two states have "One wallet./Every
            game."), so it needs the same visual weight, not a small
            operational-widget number squeezed into the top-left. */}
        <div className="mt-2">
          {casinoBalanceLoading ? (
            <div className="h-8 w-28 animate-pulse rounded bg-white/10" role="status" aria-live="polite" aria-label="Loading balance" />
          ) : casinoBalanceError ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Balance unavailable</span>
              <button type="button" onClick={() => refetchCasinoBalance?.()} className="text-xs font-semibold text-[var(--global-cta-hover)] hover:underline">
                Retry
              </button>
            </div>
          ) : (
            // RESKIN v2 CALIBRATION: was font-black (weight 900, unaffected
            // by the app-wide font-weight-bold override) — a balance is
            // DATA (JetBrains Mono, tabular numerics), not display text.
            <div className="truncate font-mono text-2xl font-semibold tabular-nums text-white">
              {casinoBalance.toFixed(5)} <span className="text-xs font-semibold text-[var(--ink-dim)]">{casinoSymbol}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={openAccount} data-test-id="wallet-tile-view" className="w-fit">
          View wallet
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={copyAddress}
          aria-label="Copy wallet address"
          data-test-id="wallet-tile-copy"
        >
          <Copy className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </WalletCard>
  );
}

// `mobilePlaceholder` is shorter — the full desktop copy ("Search prediction
// markets") clips inside the narrower mobile input; desktop copy is
// unchanged. Search-specific copy stays local (not "availability" data —
// see lib/arenas.js); id/label come from the shared ARENAS list.
const SEARCH_COPY = {
  casino: { placeholder: "Search casino games", mobilePlaceholder: "Search games" },
  predictions: { placeholder: "Search prediction markets", mobilePlaceholder: "Search markets" },
  sports: { placeholder: "Search sports, leagues or teams", mobilePlaceholder: "Search teams or leagues" },
};
const SEARCH_SCOPES = ARENAS.map((a) => ({ ...a, ...SEARCH_COPY[a.id] }));

// One combined control — a borderless scope <select> and a borderless input
// sharing a single outer border/height/radius/focus ring, not two separate
// controls. Switching scope only swaps the placeholder copy: it doesn't
// navigate — Casino/Sports/Predictions each search their own page's own
// content, and `defaultScope` just seeds which one this instance opens on
// (Sports opens on "sports", Predictions on "predictions", etc). Exported:
// this is the one search implementation shared by all three arenas — the
// focus ring uses the one Tribet brand colour (--global-cta), same on
// every arena — no per-arena tint anymore.
//
// `panel` is optional — Casino passes a grouped results/empty/no-results
// ReactNode (see CasinoSearch.jsx) to get real combobox behaviour: this
// component owns only the input/scope-select chrome and the anchored
// positioning wrapper, never the panel's contents, grouping, or keyboard
// semantics — those are entirely the caller's (see `onInputKeyDown`,
// `activeDescendantId`). Sports/Predictions pass none of this and keep their
// original plain-input behaviour untouched: no dropdown, no combobox roles.
//
// `mobileMode="fullscreen"` (Casino-only) suppresses the inline dropdown
// below `md:` entirely — focusing the input calls `onMobileFocus` instead,
// so the caller can mount its own full-screen search surface rather than
// this component trying to be both an inline combobox and a modal.
//
// `open`/`onOpenChange` are optionally controlled: Casino passes both (it
// needs to force-close the panel after a mouse selection, since results use
// onMouseDown={preventDefault} to keep focus in the input while clicking —
// see CasinoSearch.jsx). Sports/Predictions pass neither and get the
// original uncontrolled focus/blur-driven open state, unchanged.
export function ScopedSearch({
  query, onQuery, defaultScope = "casino",
  panel, panelId, onInputKeyDown, activeDescendantId,
  open: openProp, onOpenChange,
  mobileMode = "inline", onMobileFocus,
}) {
  const [scope, setScope] = useState(defaultScope);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlledOpen = openProp !== undefined;
  const open = isControlledOpen ? openProp : internalOpen;
  const rootRef = useRef(null);
  const active = SEARCH_SCOPES.find((s) => s.id === scope);
  const setOpen = (next) => {
    if (!isControlledOpen) setInternalOpen(next);
    onOpenChange?.(next);
  };

  // Developer Panel's Platform Scope mock (see lib/devMock.js) — reads as
  // "full" (unrestricted) at rest, and everywhere `DEV_PANEL_ENABLED` is
  // off, same guarantee as every other devMock-driven override in this
  // app. Casino is always selectable (see lib/platformScope.js's
  // isArenaAllowed); Predictions/Sports are only disabled here while
  // MVP-scoped.
  const mock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? mock.platformScope : "full";
  // Mirrors App.jsx's "switching to MVP while inside a disabled arena
  // immediately redirects" effect: if scope somehow points at a
  // now-disallowed arena (e.g. Platform Scope flips to MVP live while
  // "Sports" was selected here), snap back to Casino rather than leaving
  // an impossible-to-search scope selected.
  useEffect(() => {
    if (!isArenaAllowed(scope, platformScope)) setScope("casino");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to scope-mode flips, not every scope change
  }, [platformScope]);

  // Placeholder text only — matches the shared md: breakpoint the rest of
  // the mobile shell uses (Sidebar/MobileBottomNav).
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const hasPanel = panel !== undefined;
  const fullscreenOnMobile = mobileMode === "fullscreen" && isMobile;
  // Casino's panel decides its own content for every state (empty query,
  // results, no-results) — no query-length gate here, unlike the old
  // results-only dropdown. On mobile in fullscreen mode this never renders
  // inline at all; onMobileFocus below opens the caller's own surface.
  const showPanel = hasPanel && open && !fullscreenOnMobile;

  // All keyboard semantics beyond a bare Escape fallback belong to the
  // caller (Casino owns a flattened cross-group active index ScopedSearch
  // has no visibility into). If the caller's handler already dealt with
  // Escape (e.g. clearing the active selection first), it calls
  // preventDefault() and this fallback close is skipped — see
  // CasinoSearch.jsx's two-stage Escape.
  const onKeyDown = (e) => {
    onInputKeyDown?.(e);
    if (e.key === "Escape" && !e.defaultPrevented && hasPanel && open) setOpen(false);
  };

  // Close only when focus truly leaves the whole combobox (input, panel,
  // scope select) — not on every internal focus move.
  const onBlur = (e) => {
    if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false);
  };

  return (
    <div>
      {/* VISUAL REFRESH: visible "Search" caption removed (redundant next
          to the scope selector + search icon + placeholder) — sr-only
          preserves the exact same programmatic accessible name via the
          existing label/input association, nothing lost for screen
          readers. */}
      <label htmlFor="arena-search-input" className="sr-only">
        Search
      </label>
      <div ref={rootRef} onBlur={onBlur} className="relative">
        {/* SURFACE HIERARCHY POLISH: border-white/10 -> /8. Dimensions,
            radius, category selector, icon, placeholder and interaction
            are all untouched — bg-zinc-900 already reads as distinguishable
            from the lifted --background (see index.css), verified after
            the background change; this only softens the border itself. */}
        <div className="flex h-11 items-center rounded-lg border border-white/8 bg-zinc-900 focus-within:ring-2 focus-within:ring-[var(--global-cta)]">
          <div className="relative flex h-full shrink-0 items-center">
            {/* A real <select> can't carry a Radix Tooltip or custom opacity
                per <option> — the browser renders that native popup itself,
                opaque to CSS/JS once open — so disabled-arena scope options
                need a real (Radix) menu instead. Casino is never disabled
                (see lib/platformScope.js's isArenaAllowed); Predictions/
                Sports gate the same way the main arena nav does. */}
            <DropdownMenuPrimitive.Root>
              <DropdownMenuPrimitive.Trigger asChild>
                <button
                  type="button"
                  aria-label="Search scope"
                  data-test-id="search-scope"
                  className="flex h-full items-center whitespace-nowrap rounded-l-lg border-0 bg-transparent py-0 pl-2.5 pr-6 text-sm font-medium text-white outline-none focus-visible:outline-none sm:pl-3 sm:pr-7"
                >
                  {active.label}
                </button>
              </DropdownMenuPrimitive.Trigger>
              <DropdownMenuPrimitive.Portal>
                <DropdownMenuPrimitive.Content
                  align="start"
                  sideOffset={8}
                  className="z-[var(--z-header-popover)] min-w-[10rem] overflow-hidden rounded-lg border border-white/10 bg-zinc-900 p-1 text-white outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                  style={{ boxShadow: "var(--elevation-medium)" }}
                >
                  <DropdownMenuPrimitive.RadioGroup
                    value={scope}
                    onValueChange={(v) => { setScope(v); track("casino_search_scope_changed", { searchScope: v }); }}
                  >
                    {SEARCH_SCOPES.map((s) => {
                      const scopeDisabled = DEV_PANEL_ENABLED && !isArenaAllowed(s.id, platformScope);
                      const item = (
                        <DropdownMenuPrimitive.RadioItem
                          key={s.id}
                          value={s.id}
                          disabled={scopeDisabled}
                          className={cn(
                            "flex cursor-pointer items-center rounded-md px-2.5 py-1.5 text-sm outline-none transition-colors data-[highlighted]:bg-white/10",
                            scopeDisabled && "cursor-not-allowed opacity-50 data-[highlighted]:bg-transparent"
                          )}
                        >
                          {s.label}
                        </DropdownMenuPrimitive.RadioItem>
                      );
                      // Tooltip only wraps disabled options — same "Coming
                      // soon", hover/focus-only (never tap-triggered), no
                      // layout shift pattern as the main arena nav (see
                      // Sidebar.jsx).
                      return DEV_PANEL_ENABLED && scopeDisabled ? (
                        <Tooltip key={s.id}>
                          <TooltipTrigger asChild>{item}</TooltipTrigger>
                          <TooltipContent side="right">Coming soon</TooltipContent>
                        </Tooltip>
                      ) : item;
                    })}
                  </DropdownMenuPrimitive.RadioGroup>
                </DropdownMenuPrimitive.Content>
              </DropdownMenuPrimitive.Portal>
            </DropdownMenuPrimitive.Root>
            <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-zinc-500 sm:right-2" />
          </div>
          <span className="h-5 w-px shrink-0 bg-white/10" aria-hidden="true" />
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500 sm:left-3" />
            <input
              id="arena-search-input"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onFocus={() => {
                track("casino_search_focused", { searchScope: scope });
                if (fullscreenOnMobile) { onMobileFocus?.(); return; }
                setOpen(true);
              }}
              onKeyDown={onKeyDown}
              placeholder={isMobile ? active.mobilePlaceholder : active.placeholder}
              data-test-id="arena-search"
              role={hasPanel ? "combobox" : undefined}
              aria-expanded={hasPanel ? showPanel : undefined}
              aria-controls={hasPanel ? panelId : undefined}
              aria-activedescendant={activeDescendantId}
              aria-autocomplete={hasPanel ? "list" : undefined}
              autoComplete="off"
              className={cn(
                "h-full w-full min-w-0 rounded-r-lg border-0 bg-transparent pl-8 pr-3 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none sm:pl-9",
                query && "pr-8 sm:pr-9"
              )}
            />
            {query && (
              <button
                type="button"
                onClick={() => { onQuery(""); document.getElementById("arena-search-input")?.focus(); }}
                aria-label="Clear search"
                data-test-id="arena-search-clear"
                className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-zinc-500 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:right-2.5"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {showPanel && (
          <div
            id={panelId}
            data-test-id="arena-search-panel"
            className="tribet-scrollbar absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-[28rem] overflow-y-auto rounded-lg border border-white/10 bg-zinc-900"
            style={{ boxShadow: "var(--elevation-medium)" }}
          >
            {panel}
          </div>
        )}
      </div>
    </div>
  );
}

// MOCKUP ALIGNMENT CORRECTION: the previous pass gave the wallet card a
// dominant ~48% column against two ~26% secondary cards — reads as one
// hero widget plus two afterthoughts, not "one coherent system" of three
// equal promotional cards. Corrected to a strict equal-thirds system:
// mobile (base) keeps the existing real horizontal snap-scroll carousel
// (three equal 82%-viewport-width columns — unrelated to this fix, and
// already what produced the accidental "200% u…" / "$50,00…" clipping
// this file's history refers to); tablet (sm+) keeps the wallet card
// spanning a full-width row above the two secondary cards sharing a row
// beneath it (one of the task's two explicitly pre-approved tablet
// patterns — three columns are too narrow to stay readable at sm:/md:
// widths); desktop (lg+) is now three GENUINELY equal columns
// (grid-cols-3, i.e. repeat(3, minmax(0,1fr))) — no card gets a wider
// grid track than another. Any visual "importance" a card carries now
// comes only from its own copy/artwork, never from a larger column span.
export function PromoStrip({ query, onQuery, searchPanelProps }) {
  const [p1, p2] = PROMOS;
  return (
    <div className="casino-content-column w-full space-y-4">
      <div className="top-card-grid -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
        <div className="w-[82%] shrink-0 snap-start sm:col-span-2 sm:w-auto sm:shrink lg:col-span-1"><PlayerTile /></div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto sm:shrink">
          <PromoCard eyebrow={p1.eyebrow} title={p1.title} metadata={p1.body} cta={p1.cta} artwork={WelcomeArtwork} />
        </div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto sm:shrink">
          <PromoCard eyebrow={p2.eyebrow} title={p2.title} metadata={p2.body} cta={p2.cta} artwork={RaceArtwork} />
        </div>
      </div>
      <ScopedSearch
        query={query}
        onQuery={onQuery}
        {...searchPanelProps}
      />
    </div>
  );
}
