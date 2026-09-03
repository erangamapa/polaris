import { useState, useEffect, useRef } from "react";
import { History, Heart, Gamepad2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";
// Imported from betswirlCatalog.js directly, NOT useBetSwirl.js — that file
// pulls in the real @betswirl/sdk-core SDK (needed to place bets), which
// this catalog listing must never require just to show card metadata (see
// PERFORMANCE task: "Lobby cards do not import full game implementations").
import { BETSWIRL_GAMES } from "@/web3/betswirlCatalog";
import { PROVIDER_GAMES } from "./ProviderGame";
import { EmptyState } from "@/components/ui/empty-state";
import { MicroLabel } from "@/components/ui/micro-label";
import { takeUnclaimed } from "@/lib/casinoDedup";
import { PROFILE_VARIANT } from "@/lib/profileState";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { useDevMockState } from "@/lib/devMock";
import { createPlaceholderGames, notifyPlaceholderClicked, PLACEHOLDER_TITLE, PLACEHOLDER_ARIA_LABEL, PLACEHOLDER_TARGET_TOTAL, createPlaceholderProviders, notifyPlaceholderProviderClicked } from "@/lib/casinoPlaceholders";
import { CATEGORY_META, CASINO_CATEGORIES, CATEGORY_LABEL, CASINO_PROVIDERS } from "@/lib/casinoCategories";

// Onchain games carry no provider field of their own (BETSWIRL_GAMES has
// none — see useBetSwirl.js) and get their own category/rail rather than a
// row in the Providers rail (nav spec §6.6). Provider-kind games resolve
// their display name via the real `providerId` FK against CASINO_PROVIDERS
// (see ProviderGame.jsx/casinoCategories.js) — not a repeated display-string
// match. Lives here (not in casinoSearch.js, which already imports FROM this
// file) so both CasinoGameCard and search can use the exact same label
// without a circular import.
//
// These cards read "BetSwirl", not "Tribet Originals". An earlier naming pass
// hid the vendor name as exposed prototype terminology, but the replacement
// asserted Tribet authored Dice/Roulette/Keno, which is false — BetSwirl
// builds and settles them, and Tribet's own games are the provider-kind ones
// badged Tribet Studio. Attribution beats tidiness here. The label still comes
// from CATEGORY_LABEL rather than a literal, so these cards and the section
// heading they sit under can never disagree.
export const gameProviderName = (game) =>
  game.kind === "onchain" ? CATEGORY_LABEL.Originals : (CASINO_PROVIDERS.find((p) => p.id === game.providerId)?.name ?? "Provider");

// Shared broken-image detection — one `onError` state machine, reused by
// every place a game's artwork renders (full cards here, the compact search
// result row in CasinoSearch.jsx) so "what counts as a fallback" never
// diverges between surfaces.
export function useBrokenImage() {
  const [broken, setBroken] = useState(false);
  return { broken, onError: () => setBroken(true) };
}

// Games carry a namespaced favId so the on-chain "dice" and the provider "dice"
// never collide in the favorites set.
const ONCHAIN = BETSWIRL_GAMES.map((g) => ({ ...g, favId: `casino:${g.key}`, kind: "onchain" }));
const PROVIDER = PROVIDER_GAMES.map((g) => ({ ...g, favId: `provider:${g.key}`, kind: "provider" }));
export const ALL_GAMES = [...ONCHAIN, ...PROVIDER];

// Deep-link helper: build/read the `?play=<favId>` query param a tile's
// href points to, so a plain URL (new tab, reload, shared link) can open
// the right game modal on its own.
export const gameHref = (game) => `/casino/lobby?play=${encodeURIComponent(game.favId)}`;
export const findGameByFavId = (favId) => ALL_GAMES.find((g) => g.favId === favId) ?? null;

// Favorite control — one shared icon/behavior for every surface it appears
// on (cards here, the compact search result row in CasinoSearch.jsx): press
// feedback on toggle, stops propagation so favoriting never launches the
// game, aria-pressed + a game-name label, keyboard Enter/Space. `tabIndex`
// defaults to a real, independent tab stop (correct for a card sitting in a
// grid/rail); search overrides it to -1, since search results are navigated
// by ArrowUp/Down within one combobox listbox, and a second real tab stop
// per row would break that linear keyboard model.
//
// HEART REDESIGN: a Star reads as "featured/recommended" — this control
// means "this is one of MY games," a personal collection, so it's a Heart
// instead. Purely visual/semantic; the toggle behavior, aria-label wording
// ("Favorites", never "star"), and press animation below are all unchanged.
//
// `variant` picks the chrome, since the two surfaces need genuinely
// different treatments rather than one style forced onto both:
// - "chip" (default): the Favorites glass chip — 36px visual chip inside a
//   40px touch target, coral-filled heart when active, meant to sit on top
//   of arbitrary game artwork. Used by CasinoGameCard below.
// - "plain": the older flat icon-only treatment (no background box), for
//   CasinoSearch's dense list row where a 40px glass chip would be far too
//   heavy — that surface supplies its own hover/color chrome via
//   `className` exactly as before.
// Active-state coral (`--favorite-heart`) is shared by both variants so
// "favorited" reads identically everywhere; only the surrounding chrome
// differs.
export function FavStar({ faved, onToggle, title, className, tabIndex = 0, onMouseDown, variant = "chip", ...rest }) {
  const [pulse, setPulse] = useState(0);
  const isChip = variant === "chip";

  const handle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPulse((p) => p + 1);
    onToggle();
  };

  return (
    <span
      role="button"
      tabIndex={tabIndex}
      data-fav
      aria-label={faved ? `Remove ${title} from Favorites` : `Add ${title} to Favorites`}
      aria-pressed={faved}
      onClick={handle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handle(e); }}
      onMouseDown={onMouseDown}
      {...rest}
      className={cn(
        "group/fav grid cursor-pointer place-items-center outline-none transition",
        isChip ? "size-10 rounded-lg" : "size-11 rounded-md",
        className
      )}
    >
      <span
        key={pulse}
        className={cn(
          "grid place-items-center transition-[transform] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
          pulse > 0 && "fav-chip-pop",
          isChip
            ? cn(
                "size-9 rounded-lg border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md transition-[background-color,border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover/fav:-translate-y-0.5 group-hover/fav:scale-[1.05]",
                faved
                  ? "border-[var(--global-cta-soft-border)] bg-[rgba(15,20,38,0.5)] group-hover/fav:border-[color-mix(in_srgb,var(--global-cta)_60%,transparent)]"
                  : "border-white/10 bg-[rgba(12,16,30,0.42)] group-hover/fav:border-white/20 group-hover/fav:bg-[rgba(15,20,38,0.5)]"
              )
            : "size-full rounded-md transition-colors duration-200 group-hover/fav:bg-white/10"
        )}
      >
        <Heart
          className={cn(
            "size-4 transition-transform duration-200 group-hover/fav:scale-[1.08]",
            faved ? "fill-[var(--favorite-heart)] text-[var(--favorite-heart)]" : isChip ? "text-[rgba(255,255,255,0.72)]" : "text-[var(--muted-foreground)]"
          )}
        />
      </span>
    </span>
  );
}
// Chrome for FavStar's chip variant when it overlays game artwork (every
// card below) — search's compact row uses variant="plain" and supplies its
// own (see CasinoSearch.jsx's GameRow). Positions the 40px touch target in
// the existing top-right safe area; sizing/rounding/background/border now
// live inside FavStar itself (chip variant), not here.
const FAV_STAR_OVERLAY = "absolute right-1 top-1 z-20";
// Local-contrast vignette behind the chip only — a soft dark pool between
// the artwork and the chip so the chip reads reliably on white/yellow/cyan/
// purple/photo thumbnails without the chip itself needing heavier chrome.
// Centered on the same point as the chip via `inset-0 m-auto` (works
// regardless of the vignette being larger than its positioned parent).
// Sits beneath the chip purely by DOM order (rendered first, no z-index of
// its own needed) and above the artwork by being inside the same
// `FAV_STAR_OVERLAY`-positioned corner, which stacks over the card image.
const FAV_VIGNETTE = "pointer-events-none absolute inset-0 m-auto size-16 rounded-full bg-[radial-gradient(circle,rgba(0,0,0,0.20)_0%,rgba(0,0,0,0.08)_45%,rgba(0,0,0,0)_75%)]";

// A card is a real <a href> so the browser's native middle-click / cmd-click
// / ctrl-click "open in new tab" behaviour works, like on most sites. A
// plain left click is intercepted to open the game in-place (no full page
// reload); modified clicks are left alone so the browser opens the target
// URL itself.
const linkClick = (onLaunch, game, context) => (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  onLaunch(game, context);
};

// Per-card status: only for card-specific conditions (this game isn't wired
// up yet), never network state — a disconnected/wrong-network wallet doesn't
// change whether Wheel/Plinko show this. Always a plain-language label, never
// jargon, and never colour/greyscale alone — the label is the real signal.
// Provider-kind games have no such concept in this catalog (PROVIDER_GAMES
// carries no `playable` field — every provider game is always launchable),
// so this only ever applies to onchain games; CasinoGameCard derives
// `playable` per-kind below rather than assuming every game has the field.
const STATUS_LABEL = { "coming-soon": "Coming soon" };

// The one shared game-card surface used everywhere a game appears as a full
// card (Lobby rails, Favorites, Recently Played, category/provider grids —
// see GRID/RAIL_TILE below for how callers size it). Search's compact
// result row is deliberately NOT this component (a different DOM shape for
// a dense list), but reuses its underlying pieces: gameProviderName,
// useBrokenImage, and FavStar itself (see CasinoSearch.jsx).
//
// `context` ("home" | "favorites" | "recent" | "category" | "search") is
// analytics-only — forwarded through onLaunch to App.jsx's launchGame as the
// launch's `source`, so casino_game_launch_requested/ready/failed can report
// which section a launch came from (see useCasinoGameLaunch.js). Never
// changes rendering.
export function CasinoGameCard({ game, onLaunchOnchain, onLaunchProvider, isFav, onFav, showProvider = true, showFavorite = true, context }) {
  const faved = isFav?.(game);
  const onLaunch = game.kind === "onchain" ? onLaunchOnchain : onLaunchProvider;
  // Only onchain games can be non-playable in this catalog (see STATUS_LABEL
  // above) — provider games have no such field, so `playable` defaults true.
  const playable = game.kind === "onchain" ? game.playable : true;
  const status = playable ? null : (game.status ?? "coming-soon");
  const statusLabel = status ? STATUS_LABEL[status] ?? status : null;
  const { broken, onError } = useBrokenImage();
  const testKey = game.favId.replace(":", "-");
  // A11Y: the link's accessible NAME stays "Play {title}" (short, so tabbing
  // through a full grid of cards doesn't get verbose) — studio is reachable
  // to AT via aria-describedby instead, which (unlike descendant content) is
  // unaffected by the aria-label set on the <a> below: aria-label overrides
  // name computation from content entirely, so a hidden span placed inside
  // the link would be silently ignored, but aria-describedby is a separate
  // computation and works regardless. See the sr-only <span id={studioDescId}>
  // right after the closing </a>.
  const studioDescId = `${testKey}-studio`;

  return (
    <div
      className={cn(
        // LOBBY HIERARCHY PASS: --border (the app-wide token, tuned for
        // opaque surfaces like the search field/footer/promo cards) reads
        // too heavy against colorful game artwork — cards get their own
        // --card-border/--card-top-highlight pair instead (see index.css),
        // restrained per the pass's own suggested rgba ranges, so this one
        // change doesn't ripple into every other bordered surface in the
        // app. The hover lift/scale itself lives in index.css's
        // `.casino-game-card--playable` rule (border-color/shadow stay as
        // Tailwind utilities here, transform doesn't) — same split this app
        // already uses for `.promo-card`, including its reduced-motion
        // override (transform disabled, color/shadow feedback kept). Gated
        // to a `--playable` modifier so a Coming Soon card never gets the
        // same hover elevation as an active one.
        "casino-game-card group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl border border-[var(--card-border)] bg-surface-game-card shadow-[var(--elevation-low),inset_0_1px_0_var(--card-top-highlight)] transition duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_var(--card-top-highlight)]",
        playable && "casino-game-card--playable hover:border-[var(--global-cta)]"
      )}
    >
      <a
        href={gameHref(game)}
        onClick={playable ? linkClick(onLaunch, game, context) : (e) => e.preventDefault()}
        aria-disabled={!playable || undefined}
        // NAV SPEC §5.4: "COMING SOON tiles... are non-interactive... not
        // focusable and do not route." Non-routing was already true
        // (onClick above); this card was still a real, tabbable <a> for a
        // Coming Soon game though — `pointer-events-none` only blocks
        // mouse interaction, keyboard Tab still landed on it. Removed from
        // the tab order entirely for the non-playable case.
        tabIndex={playable ? undefined : -1}
        data-test-id={`game-card-${testKey}`}
        aria-label={playable ? `Play ${game.title}` : `${game.title} — ${statusLabel}`}
        aria-describedby={showProvider ? studioDescId : undefined}
        className={cn(
          "absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !playable && "pointer-events-none cursor-not-allowed"
        )}
      >
        {broken ? (
          <div className="grid h-full w-full place-items-center bg-surface-game-card-fallback">
            <Gamepad2 className="size-6 text-zinc-600" aria-hidden="true" />
          </div>
        ) : (
          <img
            src={game.image}
            alt=""
            loading="lazy"
            onError={onError}
            className={cn(
              "h-full w-full object-cover transition duration-300",
              playable ? "group-hover:scale-105" : "opacity-40 grayscale"
            )}
          />
        )}
        {/* HOTFIX (double titles): every real cover-art asset in this
            catalog already bakes its own title (and, for provider games,
            a studio wordmark) directly into the image — see
            public/img/games/*.svg/.webp. This HTML overlay duplicated
            that text on top of the art. It's only real content when
            there's no baked title to show at all, i.e. the `broken`
            fallback (missing/failed image, plain icon) — everywhere a
            real image renders, this stays hidden. Shape/reach of the
            gradient is otherwise unchanged from before. */}
        {broken && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/92 via-black/43 to-transparent p-2 pt-6">
            <div className="line-clamp-2 text-xs font-bold leading-snug text-white">{game.title}</div>
            {showProvider && <div className="truncate text-[10px] leading-snug text-zinc-400">{gameProviderName(game)}</div>}
          </div>
        )}
      </a>
      {/* A11Y: studio, reachable to AT via the aria-describedby wired above
          without adding to the link's accessible name (see studioDescId's
          own comment) — read automatically on focus by NVDA/JAWS/VoiceOver
          at default verbosity. Always rendered here (not only inside the
          `broken` fallback above), so a screen reader user gets the same
          studio attribution a sighted user reads off the artwork in the
          normal case too, not just when the image fails to load. */}
      {showProvider && (
        <span id={studioDescId} className="sr-only">
          {gameProviderName(game)}
        </span>
      )}
      {/* Semi-transparent black background is a deliberate exception (needs
          to stay legible over arbitrary colorful game artwork, not a
          neutral card surface) — font/weight/size/tracking/radius/case
          still come from the one shared MicroLabel. */}
      {statusLabel && (
        <MicroLabel aria-hidden="true" className="pointer-events-none absolute left-1.5 top-1.5 bg-black/80 text-white">
          {statusLabel}
        </MicroLabel>
      )}
      {/* Favorite is hidden (not just disabled) on an unavailable card — a
          consistent single rule rather than the previous unconditional
          render, which let you favorite a game you can't play yet. Resting
          opacity is slightly reduced and rises to full on card hover (the
          ambient `group` above, not FavStar's own `group/fav`) so the
          action visibly comes forward on interaction without ever hiding it
          — touch devices have no hover, so it stays at its resting opacity
          there, always present and tappable. */}
      {showFavorite && onFav && playable && (
        <div className={cn(FAV_STAR_OVERLAY, "opacity-90 transition-opacity duration-200 group-hover:opacity-100")}>
          <span aria-hidden="true" className={FAV_VIGNETTE} />
          <FavStar faved={faved} onToggle={() => onFav(game)} title={game.title} />
        </div>
      )}
    </div>
  );
}

// Dimension-matching skeleton for CasinoGameCard — not currently wired to
// any real trigger (every Casino data source here is a static import, never
// an async fetch, so there's nothing that actually stays "loading" long
// enough to show one; see LOADING SKELETON: "use skeletons only while real
// data is loading"). Kept as a ready-made, correctly-sized primitive for
// the day a real async game source exists, rather than left unbuilt.
export function CasinoGameCardSkeleton() {
  return (
    <div
      data-test-id="game-card-skeleton"
      aria-hidden="true"
      className="aspect-[3/4] animate-pulse rounded-xl border border-[var(--border)] bg-zinc-900 motion-reduce:animate-none"
    >
      <div className="flex h-full flex-col justify-end gap-1.5 p-2">
        <div className="h-3 w-3/4 rounded bg-white/10" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}

// CASINO PLACEHOLDER FIXTURES — a clean, dedicated variant rather than
// branching CasinoGameCard itself: the two share only their OUTER geometry
// (aspect-[3/4], radius, border, rail/grid sizing — copied verbatim below
// from CasinoGameCard's own wrapper classes so both stay pixel-identical),
// everything else genuinely differs (gradient instead of artwork, no
// favorite control, a real <button> instead of an <a href> so there is no
// href to middle-click/open-in-new-tab around the click handler, no
// gameHref/onLaunch/context wiring at all). See lib/casinoPlaceholders.js
// for the data model and the shared click-feedback helper.
//
// A native <button> gets Enter/Space activation and focus styling for
// free — no custom keydown handling needed to satisfy the keyboard-
// activation requirement.
function PlaceholderGameCard({ game }) {
  return (
    <button
      type="button"
      onClick={notifyPlaceholderClicked}
      data-test-id={`game-card-${game.favId.replace(/:/g, "-")}`}
      data-placeholder="true"
      aria-label={PLACEHOLDER_ARIA_LABEL}
      className="group relative flex aspect-[3/4] w-full flex-col overflow-hidden rounded-xl border border-[var(--border)] text-left shadow-[var(--elevation-low)] transition duration-150 hover:border-white/20 hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ background: `var(${game.gradientVar})` }}
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-2">
        <Gamepad2 className="size-6 text-white/35" aria-hidden="true" />
        {/* Real HTML text, not baked into an image — "PLACEHOLDER" / "GAME"
            two-line treatment per the task's exact requested copy. */}
        <div className="text-center text-xs font-bold leading-snug tracking-wide text-white/85">
          {PLACEHOLDER_TITLE.split(" ").map((word) => <div key={word}>{word}</div>)}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent p-2 pt-6">
        {/* Never a real provider name (Provider #1/Tribet Originals/
            BetSwirl) — see lib/casinoPlaceholders.js's PLACEHOLDER_BADGE. */}
        <div className="truncate text-[10px] leading-snug text-zinc-400">{game.badge}</div>
      </div>
    </button>
  );
}

// MAIN CONTENT WIDTH FIX: mobile/tablet tiers (base/sm/md) are untouched —
// only the desktop tier changes, from a fixed lg:grid-cols-6 (which, once
// ArenaPageColumn could actually grow past its old max-w-6xl cap, would
// have stretched every CasinoGameCard wider instead of showing more of
// them — CasinoGameCard has no width/max-width of its own, only
// aspect-[3/4], so its rendered size is entirely a function of its grid
// cell) to an auto-fill track with a floor close to the card's existing
// ~6-per-row size at a max-w-6xl-capped viewport (~180px). Wider viewports
// now add columns instead of enlarging cards; card size stays effectively
// unchanged at today's common desktop widths.
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(170px,1fr))]";
// Fixed-width tile used by every horizontal Rail. Tailwind needs each
// arbitrary-value class to appear literally in source (a class built by
// interpolating a variable never gets generated), so tile-size variation is
// a small fixed enum rather than an arbitrary numeric prop. "standard" is
// every rail's default (unchanged size); "large" is reserved for the handful
// of sections the hierarchy pass calls out for slightly stronger presence
// (Recently Played, Tribet Originals) so scanning across the rest of the
// page still looks consistent.
const TILE_SCALE_CLASS = { standard: "w-[136px] shrink-0", large: "w-[152px] shrink-0" };
const RAIL_TILE = TILE_SCALE_CLASS.standard;

// LOBBY HIERARCHY PASS: controlled section-to-section rhythm (see
// LobbyDashboard's own comment at its return statement for the full
// tier-assignment reasoning) — desktop/tablet/mobile values roughly follow
// the pass's 48-64px / 36-48px / reduced-on-small-screens brief. Expressed
// as top-margin-only utility strings (not a `--section-gap-*` CSS var) so
// each rail's `className` prop can select one directly; Tailwind's default
// spacing scale already covers every value needed here.
const GAP_MAJOR = "mt-8 md:mt-12 lg:mt-16"; // entering the flagship section
const GAP_REGULAR = "mt-6 md:mt-8 lg:mt-10"; // ordinary section-to-section
const GAP_COMPACT = "mt-5 md:mt-6 lg:mt-7"; // stepping down into discovery

const matchesQuery = (game, q) => !q || game.title.toLowerCase().includes(q);

const RAIL_SKELETON_COUNT = 6;

// How many whole cards fit in one arrow-click "page" of a rail's visible
// width — the one piece of the scroll math worth pulling out as a pure,
// unit-testable function: get this wrong and arrow clicks land mid-card
// (see SEE ALL/DESKTOP SCROLLING: "no partial random offsets after arrow
// clicks"). Always at least 1, so a card wider than the whole viewport
// still advances by exactly that one card rather than not moving at all.
export function railCardsPerPage(clientWidth, cardWidth, gap) {
  const step = cardWidth + gap;
  if (step <= 0) return 1;
  return Math.max(1, Math.floor(clientWidth / step));
}

// HOTFIX (ragged rows): every rail is capped at a fixed page size — never
// "show everything" — so column count and Load More visibility are both
// driven by a plain item count instead of container/overflow measurement.
const RAIL_PAGE_SIZE = 8;

// HOTFIX (ragged rows): the previous grid (`lg:grid-cols-[repeat(auto-fill,
// minmax(170px,1fr))]`) resolved its actual column count against context
// that could vary per rail, so the same breakpoint could render a
// different tile width in one rail than another. Fixed, literal column
// counts here instead — 4 at tablet, 8 at desktop (>=1280px) — mean every
// rail on the page always divides the exact same container width into the
// exact same number of tracks, so tile width is identical everywhere,
// and a sparse rail simply leaves its remaining columns empty rather than
// stretching its few real tiles wider. Mobile is untouched: still the
// existing horizontal-scroll track (~2.5 tiles visible), never a grid.
const RAIL_TRACK =
  "flex gap-3 overflow-x-auto p-1 pr-4 snap-x snap-proximity [scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
  "md:grid md:grid-cols-4 md:overflow-visible md:snap-none xl:grid-cols-8";

// TITLE TYPOGRAPHY FIX: every Casino Lobby section title (Recently Played,
// Favorites, Tribet Originals, Popular, New Releases, Providers, Live
// Casino, Game Shows) now shares ONE size/weight — previously
// each had its own tier-keyed size (see the removed TIER_TITLE_CLASS map),
// which is exactly what produced "Popular" reading larger than "New
// Releases". This constant is that one shared size, using Popular's former
// "primary" tier value as the reference per the fix's own brief, applied
// uniformly regardless of tier. `shrink-0` (still applied at the call site)
// plus the title's own natural width keeps every title on one line — none
// of these strings are long enough to need an explicit wrap rule.
const SECTION_TITLE_CLASS = "text-base font-bold lg:text-lg";
// Subtitles are explicitly out of scope for this fix (task: "do not
// change section subtitles") — still tier-keyed exactly as before, so a
// quieter section's supporting copy doesn't outweigh its own (now
// standardized) title.
const TIER_SUBTITLE_CLASS = {
  primary: "text-xs text-zinc-400",
  secondary: "text-[11px] text-zinc-500",
  tertiary: "text-[11px] text-zinc-600",
};

// Shared by all three CasinoGameRail render branches (loading/empty/normal)
// so header typography, spacing and the tier system can never drift between
// them — previously each branch hand-rolled its own near-identical
// icon+title row. `onScroll` is only passed by the normal branch (loading
// and empty states never had arrows/See-all, and still don't).
// NAV SPEC §5.2/§5.3 — carousel arrows removed from the header entirely
// (replaced by Load More below the rail — see CasinoGameRail); the header
// now only ever shows title/badge/subtitle on the left and View All
// ("See all") on the right, "level with the title, plain weight."
function RailHeader({ icon, title, subtitle, badge, tier, testId, onSeeAll }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2 sm:mb-5 lg:mb-6">
      <div className="flex min-w-0 items-center gap-2">
        {icon}
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className={cn("shrink-0", SECTION_TITLE_CLASS)}>{title}</h2>
            {/* ONE micro-label component — was its own one-off pill (not
                uppercase, different radius/background than every other
                small top badge in the app). */}
            {badge && <MicroLabel className="min-w-0 truncate">{badge}</MicroLabel>}
          </div>
          {/* Only rendered where it adds real meaning (see call sites in
              LobbyDashboard) — never decoration-only filler copy. */}
          {subtitle && <p className={cn("truncate", TIER_SUBTITLE_CLASS[tier])}>{subtitle}</p>}
        </div>
      </div>
      {onSeeAll && (
        <button
          type="button"
          onClick={onSeeAll}
          data-test-id={testId ? `${testId}-see-all` : undefined}
          // Arena color as text is banned — this appears on every rail
          // across the whole lobby (Popular/New Releases/Live Casino/
          // Game Shows/Favorites), so it was the single most-repeated
          // instance of this violation in the app.
          className="shrink-0 text-xs font-semibold text-[var(--foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          See all
        </button>
      )}
    </div>
  );
}

// The one shared horizontal rail pattern used by every Lobby section
// (Favorites, Recently Played, Originals, Popular, New Releases, Live
// Casino, Game Shows, Providers — see LobbyDashboard below): title (+
// optional trust badge) on the left, "See all" + prev/next arrows on the
// right, a touch-scrollable row of fixed-width tiles below. Self-hides when
// there's nothing to show unless an `emptyState` is supplied (used by
// Recently Played/Favorites, which want to teach the feature rather than
// disappear).
//
// `isLoading` is accepted for API completeness (see the task's suggested
// CasinoGameRailProps shape) but nothing in this app currently triggers it —
// every game source here is a static import, never an async fetch, so
// there's nothing that stays "loading" long enough to show it (same
// reasoning as CasinoGameCardSkeleton's own doc comment). Kept ready rather
// than left unbuilt for the day a real async source exists.
//
// `tier` now only controls subtitle typography (see TIER_SUBTITLE_CLASS
// above) — title typography is the same `SECTION_TITLE_CLASS` for every
// tier, per the title-typography-consistency fix. `tileScale` controls
// card size ("standard" default, "large" for Recently Played/Originals),
// independent of both — the hierarchy pass calls out different sections
// for each (e.g. Popular keeps standard-size cards — a "dense standard
// carousel" per the brief — despite having the same title size as Originals).
export function CasinoGameRail({ title, subtitle, icon, badge, games, tileProps, onSeeAll, testId, sectionId, emptyState, context, isLoading, tier = "secondary", tileScale = "standard", className, visibleCount, onExpand }) {
  // HOTFIX (page size) — every rail shows at most RAIL_PAGE_SIZE items to
  // start; Load More reveals the next RAIL_PAGE_SIZE, capped at the real
  // total. `visibleCount` is lifted to App.jsx's `expandedRails` (same
  // mechanism/reasoning as before: it must live above the component that
  // unmounts/remounts across a game round-trip to survive a real browser
  // Back — see App.jsx's `expandRail`/`restoreLobbyAfterGame`) so it's
  // undefined until the caller has ever loaded more for this rail.
  const tileClass = TILE_SCALE_CLASS[tileScale] ?? TILE_SCALE_CLASS.standard;
  const shown = games.slice(0, visibleCount ?? Math.min(RAIL_PAGE_SIZE, games.length));
  const hasMore = shown.length < games.length;

  if (isLoading) {
    return (
      <section id={sectionId} data-test-id={testId} aria-label={title} className={className}>
        <RailHeader icon={icon} title={title} subtitle={subtitle} tier={tier} />
        <div className="flex gap-3 overflow-hidden pb-1 pl-1 pt-1">
          {Array.from({ length: RAIL_SKELETON_COUNT }, (_, i) => (
            <div key={i} className={tileClass}>
              <CasinoGameCardSkeleton />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (games.length === 0) {
    if (!emptyState) return null;
    return (
      <section id={sectionId} data-test-id={testId} className={className}>
        <RailHeader icon={icon} title={title} subtitle={subtitle} tier={tier} />
        {emptyState}
      </section>
    );
  }

  const loadMore = () => {
    onExpand?.(games.length);
    track("casino_rail_expanded", { railTitle: title });
  };

  return (
    <section id={sectionId} data-test-id={testId} aria-label={title} className={className}>
      <RailHeader
        icon={icon}
        title={title}
        subtitle={subtitle}
        badge={badge}
        tier={tier}
        testId={testId}
        onSeeAll={onSeeAll}
      />
      <div aria-label={`${title} carousel`} className={RAIL_TRACK}>
        {shown.map((game) => (
          <div key={game.favId} className={cn(tileClass, "snap-start md:w-full")}>
            {game.isPlaceholder ? <PlaceholderGameCard game={game} /> : <CasinoGameCard game={game} {...tileProps} context={context} />}
          </div>
        ))}
      </div>
      {/* HOTFIX (page size): hidden entirely once every real item is
          showing — never a disabled/no-op control — driven by the plain
          item-count comparison above, not container overflow. */}
      {hasMore && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            data-test-id={testId ? `${testId}-load-more` : undefined}
            className="text-xs font-semibold text-[var(--foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}

// Shared quiet-placeholder card for any personalized rail's empty state —
// one quiet card, sized exactly like a real rail tile (RAIL_TILE + the same
// aspect-[3/4] tile silhouette), not a large centered panel. Rail's own
// empty branch already omits arrows/See-all, so this only ever needs to
// supply the card itself. Introduced for Recently Played, reused as-is for
// Favorites (see FavoritesEmptyCard below) rather than hand-rolling a second
// near-identical card — same rhythm everywhere a personalized rail is empty.
function RailEmptyCard({ icon: Icon, title, description, actionLabel, actionAria, onAction, testId }) {
  return (
    <div
      data-test-id={testId ? `${testId}-card` : undefined}
      className={cn(RAIL_TILE, "flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-center")}
    >
      <Icon className="size-4 shrink-0 text-zinc-500 opacity-60" aria-hidden="true" />
      <p className="text-[11px] font-semibold leading-snug text-zinc-300">{title}</p>
      <p className="line-clamp-2 text-[10px] leading-snug text-zinc-500">{description}</p>
      <button
        type="button"
        onClick={onAction}
        aria-label={actionAria}
        data-test-id={testId}
        className="-my-1 py-1 text-[10px] font-semibold text-[var(--foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {actionLabel} →
      </button>
    </div>
  );
}

// Recently Played's empty state — copy varies by auth state (never by
// wallet connection, see profileState.js) so a logged-out/session-expired
// visitor understands why history is missing instead of assuming the
// feature is empty/broken.
//
// CASINO LOBBY HIERARCHY CORRECTION: the default Lobby dashboard no longer
// renders this — Recently Played now hides entirely when empty rather than
// showing a placeholder above the fold (see LOBBY HIERARCHY: "do not show a
// large or compact empty placeholder at the top of the default Lobby").
// Retained and exported (not deleted) per that same task's explicit
// instruction to keep the dedicated empty-state component available for a
// destination or context where it remains useful, even though no current
// call site in this file uses it.
//
// RECENTLY PLAYED EMPTY STATE — scenario coverage. This component is pure
// presentation with no new decision logic of its own (it only consumes
// `profileVariant`, already unit-tested end to end in profileState.test.js
// — see "is session-expired whenever authStatus says so" / "falls back to
// deriving from wallet connection only when no auth override is active",
// which is exactly the invariant this component's DEV-only gate below
// depends on), so everything here was verified manually via Playwright
// against the running dev server, driven through the Developer Panel's
// User/Recently Played presets:
//
//  1.  Empty Recently Played renders one placeholder      -> Playwright (recently-played-browse-card, exactly one)
//  2.  Placeholder matches standard game-card layout       -> Playwright (136x181px, same as a RAIL_TILE game tile; left-aligned with the Originals rail below it)
//  3.  Large centered empty panel is removed                -> code review (old <EmptyState> usage replaced entirely)
//  4.  Empty state has no rail arrows                         -> Playwright (0 "Scroll ..." buttons while empty)
//  5.  Empty state has no View all                             -> Playwright (0 recently-played-rail-see-all while empty)
//  6.  Logged-in copy is correct                                 -> Playwright ("No games yet" / "Played games appear here" / "Browse games ->")
//  7.  Logged-out copy is correct                                 -> Playwright ("No recent games" / "Log in to sync your play history" / "Log in ->")
//  8.  Session-expired copy is correct                             -> Playwright (Developer Panel -> User -> Expired) + dist grep (string absent from production build)
//  9.  Browse games action works                                     -> Playwright (calls onBrowseGames, same handler the old empty state used)
//  10. Log in action works                                             -> Playwright (calls onLogin/openFunds, same handler ProfileMenu's Connect wallet/Log in again use; no crash)
//  11. Populated state removes placeholder                              -> Playwright (Developer Panel -> Recently Played -> Populated)
//  12. Populated state renders normal games                              -> Playwright (real <a> tiles + rail arrows return)
//  13. Mobile layout does not overflow                                     -> Playwright (320-1920px, scrollWidth === clientWidth at every width)
//  14. Placeholder is not exposed as a game card                            -> code review (plain <div>, not a Tile/<a href> — structurally can't collide with real game semantics)
//  15. Keyboard focus is visible                                             -> Playwright (real Tab navigation, not .focus() — computed box-shadow ring confirmed non-empty)
// Pure copy selection, extracted so both the compact rail card below AND
// the full Recently Played page (see RecentlyPlayedPage further down) show
// identical auth-aware copy without duplicating the branching — the only
// thing that differs between the two call sites is presentation (a small
// rail-sized card vs a full-page centered EmptyState), never the message.
export function recentlyPlayedEmptyCopy(profileVariant) {
  // Session-expired has no real-world equivalent outside the mock panel
  // (see profileState.js) — gated on `DEV_PANEL_ENABLED` (devPanelFlag.js),
  // same guard ProfileMenu.jsx uses for its own session-expired block.
  const isExpired = DEV_PANEL_ENABLED && profileVariant === PROFILE_VARIANT.SESSION_EXPIRED;
  const isLoggedOut = profileVariant === PROFILE_VARIANT.LOGGED_OUT;

  if (isExpired) {
    return {
      title: "Session expired",
      description: "Log in again to restore your history",
      actionLabel: "Log in again",
      actionAria: "Log in again to restore recently played games",
      needsLogin: true,
      testId: "recently-played-login-again",
    };
  }
  if (isLoggedOut) {
    return {
      title: "No recent games",
      description: "Log in to sync your play history",
      actionLabel: "Log in",
      actionAria: "Log in to view recently played games",
      needsLogin: true,
      testId: "recently-played-login",
    };
  }
  return {
    title: "No games yet",
    description: "Played games appear here",
    actionLabel: "Browse games",
    actionAria: "Browse Casino games",
    needsLogin: false,
    testId: "recently-played-browse",
  };
}

export function RecentlyPlayedEmptyCard({ profileVariant, onBrowseGames, onLogin }) {
  const copy = recentlyPlayedEmptyCopy(profileVariant);
  const { needsLogin, ...cardCopy } = copy;
  return <RailEmptyCard icon={History} {...cardCopy} onAction={needsLogin ? onLogin : onBrowseGames} />;
}

// Favorites rail's empty state — a single, fixed copy set regardless of
// auth state: unlike Recently Played, favoriting itself never requires
// login (see App.jsx's toggleFav — it works fully offline/local-first), so
// there's no "log in to see this" story to tell here, only "you haven't
// curated anything yet." Retained and exported, unused in the default Lobby
// — see RecentlyPlayedEmptyCard's comment above for why.
export function FavoritesEmptyCard({ onBrowseGames }) {
  return (
    <RailEmptyCard
      icon={Heart}
      title="No favorites yet"
      description="Save games to find them quickly"
      actionLabel="Browse games"
      actionAria="Browse Casino games"
      onAction={onBrowseGames}
      testId="favorites-rail-browse"
    />
  );
}

const KIND_CHIPS = [
  { id: "all", label: "All" },
  { id: "onchain", label: "On-chain" },
  { id: "provider", label: "Provider" },
];
const displayLabel = (category) => CATEGORY_LABEL[category] ?? category;

// Casino's one in-page category-navigation bar — non-sticky (the global
// TopBar already consumes a fixed, persistent header slot; stacking a
// second sticky bar below it would push content down and add a second
// scroll-offset to account for, without a page long enough here to justify
// it — see STICKY BEHAVIOR: "non-sticky on Casino Home if the global
// header already consumes significant space").
//
// NAV SPEC §5.5 — every pill click NAVIGATES (changes the URL to
// `/casino/lobby/{category}`, the spec's "home" filter view: promo strip
// and this chip rail both stay mounted, the rails are replaced by a plain
// grid). This supersedes the previous scroll-spy behavior (Lobby pills
// smooth-scrolling to an in-page section, never changing the URL) — see
// lib/casinoLobbyScroll.js, whose scroll-spy hook this component no longer
// calls; that module's pure geometry helpers are unused by this component
// now but kept in place, not deleted. `activeView` distinguishes "home"
// (chip-driven, a pill can be active) from every other view this bar isn't
// rendered on at all (App.jsx's CasinoLobby only mounts this bar for
// "dashboard"/"home" — see the two-route split there).
export function CategoryNav({ selected, activeView, onSelectHomeFilter, onPillActivated }) {
  const activeRef = useRef(null);

  useEffect(() => {
    // Keeps the active pill in view on mobile after a direct link/back-
    // forward navigation or a search selection lands on a category the
    // horizontal scroll position doesn't already show. Deliberately NOT
    // scrollIntoView: that API can reach past this bar's own horizontal
    // scrollbox and nudge an ANCESTOR's vertical scroll too (block:
    // "nearest" is only a hint, not a hard axis lock). Plain scrollLeft
    // arithmetic only ever touches this nav's own horizontal position.
    const btn = activeRef.current;
    const nav = btn?.parentElement;
    if (!btn || !nav) return;
    const btnLeft = btn.offsetLeft;
    const btnRight = btnLeft + btn.offsetWidth;
    const visibleLeft = nav.scrollLeft;
    const visibleRight = visibleLeft + nav.clientWidth;
    if (btnLeft < visibleLeft) nav.scrollLeft = btnLeft;
    else if (btnRight > visibleRight) nav.scrollLeft = btnRight - nav.clientWidth;
  }, [selected, activeView]);

  const handleClick = (category) => {
    onPillActivated?.(category);
    onSelectHomeFilter?.(category.id);
  };

  return (
    <nav aria-label="Casino categories" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CASINO_CATEGORIES.map((category) => {
        const isSelected = category.id === "Lobby"
          ? (selected === "Lobby" && activeView === "dashboard")
          : (selected === category.id && activeView === "home");
        return (
          <button
            key={category.id}
            ref={isSelected ? activeRef : undefined}
            type="button"
            onClick={() => handleClick(category)}
            aria-current={isSelected ? "page" : undefined}
            data-test-id={`category-nav-${category.id.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              // RESKIN (guide §5.3, verbatim call-out): "retire the maroon
              // 'Lobby' active state" — this is that exact row.
              // VISUAL REFRESH: min-h-11/px-4 -> min-h-10/px-3.5 — slightly
              // more compact per the approved mockup, still comfortably
              // above the smallest acceptable touch-target size. Selected
              // state now reuses Sidebar.jsx's own ACTIVE_ACCENT.tab recipe
              // (subtle 12%-tinted brand background + 42%-tinted brand
              // border + --global-cta-hover text) instead of a flat
              // --secondary fill — a real but restrained blue tint, not a
              // bright CTA-style pill, and the same token expression
              // already vetted there for AA contrast on a dark surface.
              "flex min-h-10 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-[color-mix(in_srgb,var(--global-cta)_42%,transparent)] bg-[color-mix(in_srgb,var(--global-cta)_12%,transparent)] text-[var(--global-cta-hover)]"
                // SURFACE HIERARCHY POLISH: inactive pills previously had
                // no fill at all — an outline floating on the page
                // background, doing all its own separation via the
                // border. Adds the same bg-white/[0.03] resting fill
                // already established for rail controls, and reduces the
                // border itself from /10 -> /8 to match ("subtle dark
                // surface + restrained border + readable muted text" per
                // spec) — surfaces now carry more of the separation,
                // borders less. Geometry/padding/text colour unchanged;
                // the active pill (above) is untouched.
                : "border-white/8 bg-white/[0.03] text-zinc-400 hover:text-white"
            )}
          >
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}

// NAV SPEC (§4.1/§4.2) — "Originals" has no CATEGORY_META entry (it's
// sourced straight from the onchain game list, never a `tags` filter — see
// LobbyDashboard below), so it needs its own small resolution layer rather
// than assuming every one of the spec's 5 tag categories has a real
// CATEGORY_META row. `TAG_CATEGORY_DESCRIPTIONS` supplies the one missing
// description (Originals) that CATEGORY_META doesn't carry, reusing the
// exact subtitle its Lobby rail already shows so the two surfaces agree.
const TAG_CATEGORY_DESCRIPTIONS = { Originals: "On-chain games, provably fair and settled by BetSwirl" };
function isTagCategory(category) {
  return category === "Originals" || Boolean(CATEGORY_META[category]);
}
function tagCategoryDescription(category) {
  return CATEGORY_META[category]?.description ?? TAG_CATEGORY_DESCRIPTIONS[category] ?? null;
}
function gamesForTagCategory(category) {
  if (category === "Originals") return ONCHAIN;
  const tag = CATEGORY_META[category]?.tag;
  return tag ? ALL_GAMES.filter((g) => g.tags?.includes(tag)) : [];
}

// NAV SPEC §7 DEFAULT sort options are Popular/Newest/Most Players/
// Featured — this catalog has no live player-count field and no editorial
// "featured" flag anywhere in the game data (confirmed: BETSWIRL_GAMES/
// PROVIDER_GAMES carry only key/title/image/tags(/playable/control) or
// (/src/badge)), so those two are omitted rather than inventing production
// data. "Popular" is the catalog's own authored order (a no-op sort, not a
// fabricated score); "Newest" is a real, derived stable-partition on the
// same "new" tag New Releases itself is built from — tagged games first,
// in their existing relative order, everything else after.
const SORT_OPTIONS = [
  { id: "popular", label: "Popular" },
  { id: "newest", label: "Newest" },
];
function sortGames(games, sortId) {
  if (sortId !== "newest") return games;
  return [...games.filter((g) => g.tags?.includes("new")), ...games.filter((g) => !g.tags?.includes("new"))];
}

// NAV SPEC §7: "Both are labelled dropdowns, not icon-only." One shared
// control for Filter and Sort so the two never drift out of visual sync.
function LabeledSelect({ label, value, onChange, options, testId }) {
  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-test-id={testId}
        className="rounded-md border border-white/8 bg-white/[0.03] px-2 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}
function SortSelect({ value, onChange }) {
  return <LabeledSelect label="Sort" value={value} onChange={onChange} options={SORT_OPTIONS} testId="category-sort" />;
}
function FilterSelect({ value, onChange }) {
  return <LabeledSelect label="Filter" value={value} onChange={onChange} options={KIND_CHIPS} testId="category-filter" />;
}

// The DESTINATION route (spec §4.1: `/casino/category/{category}`) — hero
// + filter + sort + grid, no promo strip, no chip rail (App.jsx's
// CasinoLobby renders a standalone search bar above this instead). Never
// deduped against "Your games" — a full category listing should always be
// the complete, real list.
//
// MOTION QUALITY PASS: this (and FavoritesPage/RecentlyPlayedPage below)
// used to carry their own `animate-fade-in-up` on the outer <section>,
// removed since it only ever fired on TOP of the (also since-removed)
// outer wrapper's own copy when switching between Lobby/a category/
// Favorites/Recently Played — different pages, but still "routine category
// browsing within Casino", not a genuine "arrived at Casino" moment. A
// real arena switch's entrance is now the shared ArenaContentStage's
// opacity-only crossfade (see App.jsx/ArenaContentStage.jsx) — an
// in-Casino category change like this one intentionally has no transition
// of its own at all.
function CategoryDestinationPage({ category, tileProps, onBrowseGames }) {
  const [chip, setChip] = useState("all");
  const [sort, setSort] = useState("popular");
  const description = tagCategoryDescription(category);
  const games = sortGames(gamesForTagCategory(category), sort).filter((g) => chip === "all" || g.kind === chip);

  // CASINO PLACEHOLDER FIXTURES — the "See all" destination for a Lobby
  // rail (Popular/New/Live Casino/Game Shows/Originals) gets the same
  // fixture logic, real games first, per the task's "See All pages"
  // requirement. Only at `chip === "all"` — a placeholder has no real
  // on-chain/provider kind of its own, so narrowing to one specific kind
  // reasonably shows only real games of that kind. Gated on the SAME Dev
  // Panel flag as the Lobby rails (see LobbyDashboard below); Favorites/
  // Recently Played are not tag categories, so they can never reach this
  // function.
  const mock = useDevMockState();
  const placeholdersEnabled = DEV_PANEL_ENABLED && mock.casinoPlaceholderRails;
  // SCROLL/OVERFLOW TESTING PASS: flat PLACEHOLDER_TARGET_TOTAL regardless
  // of real count — this flag is dev/testing-only (off by default), so a
  // generous, consistent wall of fake cards on every category is exactly
  // the point now, not something a real visitor could mistake for genuine
  // sparse inventory (see PLACEHOLDER_TARGET_TOTAL's own comment).
  const displayGames = placeholdersEnabled && chip === "all"
    ? [...games, ...createPlaceholderGames({
        category: category.toLowerCase(),
        surface: "page",
        existingCount: games.length,
        targetTotal: games.length > 0 ? PLACEHOLDER_TARGET_TOTAL : 0,
      })]
    : games;

  // NAV SPEC §7 hero: "title left · oversized category icon right."
  const CategoryIcon = CASINO_CATEGORIES.find((c) => c.id === category)?.icon;

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">{displayLabel(category)}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {CategoryIcon && <CategoryIcon className="size-8 shrink-0 text-zinc-600" aria-hidden="true" />}
      </div>

      {/* NAV SPEC §7: "Filter left, sort right, same row, directly under
          search and directly above the grid. Both are labelled dropdowns,
          not icon-only." On /casino/category/tribet-originals, the filter
          is hidden — every result is already onchain, so the control would
          have one meaningless option — leaving Sort alone, still right-
          aligned in the same row position. */}
      <div className="mb-4 mt-3 flex items-center justify-between gap-3">
        {category !== "Originals" ? <FilterSelect value={chip} onChange={setChip} /> : <span />}
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {displayGames.length ? (
        <div className={GRID}>
          {displayGames.map((game) => (
            game.isPlaceholder
              ? <PlaceholderGameCard key={game.favId} game={game} />
              : <CasinoGameCard key={game.favId} game={game} {...tileProps} context="category" />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Gamepad2 className="size-5 text-zinc-500" aria-hidden="true" />}
          title={`No ${displayLabel(category).toLowerCase()} games yet`}
          cta={<BrowseGamesButton onClick={onBrowseGames} />}
        />
      )}
    </section>
  );
}

// The "HOME" filter view (spec §4.1: `/casino/lobby/{category}`) — entered
// from the chip rail. App.jsx's CasinoLobby keeps the promo strip and chip
// rail mounted above this (unlike the destination route above); this
// component supplies only the grid that replaces the multi-row dashboard —
// no hero, no filter chips, no sort, per the spec's own chrome table.
function CategoryHomeGrid({ category, tileProps }) {
  const games = gamesForTagCategory(category);
  const mock = useDevMockState();
  const placeholdersEnabled = DEV_PANEL_ENABLED && mock.casinoPlaceholderRails;
  const displayGames = placeholdersEnabled
    ? [...games, ...createPlaceholderGames({ category: category.toLowerCase(), surface: "rail", existingCount: games.length, targetTotal: games.length > 0 ? PLACEHOLDER_TARGET_TOTAL : 0 })]
    : games;

  return displayGames.length ? (
    <div className={GRID}>
      {displayGames.map((game) => (
        game.isPlaceholder
          ? <PlaceholderGameCard key={game.favId} game={game} />
          : <CasinoGameCard key={game.favId} game={game} {...tileProps} context="home" />
      ))}
    </div>
  ) : (
    <EmptyState
      icon={<Gamepad2 className="size-5 text-zinc-500" aria-hidden="true" />}
      title={`No ${displayLabel(category).toLowerCase()} games yet`}
    />
  );
}

// Provider route family (spec §6.2/§6.3). Landscape tiles — visibly
// distinct from the portrait (aspect-[3/4]) game tile — since the shape
// difference is what tells the user "this navigates to a filter, not a
// game" at a glance, per the spec's own reasoning. No per-provider logo
// asset exists in this app, so every tile uses the same neutral icon
// rather than a fabricated brand mark (same rule this catalog already
// applies everywhere else real asset data doesn't exist).
function ProvidersIndexPage({ onSelectProvider }) {
  return (
    <section>
      <h1 className="text-lg font-bold">Providers</h1>
      <p className="mt-1 text-sm text-muted-foreground">Browse games by studio.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {CASINO_PROVIDERS.map((provider) => {
          const count = ALL_GAMES.filter((g) => g.providerId === provider.id).length;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectProvider?.(provider.id)}
              aria-label={`Browse ${provider.name} games`}
              data-test-id={`provider-tile-${provider.id}`}
              className="flex aspect-[16/9] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-zinc-900 text-center transition hover:border-[var(--global-cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Building2 className="size-6 text-zinc-500" aria-hidden="true" />
              <span className="text-sm font-bold text-white">{provider.name}</span>
              <span className="text-[11px] text-zinc-500">{count} game{count === 1 ? "" : "s"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ProviderDetailPage({ providerSlug, tileProps }) {
  const provider = CASINO_PROVIDERS.find((p) => p.id === providerSlug);
  const [sort, setSort] = useState("popular");
  const games = sortGames(provider ? ALL_GAMES.filter((g) => g.providerId === provider.id) : [], sort);

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold">{provider?.name ?? "Provider"}</h1>
      </div>
      {/* NAV SPEC §6.4: Sort on its own row, directly above the grid — same
          row position CategoryDestinationPage uses, minus Filter, which is
          deliberately absent here (every result already shares this one
          provider, so the control would have exactly one meaningful
          option). */}
      {games.length > 0 && (
        <div className="mb-4 mt-3 flex items-center justify-end gap-3">
          <SortSelect value={sort} onChange={setSort} />
        </div>
      )}
      {games.length ? (
        <div className={GRID}>
          {games.map((game) => <CasinoGameCard key={game.favId} game={game} {...tileProps} context="category" />)}
        </div>
      ) : (
        <EmptyState icon={<Building2 className="size-5 text-zinc-500" aria-hidden="true" />} title="No games from this provider yet" />
      )}
    </section>
  );
}

function BrowseGamesButton({ onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-test-id={testId}
      className="rounded-lg bg-[var(--global-cta)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      Browse games
    </button>
  );
}

function FavoritesPage({ favorites, q, query, tileProps, onBrowseGames }) {
  // Fires once per navigation into this page (mount), not per re-render —
  // toggling a favorite while already here doesn't re-fire it.
  useEffect(() => { track("casino_favorites_opened", {}); }, []);
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <Heart className="size-5 fill-[var(--global-cta-hover)] text-[var(--global-cta-hover)]" />
        <h1 className="text-lg font-bold">Favorites</h1>
        {favorites.length > 0 && (
          <MicroLabel>
            {favorites.length} game{favorites.length === 1 ? "" : "s"}
          </MicroLabel>
        )}
      </div>
      {favorites.length ? (
        <div className={GRID}>
          {favorites.map((game) => <CasinoGameCard key={game.favId} game={game} {...tileProps} context="favorites" />)}
        </div>
      ) : q ? (
        <EmptyState
          icon={<Heart className="size-5 text-zinc-500" aria-hidden="true" />}
          title={`No favorites match "${query}"`}
          cta={<BrowseGamesButton onClick={onBrowseGames} />}
        />
      ) : (
        <EmptyState
          icon={<Heart className="size-5 fill-[var(--global-cta-hover)] text-[var(--global-cta-hover)]" aria-hidden="true" />}
          title="No favorite games yet"
          description="Tap the heart on any game to save it here."
          cta={<BrowseGamesButton onClick={onBrowseGames} testId="favorites-browse-games" />}
        />
      )}
    </section>
  );
}

// Recently Played's dedicated destination — the Sidebar/mobile-menu item
// needs a real page to navigate to (not just the Lobby's conditional rail,
// which hides entirely once empty — see CASINO SIDEBAR RESTORATION: "do not
// remove it simply because Lobby hides the empty row... Navigation
// availability and Lobby-row visibility are separate concerns"). Structured
// identically to FavoritesPage on purpose: same header shape, same shared
// grid, same game-card component, same EmptyState primitive — the only new
// thing here is recentlyPlayedEmptyCopy's auth-aware copy (shared with the
// Lobby rail's own compact empty card, see that function's own comment).
function RecentlyPlayedPage({ recentGames, q, query, tileProps, onBrowseGames, profileVariant, onLogin }) {
  useEffect(() => { track("casino_recently_played_opened", {}); }, []);
  const copy = recentlyPlayedEmptyCopy(profileVariant);
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <History className="size-5 text-zinc-300" />
        <h1 className="text-lg font-bold">Recently Played</h1>
        {recentGames.length > 0 && (
          <MicroLabel>
            {recentGames.length} game{recentGames.length === 1 ? "" : "s"}
          </MicroLabel>
        )}
      </div>
      {recentGames.length ? (
        <div className={GRID}>
          {recentGames.map((game) => <CasinoGameCard key={game.favId} game={game} {...tileProps} context="recent" />)}
        </div>
      ) : q ? (
        <EmptyState
          icon={<History className="size-5 text-zinc-500" aria-hidden="true" />}
          title={`No recently played games match "${query}"`}
          cta={<BrowseGamesButton onClick={onBrowseGames} />}
        />
      ) : (
        <EmptyState
          icon={<History className="size-5 text-zinc-500" aria-hidden="true" />}
          title={copy.title}
          description={copy.description}
          cta={
            <BrowseGamesButton
              onClick={copy.needsLogin ? onLogin : onBrowseGames}
              testId={`${copy.testId}-page`}
            />
          }
        />
      )}
    </section>
  );
}

// Casino catalog. Four destinations share this one component:
//  - category === "Favorites" → the Favorites page.
//  - category === "Recently Played" → the Recently Played page.
//  - category is a tag category (Popular/Slots/Live Casino/Game Shows/New)
//    → its own page: title, chips, full grid, never deduped.
//  - anything else (Lobby, default) → the lobby dashboard: Recently Played
//    (conditional) → Originals (always) → Popular → New Releases →
//    Providers → Live Casino → Game Shows. Favorites is never a Lobby row —
//    it's a dedicated sidebar destination (see FAVORITES LOBBY REMOVAL in
//    LobbyDashboard below).
// `recentIds` (most-recent-first favIds) and favorites are two distinct
// personalized rails, not a merged "Your games" umbrella — they answer
// different questions (what you saved vs. what you actually played) and the
// same game legitimately appearing in both is fine. `query` (from the
// search box above the catalog) filters every row/page by title.
export function CasinoCatalog({ category, view = "dashboard", providerSlug, query, onLaunch, onLaunchProvider, isFav, onFav, recentIds, onBrowseGames, onSelectCategory, onSelectProvider, expandedRails, onExpandRail, profileVariant, onLogin }) {
  const tileProps = { onLaunchOnchain: onLaunch, onLaunchProvider, isFav, onFav };
  const q = query?.trim().toLowerCase() ?? "";
  const favorites = (isFav ? ALL_GAMES.filter((g) => isFav(g)) : []).filter((g) => matchesQuery(g, q));
  const recentGames = (recentIds ?? [])
    .map((id) => ALL_GAMES.find((g) => g.favId === id))
    .filter(Boolean)
    .filter((g) => matchesQuery(g, q));

  // PROVIDER ROUTE FAMILY (spec §6.2) — checked before category branches
  // since neither view carries a real content category.
  if (view === "providers") {
    return <ProvidersIndexPage onSelectProvider={onSelectProvider} />;
  }
  if (view === "provider") {
    return <ProviderDetailPage providerSlug={providerSlug} tileProps={tileProps} />;
  }

  if (category === "Favorites") {
    return <FavoritesPage favorites={favorites} q={q} query={query} tileProps={tileProps} onBrowseGames={onBrowseGames} />;
  }

  if (category === "Recently Played") {
    return (
      <RecentlyPlayedPage
        recentGames={recentGames} q={q} query={query} tileProps={tileProps}
        onBrowseGames={onBrowseGames} profileVariant={profileVariant} onLogin={onLogin}
      />
    );
  }

  // TWO-ROUTE SPLIT (spec §4.1) — the same tag category resolves to two
  // different content components depending on how it was reached: the
  // chip rail's "home" filter (grid only, promo+chips stay mounted above
  // this in App.jsx's CasinoLobby) vs. the sidebar/rail "See all"
  // destination (hero+filter+sort+grid, no promo/chips above it).
  if (isTagCategory(category) && view === "home") {
    return <CategoryHomeGrid category={category} tileProps={tileProps} />;
  }
  if (isTagCategory(category)) {
    return <CategoryDestinationPage category={category} tileProps={tileProps} onBrowseGames={onBrowseGames} />;
  }

  return (
    <LobbyDashboard
      category={category} query={query} q={q} recentGames={recentGames}
      tileProps={tileProps} onBrowseGames={onBrowseGames} onSelectCategory={onSelectCategory}
      onSelectProvider={onSelectProvider}
      expandedRails={expandedRails} onExpandRail={onExpandRail}
    />
  );
}

// RE-ENABLED (previously dormant behind the disabled "Providers" entry in
// lib/casinoCategories.js — see that entry's own comment on why). The
// provider tile itself is the entry point to /casino/provider/{slug}, not
// a scroll target — there is exactly one Providers rail on the Lobby, not
// one rail per provider (see LobbyDashboard below), so a click navigates
// via `onSelectProvider` rather than `scrollToRail`. Landscape (~2:1)
// tiles, deliberately a different shape than the portrait (aspect-[3/4])
// game tile — the shape itself is what tells a player "this leads to a
// filtered view, not a game" (same reasoning ProvidersIndexPage already
// uses for its own landscape tiles). No real per-provider logo assets
// exist in this app, so every tile uses the same neutral icon rather than
// a fabricated brand mark, same reasoning as everywhere else in this app.
const PROVIDER_TILE = "w-[220px] shrink-0";

// SCROLL/OVERFLOW TESTING PASS: real providers first, then (dev/testing-
// only, off by default) a long list of realistic-but-fake studio names —
// same "real content first, placeholders after" ordering
// createPlaceholderGames' callers already use for game rails. A placeholder
// tile never navigates (there's no real /casino/provider/{slug} page behind
// a fake name) — it shows the same kind of toast PlaceholderGameCard does,
// via `data-placeholder="true"` marking it for tests exactly like a
// placeholder game tile.
function ProviderTiles({ onSelectProvider, placeholdersEnabled }) {
  const placeholderProviders = placeholdersEnabled ? createPlaceholderProviders() : [];
  return (
    <section id="casino-section-providers" data-test-id="providers-rail" aria-label="Providers">
      <div className="mb-4 flex items-center gap-2">
        <h2 className={SECTION_TITLE_CLASS}>Providers</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto p-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CASINO_PROVIDERS.map((provider) => {
          const count = ALL_GAMES.filter((g) => g.providerId === provider.id).length;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => onSelectProvider?.(provider.id)}
              aria-label={`Browse ${provider.name} games`}
              data-test-id={`provider-tile-${provider.id}`}
              className={cn(
                PROVIDER_TILE,
                "flex aspect-[2/1] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-zinc-900 px-3 text-center transition hover:border-[var(--global-cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Building2 className="size-5 text-zinc-500" aria-hidden="true" />
              <span className="text-sm font-bold text-white">{provider.name}</span>
              <span className="text-[11px] text-zinc-500">{count} game{count === 1 ? "" : "s"}</span>
            </button>
          );
        })}
        {placeholderProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={notifyPlaceholderProviderClicked}
            data-placeholder="true"
            aria-label={`${provider.name} — UI testing only, not a real provider`}
            data-test-id={`provider-tile-${provider.id}`}
            className={cn(
              PROVIDER_TILE,
              "flex aspect-[2/1] flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 text-center transition hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            )}
          >
            <Building2 className="size-5 text-zinc-600" aria-hidden="true" />
            <span className="text-sm font-bold text-zinc-300">{provider.name}</span>
            <span className="text-[11px] text-zinc-600">UI Test Fixture</span>
          </button>
        ))}
      </div>
    </section>
  );
}

// Its own component (not just a branch inside CasinoCatalog) so its
// view-tracking effect is a plain, unconditionally-called hook — CasinoCatalog
// itself returns early for Favorites/CategoryPage before this would ever be
// reached, and hooks can't live after an early return in the same component.
function LobbyDashboard({ category, query, q, recentGames, tileProps, onBrowseGames, onSelectCategory, onSelectProvider, expandedRails, onExpandRail }) {
  // CASINO PLACEHOLDER FIXTURES — read unconditionally, before any early
  // return below (this hook must run every render, in the same order,
  // regardless of `isEmpty`). Only actually used further down, past the
  // early-return, to build the `games=` arrays passed to non-contextual
  // rails — see the `withPlaceholders` helper near `seeAll` below.
  const mock = useDevMockState();
  const placeholdersEnabled = DEV_PANEL_ENABLED && mock.casinoPlaceholderRails && !q;

  const onchain = ONCHAIN.filter((g) => matchesQuery(g, q));
  const byTag = (tag) => ALL_GAMES.filter((g) => g.tags?.includes(tag)).filter((g) => matchesQuery(g, q));

  // Discovery rails dedup sequentially against each other (and against the
  // always-shown Originals row) so the same game never repeats across
  // adjacent "what's hot" sections — e.g. Roulette is tagged both "popular"
  // and "live-casino", so it now only ever shows once. Favorites/Recently
  // Played are exempt: overlap between a personalized rail and a discovery
  // rail is expected (a favorited game still belongs in Popular).
  const seen = new Set(onchain.map((g) => g.favId));
  const popularCandidates = byTag("popular");
  const newReleasesCandidates = byTag("new");
  const liveCasinoCandidates = byTag("live-casino");
  const gameShowsCandidates = byTag("game-shows");
  const popularRow = takeUnclaimed(popularCandidates, seen);
  const newReleasesRow = takeUnclaimed(newReleasesCandidates, seen);
  const liveCasinoRow = takeUnclaimed(liveCasinoCandidates, seen);
  const gameShowsRow = takeUnclaimed(gameShowsCandidates, seen);
  // See all is only worth showing when its destination (the category's own
  // full, undeduped page) actually reveals more than this rail already
  // does — true whenever dedup removed anything. A rail that happens to
  // equal its own category's complete list has nothing further to reveal
  // (see SEE ALL: "there are more items than shown in the rail").
  const popularHasMore = popularRow.length < popularCandidates.length;
  const newReleasesHasMore = newReleasesRow.length < newReleasesCandidates.length;
  const liveCasinoHasMore = liveCasinoRow.length < liveCasinoCandidates.length;
  const gameShowsHasMore = gameShowsRow.length < gameShowsCandidates.length;

  const isEmpty = q && !recentGames.length && !onchain.length
    && !popularRow.length && !newReleasesRow.length && !liveCasinoRow.length && !gameShowsRow.length;

  // Personalized rows only count as "visible" once populated — they no
  // longer render an empty placeholder that would otherwise count as shown
  // (see LOBBY HIERARCHY: "personalized rows are conditional"). Providers
  // is excluded from `q` results (the tile row is a set of navigation
  // entry points, not search-filterable game content). Favorites is a
  // dedicated sidebar destination now, never a Lobby section — see FAVORITES
  // LOBBY REMOVAL below.
  const visibleSections = [
    recentGames.length > 0 && "recently-played",
    "originals",
    popularRow.length > 0 && "popular",
    newReleasesRow.length > 0 && "new-releases",
    !q && "providers",
    liveCasinoRow.length > 0 && "live-casino",
    gameShowsRow.length > 0 && "game-shows",
  ].filter(Boolean).join(",");
  useEffect(() => {
    if (!isEmpty) track("casino_lobby_section_viewed", { sections: visibleSections.split(",") });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, q, visibleSections, isEmpty]);

  if (isEmpty) {
    return (
      <EmptyState
        icon={<Gamepad2 className="size-5 text-zinc-500" aria-hidden="true" />}
        title={`No games match "${query}"`}
        cta={onBrowseGames ? <BrowseGamesButton onClick={onBrowseGames} /> : undefined}
      />
    );
  }

  const seeAll = (target) => () => {
    onSelectCategory?.(target);
    track("casino_view_all_selected", { sourceSection: target.toLowerCase().replace(/\s+/g, "-") });
  };

  // CASINO PLACEHOLDER FIXTURES — appended only at the JSX `games=` prop
  // below, never mixed into onchain/popularRow/etc. themselves, so every
  // calculation above (hasMore, isEmpty, visibleSections, analytics) keeps
  // reasoning about the real catalog only. `placeholdersEnabled` (computed
  // at the top of this component, before the early return above) already
  // accounts for `!q` — this Lobby view re-filters its own rails by the
  // same search query the top search box drives (see `byTag`/
  // `matchesQuery` above), so an active search must never grow
  // placeholders back in; "Search: placeholders excluded" applies here
  // too, not just to the separate search dropdown. Recently Played and
  // Favorites are simply never passed through this helper at all.
  // SCROLL/OVERFLOW TESTING PASS: flat PLACEHOLDER_TARGET_TOTAL regardless
  // of real count (see that constant's own comment) — every rail gets
  // topped up to the same generous total, guaranteeing it clears the
  // 8-item page size (RAIL_PAGE_SIZE) with room for multiple Load More
  // clicks, dev/testing-only. A section with 0 real games still gets
  // `targetTotal: 0` -> 0 placeholders, so it self-hides via CasinoGameRail's
  // own empty check rather than rendering a full fake row out of nothing.
  const withPlaceholders = (realGames, placeholderCategory) =>
    placeholdersEnabled
      ? [
          ...realGames,
          ...createPlaceholderGames({
            category: placeholderCategory,
            surface: "rail",
            existingCount: realGames.length,
            targetTotal: realGames.length > 0 ? PLACEHOLDER_TARGET_TOTAL : 0,
          }),
        ]
      : realGames;

  // FAVORITES LOBBY REMOVAL — Favorites is no longer a Lobby row at all
  // (was a conditional rail here, inserted the moment the first game was
  // favorited — that insertion/removal shifted every section below it,
  // and duplicated Recently Played's "quick return" role with a second,
  // state-dependent section). Favorites now lives exclusively as a
  // dedicated sidebar destination (see App.jsx's sidebar builder /
  // CASINO_PERSONAL_DESTINATIONS) — the Lobby's own row order is now
  // static regardless of favorite state: Recently Played (conditional,
  // hidden when empty), then the stable discovery base every player sees
  // regardless of history: Tribet Originals, Popular, New Releases,
  // Providers, Live Casino, Game Shows. Slots/Table Games are omitted —
  // no supported inventory exists for either (see FINAL RESPONSE:
  // Slots-inventory findings).
  //
  // LOBBY HIERARCHY PASS: replaced the previous single `space-y-8` (one
  // identical gap between every section, regardless of importance) with a
  // per-section top margin so the page reads in three tiers instead of one
  // flat wall — three tier assignments below map directly onto the pass's
  // own worked examples ("trending or popular games, Tribet Originals, live
  // casino" -> primary; "Recently Played, Favourites, New Releases, Game
  // Shows" -> secondary; "providers, collections" -> tertiary, which is
  // the Providers row's role here, the one stable "browse by studio"
  // catch-all — see ProviderTiles' own comment above). GAP_MAJOR appears
  // exactly once, right before Originals, the one section this pass calls
  // the flagship; every other boundary is GAP_REGULAR; GAP_COMPACT appears
  // once, stepping down into the lowest-priority discovery rail at the very
  // end. Recently Played (first on the page) carries no top margin of its
  // own.
  return (
    <div>
      <CasinoGameRail
        testId="recently-played-rail"
        visibleCount={expandedRails?.get("recently-played-rail")}
        onExpand={(total) => onExpandRail?.("recently-played-rail", total)}
        title="Recently played"
        subtitle="Continue where you left off"
        tier="secondary"
        tileScale="large"
        games={recentGames}
        tileProps={tileProps}
        context="recent"
      />

      <CasinoGameRail
        sectionId="casino-section-originals"
        testId="originals-rail"
        visibleCount={expandedRails?.get("originals-rail")}
        onExpand={(total) => onExpandRail?.("originals-rail", total)}
        title={CATEGORY_LABEL.Originals}
        subtitle="On-chain games, provably fair and settled by BetSwirl"
        badge="Provably fair"
        tier="primary"
        tileScale="large"
        className={GAP_MAJOR}
        games={withPlaceholders(onchain, "originals")}
        tileProps={tileProps}
        context="home"
      />

      <CasinoGameRail
        sectionId="casino-section-popular"
        testId="popular-rail"
        visibleCount={expandedRails?.get("popular-rail")}
        onExpand={(total) => onExpandRail?.("popular-rail", total)}
        title="Popular"
        subtitle="Based on recent player activity"
        tier="primary"
        className={GAP_REGULAR}
        games={withPlaceholders(popularRow, "popular")}
        tileProps={tileProps}
        context="home"
        onSeeAll={popularHasMore ? seeAll("Popular") : undefined}
      />
      <CasinoGameRail
        sectionId="casino-section-new-releases"
        testId="new-releases-rail"
        visibleCount={expandedRails?.get("new-releases-rail")}
        onExpand={(total) => onExpandRail?.("new-releases-rail", total)}
        title="New Releases"
        subtitle="Newly added to the casino"
        tier="secondary"
        className={GAP_REGULAR}
        games={withPlaceholders(newReleasesRow, "new")}
        tileProps={tileProps}
        context="home"
        onSeeAll={newReleasesHasMore ? seeAll("New") : undefined}
      />
      <div className={GAP_REGULAR}>
        <ProviderTiles onSelectProvider={onSelectProvider} placeholdersEnabled={placeholdersEnabled} />
      </div>
      <CasinoGameRail
        sectionId="casino-section-live-casino"
        testId="live-casino-rail"
        visibleCount={expandedRails?.get("live-casino-rail")}
        onExpand={(total) => onExpandRail?.("live-casino-rail", total)}
        title="Live Casino"
        tier="primary"
        className={GAP_REGULAR}
        games={withPlaceholders(liveCasinoRow, "live-casino")}
        tileProps={tileProps}
        context="home"
        onSeeAll={liveCasinoHasMore ? seeAll("Live Casino") : undefined}
      />
      <CasinoGameRail
        sectionId="casino-section-game-shows"
        testId="game-shows-rail"
        visibleCount={expandedRails?.get("game-shows-rail")}
        onExpand={(total) => onExpandRail?.("game-shows-rail", total)}
        title="Game Shows"
        tier="secondary"
        className={GAP_COMPACT}
        games={withPlaceholders(gameShowsRow, "game-shows")}
        tileProps={tileProps}
        context="home"
        onSeeAll={gameShowsHasMore ? seeAll("Game Shows") : undefined}
      />
    </div>
  );
}
