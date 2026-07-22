import { useState, useEffect, useRef } from "react";
import { Star, History, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";
import { BETSWIRL_GAMES } from "@/web3/useBetSwirl";
import { PROVIDER_GAMES } from "./ProviderGame";
import { EmptyState } from "@/components/ui/empty-state";
import { takeUnclaimed } from "@/lib/casinoDedup";
import { PROFILE_VARIANT } from "@/lib/profileState";

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
// analytics-only — forwarded through onLaunch to App.jsx's launchGame so
// casino_game_opened can report which section a launch came from (see
// ANALYTICS: "source/context"). Never changes rendering.
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
export function CasinoGameRail({ title, badge, games, tileProps, onSeeAll, testId, emptyState, context, isLoading }) {
  const { ref, canScrollLeft, canScrollRight, scrollByPage } = useRailScroll(games.length);

  if (isLoading) {
    return (
      <section data-test-id={testId} aria-label={title}>
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
      <section data-test-id={testId}>
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
    <section data-test-id={testId} aria-label={title}>
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
function RecentlyPlayedEmptyCard({ profileVariant, onBrowseGames, onLogin }) {
  // Session-expired has no real-world equivalent (see profileState.js —
  // authStatus is hardcoded "default" outside dev, so profileVariant can
  // never actually equal SESSION_EXPIRED in production). The literal
  // `import.meta.env.DEV &&` here is still what lets Rollup drop this copy
  // from the production bundle — profileVariant alone provably never taking
  // that value doesn't reliably tree-shake it (same guard ProfileMenu.jsx
  // uses for its own session-expired block).
  const isExpired = import.meta.env.DEV && profileVariant === PROFILE_VARIANT.SESSION_EXPIRED;
  const isLoggedOut = profileVariant === PROFILE_VARIANT.LOGGED_OUT;

  const copy = isExpired
    ? {
        title: "Session expired",
        description: "Log in again to restore your history",
        actionLabel: "Log in again",
        actionAria: "Log in again to restore recently played games",
        onAction: onLogin,
        testId: "recently-played-login-again",
      }
    : isLoggedOut
      ? {
          title: "No recent games",
          description: "Log in to sync your play history",
          actionLabel: "Log in",
          actionAria: "Log in to view recently played games",
          onAction: onLogin,
          testId: "recently-played-login",
        }
      : {
          title: "No games yet",
          description: "Played games appear here",
          actionLabel: "Browse games",
          actionAria: "Browse Casino games",
          onAction: onBrowseGames,
          testId: "recently-played-browse",
        };

  return <RailEmptyCard icon={History} {...copy} />;
}

// Favorites rail's empty state — a single, fixed copy set regardless of
// auth state: unlike Recently Played, favoriting itself never requires
// login (see App.jsx's toggleFav — it works fully offline/local-first), so
// there's no "log in to see this" story to tell here, only "you haven't
// curated anything yet."
function FavoritesEmptyCard({ onBrowseGames }) {
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

// Sidebar categories that get their own tag-filtered page (title + chips +
// grid) instead of the multi-row Lobby dashboard. "Slots" has no games in
// this catalog yet — it's a real, working empty category page, not a fake row.
const CATEGORY_META = {
  Popular: { tag: "popular", description: "What players are choosing most right now." },
  New: { tag: "new", description: "Just added to the lobby." },
  "Live Casino": { tag: "live-casino", description: "Real-format, live-style games." },
  "Game Shows": { tag: "game-shows", description: "TV-style games with big multipliers." },
  Slots: { tag: "slots", description: "Reel games." },
};
const KIND_CHIPS = [
  { id: "all", label: "All" },
  { id: "onchain", label: "On-chain" },
  { id: "provider", label: "Provider" },
];

// Display label for a category id where it differs from the routing/sidebar
// id ("New" stays the URL slug and sidebar id; every place that shows it as
// text reads "New Releases", matching the Lobby rail of the same name).
// Exported so the Sidebar (built in App.jsx) can render the same text.
export const CATEGORY_LABEL = { New: "New Releases" };
const displayLabel = (category) => CATEGORY_LABEL[category] ?? category;

// Routed categories with real data behind them — "Slots" is deliberately
// left out (see CATEGORY_META) even though its route still works if linked
// directly. Exported so casinoSearch.js can offer them as search results
// without duplicating this list or reaching into CATEGORY_META directly.
export const ROUTED_CATEGORIES = Object.keys(CATEGORY_META).filter((c) => c !== "Slots");
const NAV_CATEGORIES = ["Lobby", ...ROUTED_CATEGORIES];

export function CategoryNav({ selected, onSelect }) {
  return (
    <nav aria-label="Casino categories" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {NAV_CATEGORIES.map((category) => {
        const isSelected = selected === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-current={isSelected ? "page" : undefined}
            data-test-id={`category-nav-${category.toLowerCase().replace(/\s+/g, "-")}`}
            className={cn(
              "flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-[var(--casino-primary-border)] bg-[var(--casino-primary-soft)] text-[var(--casino-text-accent)]"
                : "border-white/10 text-zinc-400 hover:text-white"
            )}
          >
            {displayLabel(category)}
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

// Casino catalog. Three destinations share this one component:
//  - category === "Favorites" → the Favorites page.
//  - category is a tag category (Popular/Slots/Live Casino/Game Shows/New)
//    → its own page: title, chips, full grid, never deduped.
//  - anything else (Lobby, default) → the lobby dashboard: Favorites →
//    Recently Played → Originals (always) → Popular → New Releases →
//    Live Casino → Game Shows → Providers.
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

  if (CATEGORY_META[category]) {
    return <CategoryPage category={category} tileProps={tileProps} onBrowseGames={onBrowseGames} />;
  }

  return (
    <LobbyDashboard
      category={category} query={query} q={q} favorites={favorites} recentGames={recentGames}
      tileProps={tileProps} onBrowseGames={onBrowseGames} onSelectCategory={onSelectCategory}
      profileVariant={profileVariant} onLogin={onLogin}
    />
  );
}

// Its own component (not just a branch inside CasinoCatalog) so its
// view-tracking effect is a plain, unconditionally-called hook — CasinoCatalog
// itself returns early for Favorites/CategoryPage before this would ever be
// reached, and hooks can't live after an early return in the same component.
function LobbyDashboard({ category, query, q, favorites, recentGames, tileProps, onBrowseGames, onSelectCategory, profileVariant, onLogin }) {
  const onchain = ONCHAIN.filter((g) => matchesQuery(g, q));
  const provider = PROVIDER.filter((g) => matchesQuery(g, q));
  const byTag = (tag) => ALL_GAMES.filter((g) => g.tags?.includes(tag)).filter((g) => matchesQuery(g, q));

  // Discovery rails dedup sequentially against each other (and against the
  // always-shown Originals row) so the same game never repeats across
  // adjacent "what's hot" sections — e.g. Roulette is tagged both "popular"
  // and "live-casino", so it now only ever shows once. Favorites/Recently
  // Played are exempt: overlap between a personalized rail and a discovery
  // rail is expected (a favorited game still belongs in Popular), as is
  // Providers, which stays a stable, complete "browse the studio" catch-all
  // rather than a rotating spotlight — deduping it against the tag rails
  // above would collapse it to empty, since most provider games carry at
  // least one of those tags.
  const seen = new Set(onchain.map((g) => g.favId));
  const popularCandidates = byTag("popular");
  const newReleasesCandidates = byTag("new");
  const liveCasinoCandidates = byTag("live-casino");
  const gameShowsCandidates = byTag("game-shows");
  const popularRow = takeUnclaimed(popularCandidates, seen);
  const newReleasesRow = takeUnclaimed(newReleasesCandidates, seen);
  const liveCasinoRow = takeUnclaimed(liveCasinoCandidates, seen);
  const gameShowsRow = takeUnclaimed(gameShowsCandidates, seen);
  const providerRow = provider;
  // See all is only worth showing when its destination (the category's own
  // full, undeduped page) actually reveals more than this rail already
  // does — true whenever dedup removed anything. A rail that happens to
  // equal its own category's complete list has nothing further to reveal
  // (see SEE ALL: "there are more items than shown in the rail").
  const popularHasMore = popularRow.length < popularCandidates.length;
  const newReleasesHasMore = newReleasesRow.length < newReleasesCandidates.length;
  const liveCasinoHasMore = liveCasinoRow.length < liveCasinoCandidates.length;
  const gameShowsHasMore = gameShowsRow.length < gameShowsCandidates.length;

  const isEmpty = q && !favorites.length && !recentGames.length && !onchain.length
    && !popularRow.length && !newReleasesRow.length && !liveCasinoRow.length && !gameShowsRow.length && !providerRow.length;

  const visibleSections = [
    (favorites.length > 0 || !q) && "favorites",
    (recentGames.length > 0 || !q) && "recently-played",
    "originals",
    popularRow.length > 0 && "popular",
    newReleasesRow.length > 0 && "new-releases",
    liveCasinoRow.length > 0 && "live-casino",
    gameShowsRow.length > 0 && "game-shows",
    providerRow.length > 0 && "providers",
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

  return (
    <div className="space-y-6">
      <CasinoGameRail
        testId="favorites-rail"
        title="Favorites"
        games={favorites}
        tileProps={tileProps}
        context="favorites"
        onSeeAll={seeAll("Favorites")}
        emptyState={!q ? <FavoritesEmptyCard onBrowseGames={onBrowseGames} /> : undefined}
      />

      <CasinoGameRail
        testId="recently-played-rail"
        title="Recently played"
        games={recentGames}
        tileProps={tileProps}
        context="recent"
        emptyState={
          !q ? (
            <RecentlyPlayedEmptyCard profileVariant={profileVariant} onBrowseGames={onBrowseGames} onLogin={onLogin} />
          ) : undefined
        }
      />

      <CasinoGameRail
        testId="originals-rail"
        title="Originals"
        badge="BetSwirl · Base Sepolia · Chainlink VRF"
        games={onchain}
        tileProps={tileProps}
        context="home"
      />

      <CasinoGameRail testId="popular-rail" title="Popular" games={popularRow} tileProps={tileProps} context="home" onSeeAll={popularHasMore ? seeAll("Popular") : undefined} />
      <CasinoGameRail testId="new-releases-rail" title="New Releases" games={newReleasesRow} tileProps={tileProps} context="home" onSeeAll={newReleasesHasMore ? seeAll("New") : undefined} />
      <CasinoGameRail testId="live-casino-rail" title="Live Casino" games={liveCasinoRow} tileProps={tileProps} context="home" onSeeAll={liveCasinoHasMore ? seeAll("Live Casino") : undefined} />
      <CasinoGameRail testId="game-shows-rail" title="Game Shows" games={gameShowsRow} tileProps={tileProps} context="home" onSeeAll={gameShowsHasMore ? seeAll("Game Shows") : undefined} />
      <CasinoGameRail testId="providers-rail" title="Providers" badge="embedded · loads on open" games={providerRow} tileProps={tileProps} context="home" />
    </div>
  );
}
