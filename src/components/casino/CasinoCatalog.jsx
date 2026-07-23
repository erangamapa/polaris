import { useState, useEffect, useRef } from "react";
import { Star, History, ChevronLeft, ChevronRight, Gamepad2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";
import { BETSWIRL_GAMES } from "@/web3/useBetSwirl";
import { PROVIDER_GAMES } from "./ProviderGame";
import { EmptyState } from "@/components/ui/empty-state";
import { takeUnclaimed } from "@/lib/casinoDedup";
import { PROFILE_VARIANT } from "@/lib/profileState";
import { DEV_PANEL_ENABLED } from "@/lib/devPanelFlag";
import { CATEGORY_META, CASINO_CATEGORIES, CATEGORY_LABEL, CASINO_PROVIDERS, scrollToRail } from "@/lib/casinoCategories";
import { activateLobbyPill, useLobbyActiveSection, restoreSectionFromHash } from "@/lib/casinoLobbyScroll";

// Onchain games carry no provider field of their own (BETSWIRL_GAMES has
// none — see useBetSwirl.js); provider-kind games carry an identical
// "TriBet Studio" `badge` on every entry. Two real studios exist in this
// catalog today, not eleven — deriving anything more granular would be
// inventing providers that don't exist. Lives here (not in casinoSearch.js,
// which already imports FROM this file) so both CasinoGameCard and search
// can use the exact same label without a circular import.
export const gameProviderName = (game) => (game.kind === "onchain" ? "BetSwirl" : (game.badge ?? "TriBet Studio"));

// Shared broken-image detection — one `onError` state machine, reused by
// every place a game's artwork renders (full cards here, the compact search
// result row in CasinoSearch.jsx) so "what counts as a fallback" never
// diverges between surfaces.
export function useBrokenImage() {
  const [broken, setBroken] = useState(false);
  return { broken, onError: () => setBroken(true) };
}

// Sparkle burst angles (degrees) fired once when a game is favorited.
const SPARKS = [0, 60, 120, 180, 240, 300];

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
// on (cards here, the compact search result row in CasinoSearch.jsx): pop
// animation on toggle + a one-shot sparkle burst on add, stops propagation
// so favoriting never launches the game, aria-pressed + a game-name label.
// `className` is the only visual thing that varies by context — this
// component owns the icon/interaction, callers own their own chrome (an
// absolute overlay pinned to artwork here, a plain flex sibling in a search
// row). `tabIndex` defaults to a real, independent tab stop (correct for a
// card sitting in a grid/rail); search overrides it to -1, since search
// results are navigated by ArrowUp/Down within one combobox listbox, and a
// second real tab stop per row would break that linear keyboard model.
export function FavStar({ faved, onToggle, title, className, tabIndex = 0, onMouseDown, ...rest }) {
  const [burst, setBurst] = useState(0);

  const handle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!faved) setBurst((b) => b + 1); // burst only when adding
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
      className={cn("group/fav z-20 grid size-11 cursor-pointer place-items-center rounded-md text-white/90 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50", className)}
    >
      <span className="relative grid place-items-center">
        {burst > 0 && (
          <span key={burst} className="pointer-events-none absolute inset-0" aria-hidden>
            {SPARKS.map((a, i) => (
              <span
                key={i}
                className="fav-spark absolute size-1 rounded-full bg-amber-300"
                style={{ left: "50%", top: "50%", marginLeft: -2, marginTop: -2, "--ang": `${a}deg` }}
              />
            ))}
          </span>
        )}
        <Star
          key={`${faved}-${burst}`}
          className={`size-4 transition-transform group-hover/fav:scale-125 ${faved ? "fav-pop fill-amber-400 text-amber-400" : ""}`}
        />
      </span>
    </span>
  );
}
// Chrome for FavStar when it overlays game artwork (every card below) —
// search's compact row supplies its own (see CasinoSearch.jsx's GameRow).
const FAV_STAR_OVERLAY = "absolute right-1 top-1 bg-black/40 hover:bg-black/70";

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

  return (
    <div
      className={cn(
        "group relative flex aspect-[3/4] flex-col overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition",
        playable && "hover:ring-[var(--casino-primary)]"
      )}
    >
      <a
        href={gameHref(game)}
        onClick={playable ? linkClick(onLaunch, game, context) : (e) => e.preventDefault()}
        aria-disabled={!playable || undefined}
        data-test-id={`game-card-${testKey}`}
        aria-label={playable ? `Play ${game.title}` : `${game.title} — ${statusLabel}`}
        className={cn(
          "absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !playable && "pointer-events-none cursor-not-allowed"
        )}
      >
        {broken ? (
          <div className="grid h-full w-full place-items-center bg-zinc-800">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 pt-6">
          <div className="line-clamp-2 text-xs font-bold leading-snug text-white">{game.title}</div>
          {showProvider && <div className="truncate text-[10px] leading-snug text-zinc-400">{gameProviderName(game)}</div>}
        </div>
      </a>
      {statusLabel && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white"
        >
          {statusLabel}
        </span>
      )}
      {/* Favorite is hidden (not just disabled) on an unavailable card — a
          consistent single rule rather than the previous unconditional
          render, which let you favorite a game you can't play yet. */}
      {showFavorite && onFav && playable && (
        <FavStar faved={faved} onToggle={() => onFav(game)} title={game.title} className={FAV_STAR_OVERLAY} />
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
      className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-900 ring-1 ring-white/5 motion-reduce:animate-none"
    >
      <div className="flex h-full flex-col justify-end gap-1.5 p-2">
        <div className="h-3 w-3/4 rounded bg-white/10" />
        <div className="h-2.5 w-1/2 rounded bg-white/5" />
      </div>
    </div>
  );
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
// Fixed-width tile used by every horizontal Rail — same card size everywhere
// a rail appears, so scanning across sections never looks inconsistent.
const RAIL_TILE = "w-[136px] shrink-0";

const matchesQuery = (game, q) => !q || game.title.toLowerCase().includes(q);

// Matches the scroll body's own `gap-3` below — the arrow step calculation
// needs the real inter-card gap, not just each card's own width.
const RAIL_GAP_PX = 12;
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

// Tracks whether a rail's scroll body has more content past either edge, so
// the prev/next buttons can disable themselves at the real boundary instead
// of just always being clickable. Re-measures on scroll and on resize (a
// rail that fit unscrolled at desktop width may not once the viewport
// shrinks).
function useRailScroll(itemCount) {
  const ref = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    };
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [itemCount]);

  // Steps by however many WHOLE cards fit in one viewport segment (never a
  // fractional card), so every arrow click lands cleanly on a card boundary
  // instead of stopping partway through the next one.
  const scrollByPage = (direction) => {
    const el = ref.current;
    if (!el) return;
    const firstCard = el.firstElementChild;
    const cardWidth = firstCard?.getBoundingClientRect().width ?? el.clientWidth;
    const cardStep = cardWidth + RAIL_GAP_PX;
    const cardsPerPage = railCardsPerPage(el.clientWidth, cardWidth, RAIL_GAP_PX);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * cardsPerPage * cardStep, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return { ref, canScrollLeft, canScrollRight, scrollByPage };
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
export function CasinoGameRail({ title, badge, games, tileProps, onSeeAll, testId, sectionId, emptyState, context, isLoading }) {
  const { ref, canScrollLeft, canScrollRight, scrollByPage } = useRailScroll(games.length);

  if (isLoading) {
    return (
      <section id={sectionId} data-test-id={testId} aria-label={title}>
        <div className="mb-3 flex min-w-0 items-center gap-2">
          <h2 className="text-sm font-bold">{title}</h2>
        </div>
        <div className="flex gap-3 overflow-hidden pb-1 pl-1 pt-1">
          {Array.from({ length: RAIL_SKELETON_COUNT }, (_, i) => (
            <div key={i} className={RAIL_TILE}>
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
      <section id={sectionId} data-test-id={testId}>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold">{title}</h2>
        </div>
        {emptyState}
      </section>
    );
  }

  const scroll = (direction) => {
    scrollByPage(direction);
    track("casino_rail_scrolled", { railTitle: title, direction: direction < 0 ? "previous" : "next" });
  };

  return (
    <section id={sectionId} data-test-id={testId} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="shrink-0 text-sm font-bold">{title}</h2>
          {badge && <span className="min-w-0 truncate rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{badge}</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {onSeeAll && (
            <button
              type="button"
              onClick={onSeeAll}
              data-test-id={testId ? `${testId}-see-all` : undefined}
              className="mr-1 text-xs font-semibold text-[var(--casino-text-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              See all
            </button>
          )}
          <button
            type="button"
            aria-label={`Previous ${title}`}
            disabled={!canScrollLeft}
            onClick={() => scroll(-1)}
            className="hidden size-7 place-items-center rounded-md border border-white/10 text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 sm:grid"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Next ${title}`}
            disabled={!canScrollRight}
            onClick={() => scroll(1)}
            className="hidden size-7 place-items-center rounded-md border border-white/10 text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 sm:grid"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        aria-label={`${title} carousel`}
        className="flex snap-x snap-proximity gap-3 overflow-x-auto p-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {games.map((game) => (
          <div key={game.favId} className={cn(RAIL_TILE, "snap-start")}>
            <CasinoGameCard game={game} {...tileProps} context={context} />
          </div>
        ))}
      </div>
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
        className="-my-1 py-1 text-[10px] font-semibold text-[var(--casino-text-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      icon={Star}
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
// header already consumes significant space"). Real navigation-link
// semantics for anything NOT reached from the Lobby (a route actually
// changes on selection when `selected !== "Lobby"` — reaching this bar from
// Favorites/a standalone category page still works exactly as before), not
// ARIA tabs — this isn't an in-place tab panel.
//
// PILL NAVIGATION CONSISTENCY: every pill now behaves identically while on
// the Lobby — smoothly scroll to that category's real Lobby section,
// updating the active pill as you go, never opening a standalone category
// page (see lib/casinoLobbyScroll.js's activateLobbyPill/
// useLobbyActiveSection, which own the actual scroll/scroll-spy mechanics).
// This is a deliberately different interaction model from Search/Sidebar
// (which still open a full category destination for routed categories) —
// scoped specifically to this pill bar, per that task's own instruction.
export function CategoryNav({ selected, onNavigateToLobby, onPillActivated }) {
  const activeRef = useRef(null);
  const isOnLobby = selected === "Lobby";
  const [activeSectionId, setActiveSectionId] = useLobbyActiveSection(isOnLobby);

  // Restores a valid `#section` hash left by a previous visit/share, once,
  // on first mount — see restoreSectionFromHash's own comment for why this
  // is instant (not animated) and why an unrecognized hash is a silent
  // no-op rather than an error.
  useEffect(() => {
    if (isOnLobby) restoreSectionFromHash(setActiveSectionId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately once, on mount only; see comment above.
  }, []);

  useEffect(() => {
    // Keeps the active pill in view on mobile after a direct link/back-
    // forward navigation, a search selection, or manual Lobby scrolling
    // lands on a category the horizontal scroll position doesn't already
    // show. Deliberately NOT scrollIntoView: that API can reach past this
    // bar's own horizontal scrollbox and nudge an ANCESTOR's vertical
    // scroll too (block: "nearest" is only a hint, not a hard axis lock) —
    // which fought the Lobby's own section-scroll every time a pill click
    // changed `activeSectionId` a moment after the click itself already
    // started scrolling <main> (see PILL NAVIGATION CONSISTENCY: "prevent
    // competing animations"). Plain scrollLeft arithmetic only ever touches
    // this nav's own horizontal position.
    const btn = activeRef.current;
    const nav = btn?.parentElement;
    if (!btn || !nav) return;
    const btnLeft = btn.offsetLeft;
    const btnRight = btnLeft + btn.offsetWidth;
    const visibleLeft = nav.scrollLeft;
    const visibleRight = visibleLeft + nav.clientWidth;
    if (btnLeft < visibleLeft) nav.scrollLeft = btnLeft;
    else if (btnRight > visibleRight) nav.scrollLeft = btnRight - nav.clientWidth;
  }, [selected, activeSectionId]);

  const handleClick = (category) => {
    onPillActivated?.(category);
    activateLobbyPill(category, { currentCategory: selected, onNavigateToLobby, setActiveSectionId });
  };

  return (
    <nav aria-label="Casino categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {CASINO_CATEGORIES.map((category) => {
        // While on the Lobby, active state tracks the scroll-spy (which
        // section is actually in view) instead of the route — every pill
        // click keeps `selected` pinned at "Lobby", so a plain string
        // comparison against it would leave every pill permanently
        // inactive. Off the Lobby (Favorites, a standalone category page
        // reached via Search/Sidebar/a direct URL), this falls back to the
        // original simple comparison, unchanged — see PILL NAVIGATION
        // CONSISTENCY: "do not accidentally break... Search result
        // destinations."
        const isSelected = isOnLobby
          ? (category.id === "Lobby" ? activeSectionId === null : activeSectionId === category.id)
          : selected === category.id;
        return (
          <button
            key={category.id}
            ref={isSelected ? activeRef : undefined}
            type="button"
            onClick={() => handleClick(category)}
            aria-current={isSelected ? "page" : undefined}
            data-test-id={`category-nav-${category.id.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-[var(--casino-primary-border)] bg-[var(--casino-primary-soft)] text-[var(--casino-text-accent)]"
                : "border-white/10 text-zinc-400 hover:text-white"
            )}
          >
            {category.label}
          </button>
        );
      })}
    </nav>
  );
}

// A category page (Popular/Slots/Live Casino/Game Shows/New): title,
// description, kind filter chips, plain grid. Never the top promo tiles
// (those are Lobby-only), never deduped against "Your games" — a full
// category listing should always be the complete, real list.
function CategoryPage({ category, tileProps, onBrowseGames }) {
  const [chip, setChip] = useState("all");
  const meta = CATEGORY_META[category];
  const games = ALL_GAMES.filter((g) => g.tags?.includes(meta.tag)).filter((g) => chip === "all" || g.kind === chip);

  return (
    <section className="animate-fade-in-up">
      <h1 className="text-lg font-bold">{displayLabel(category)}</h1>
      {meta.description && <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>}

      <div className="mb-4 mt-3 flex gap-2" role="group" aria-label="Filter by provider">
        {KIND_CHIPS.map((c) => (
          <button
            key={c.id}
            onClick={() => setChip(c.id)}
            aria-pressed={chip === c.id}
            data-test-id={`category-chip-${c.id}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              chip === c.id
                ? "border-[var(--casino-primary-border)] bg-[var(--casino-primary-soft)] text-[var(--casino-text-accent)]"
                : "border-white/10 text-zinc-400 hover:text-white"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      {games.length ? (
        <div className={GRID}>
          {games.map((game) => <CasinoGameCard key={game.favId} game={game} {...tileProps} context="category" />)}
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

function BrowseGamesButton({ onClick, testId }) {
  return (
    <button
      onClick={onClick}
      data-test-id={testId}
      className="rounded-lg bg-[var(--casino-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--casino-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
    <section className="animate-fade-in-up">
      <div className="mb-4 flex items-center gap-2">
        <Star className="size-5 fill-amber-400 text-amber-400" />
        <h1 className="text-lg font-bold">Favorites</h1>
        {favorites.length > 0 && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
            {favorites.length} game{favorites.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {favorites.length ? (
        <div className={GRID}>
          {favorites.map((game) => <CasinoGameCard key={game.favId} game={game} {...tileProps} context="favorites" />)}
        </div>
      ) : q ? (
        <EmptyState
          icon={<Star className="size-5 text-zinc-500" aria-hidden="true" />}
          title={`No favorites match "${query}"`}
          cta={<BrowseGamesButton onClick={onBrowseGames} />}
        />
      ) : (
        <EmptyState
          icon={<Star className="size-5 text-amber-400" aria-hidden="true" />}
          title="No favorite games yet"
          description="Tap the star on any game to save it here."
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
    <section className="animate-fade-in-up">
      <div className="mb-4 flex items-center gap-2">
        <History className="size-5 text-zinc-300" />
        <h1 className="text-lg font-bold">Recently Played</h1>
        {recentGames.length > 0 && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
            {recentGames.length} game{recentGames.length === 1 ? "" : "s"}
          </span>
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
//  - anything else (Lobby, default) → the lobby dashboard: Recently Played →
//    Favorites → Originals (always) → Popular → New Releases → Live Casino
//    → Game Shows → Providers.
// `recentIds` (most-recent-first favIds) and favorites are two distinct
// personalized rails, not a merged "Your games" umbrella — they answer
// different questions (what you saved vs. what you actually played) and the
// same game legitimately appearing in both is fine. `query` (from the
// search box above the catalog) filters every row/page by title.
export function CasinoCatalog({ category, query, onLaunch, onLaunchProvider, isFav, onFav, recentIds, onBrowseGames, onSelectCategory, profileVariant, onLogin }) {
  const tileProps = { onLaunchOnchain: onLaunch, onLaunchProvider, isFav, onFav };
  const q = query?.trim().toLowerCase() ?? "";
  const favorites = (isFav ? ALL_GAMES.filter((g) => isFav(g)) : []).filter((g) => matchesQuery(g, q));
  const recentGames = (recentIds ?? [])
    .map((id) => ALL_GAMES.find((g) => g.favId === id))
    .filter(Boolean)
    .filter((g) => matchesQuery(g, q));

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

  if (CATEGORY_META[category]) {
    return <CategoryPage category={category} tileProps={tileProps} onBrowseGames={onBrowseGames} />;
  }

  return (
    <LobbyDashboard
      category={category} query={query} q={q} favorites={favorites} recentGames={recentGames}
      tileProps={tileProps} onBrowseGames={onBrowseGames} onSelectCategory={onSelectCategory}
    />
  );
}

// Compact provider-browsing tiles — the real destination for the "Providers"
// category (see CASINO_PROVIDERS in lib/casinoCategories.js): exactly the
// two real studios behind this catalog, not a generic mixed game rail
// wearing that label (see PROVIDER MODEL: "the current row titled Providers
// must not remain a normal game rail"). Selecting a tile scrolls to that
// studio's own rail — the same scrollToRail behavior CategoryNav and Casino
// search's provider results use (see casinoSearch.js's SEARCH_PROVIDERS),
// so all three entry points land in the same place. No real per-studio logo
// assets exist in this app, so every tile uses the same neutral icon rather
// than a fabricated brand mark ("real logo where available, neutral
// fallback where unavailable" — neither has one available today).
function ProviderTiles() {
  return (
    <section id="casino-section-providers" data-test-id="providers-rail" aria-label="Providers">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold">Providers</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto p-1 pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {CASINO_PROVIDERS.map((provider) => {
          const count = ALL_GAMES.filter((g) => g.kind === provider.kind).length;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => scrollToRail(provider.railTarget)}
              aria-label={`Browse ${provider.name} games`}
              data-test-id={`provider-tile-${provider.id}`}
              className={cn(
                RAIL_TILE,
                "flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900 px-3 py-4 text-center ring-1 ring-white/5 transition hover:ring-[var(--casino-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <Building2 className="size-5 text-zinc-500" aria-hidden="true" />
              <span className="text-xs font-bold text-white">{provider.name}</span>
              <span className="text-[10px] text-zinc-500">{count} game{count === 1 ? "" : "s"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// Its own component (not just a branch inside CasinoCatalog) so its
// view-tracking effect is a plain, unconditionally-called hook — CasinoCatalog
// itself returns early for Favorites/CategoryPage before this would ever be
// reached, and hooks can't live after an early return in the same component.
function LobbyDashboard({ category, query, q, favorites, recentGames, tileProps, onBrowseGames, onSelectCategory }) {
  const onchain = ONCHAIN.filter((g) => matchesQuery(g, q));
  // The full TriBet Studio catalog — the "Providers" nav category no longer
  // points at this rail directly (see ProviderTiles above); it's now this
  // specific studio's own real, complete collection, named for what it
  // actually is rather than the generic "Providers" label a mixed rail
  // wore before.
  const tribetStudio = PROVIDER.filter((g) => matchesQuery(g, q));
  const byTag = (tag) => ALL_GAMES.filter((g) => g.tags?.includes(tag)).filter((g) => matchesQuery(g, q));

  // Discovery rails dedup sequentially against each other (and against the
  // always-shown Originals row) so the same game never repeats across
  // adjacent "what's hot" sections — e.g. Roulette is tagged both "popular"
  // and "live-casino", so it now only ever shows once. Favorites/Recently
  // Played are exempt: overlap between a personalized rail and a discovery
  // rail is expected (a favorited game still belongs in Popular), as is
  // TriBet Studio, which stays a stable, complete "browse the studio"
  // catch-all rather than a rotating spotlight — deduping it against the
  // tag rails above would collapse it to empty, since most of its games
  // carry at least one of those tags.
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
  // Favorites' rail already shows the exact same complete list the
  // Favorites page renders (no dedup, nothing hidden) — See all only earns
  // its place once there are enough favorites that the destination's grid
  // view genuinely helps (see SEE ALL: "the rail contains only 1-3 items
  // with no added destination value" — literally true below that count).
  const favoritesHasMore = favorites.length > 3;

  const isEmpty = q && !favorites.length && !recentGames.length && !onchain.length
    && !popularRow.length && !newReleasesRow.length && !liveCasinoRow.length && !gameShowsRow.length && !tribetStudio.length;

  // Personalized rows only count as "visible" once populated — they no
  // longer render an empty placeholder that would otherwise count as shown
  // (see LOBBY HIERARCHY: "personalized rows are conditional"). Providers
  // is excluded from `q` results (see the tile row below); "tribet-studio"
  // is its own distinct id now, never reported as "providers" (see
  // ANALYTICS: "do not keep misleading analytics names such as Providers
  // for a generic game rail").
  const visibleSections = [
    recentGames.length > 0 && "recently-played",
    favorites.length > 0 && "favorites",
    "originals",
    popularRow.length > 0 && "popular",
    newReleasesRow.length > 0 && "new-releases",
    liveCasinoRow.length > 0 && "live-casino",
    gameShowsRow.length > 0 && "game-shows",
    !q && "providers",
    tribetStudio.length > 0 && "tribet-studio",
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

  // Player-first hierarchy (see LOBBY HIERARCHY): Recently Played, then
  // Favorites — each conditional, hidden entirely (not a placeholder) when
  // empty, via CasinoGameRail's own self-hide (no emptyState passed) — then
  // the stable discovery base every player sees regardless of history:
  // Tribet Originals, Popular, New Releases, Live Casino, Game Shows,
  // Providers, TriBet Studio. Slots/Table Games are omitted — no supported
  // inventory exists for either (see FINAL RESPONSE: Slots-inventory
  // findings).
  return (
    <div className="space-y-6">
      <CasinoGameRail
        testId="recently-played-rail"
        title="Recently played"
        games={recentGames}
        tileProps={tileProps}
        context="recent"
      />

      <CasinoGameRail
        testId="favorites-rail"
        title="Favorites"
        games={favorites}
        tileProps={tileProps}
        context="favorites"
        onSeeAll={favoritesHasMore ? seeAll("Favorites") : undefined}
      />

      <CasinoGameRail
        sectionId="casino-section-originals"
        testId="originals-rail"
        title={CATEGORY_LABEL.Originals}
        badge="Provably fair"
        games={onchain}
        tileProps={tileProps}
        context="home"
      />

      <CasinoGameRail sectionId="casino-section-popular" testId="popular-rail" title="Popular" games={popularRow} tileProps={tileProps} context="home" onSeeAll={popularHasMore ? seeAll("Popular") : undefined} />
      <CasinoGameRail sectionId="casino-section-new-releases" testId="new-releases-rail" title="New Releases" games={newReleasesRow} tileProps={tileProps} context="home" onSeeAll={newReleasesHasMore ? seeAll("New") : undefined} />
      <CasinoGameRail sectionId="casino-section-live-casino" testId="live-casino-rail" title="Live Casino" games={liveCasinoRow} tileProps={tileProps} context="home" onSeeAll={liveCasinoHasMore ? seeAll("Live Casino") : undefined} />
      <CasinoGameRail sectionId="casino-section-game-shows" testId="game-shows-rail" title="Game Shows" games={gameShowsRow} tileProps={tileProps} context="home" onSeeAll={gameShowsHasMore ? seeAll("Game Shows") : undefined} />
      {!q && <ProviderTiles />}
      <CasinoGameRail testId="tribet-studio-rail" title="TriBet Studio" games={tribetStudio} tileProps={tileProps} context="home" />
    </div>
  );
}
