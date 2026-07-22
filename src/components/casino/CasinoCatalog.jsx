import { useState, useEffect, useRef } from "react";
import { Star, History, ChevronLeft, ChevronRight, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";
import { BETSWIRL_GAMES } from "@/web3/useBetSwirl";
import { PROVIDER_GAMES } from "./ProviderGame";
import { EmptyState } from "@/components/ui/empty-state";
import { takeUnclaimed } from "@/lib/casinoDedup";

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

// Favorite star overlay: pop animation on toggle + a one-shot sparkle burst on add.
// Sits above the launch button (z-20) and stops propagation so favoriting never
// launches the game. Animations reuse the fav-pop / fav-spark keyframes in index.css.
function FavStar({ faved, onToggle, title }) {
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
      tabIndex={0}
      data-fav
      aria-label={faved ? `Remove ${title} from Favorites` : `Add ${title} to Favorites`}
      aria-pressed={faved}
      onClick={handle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handle(e); }}
      className="group/fav absolute right-1.5 top-1.5 z-20 grid size-8 cursor-pointer place-items-center rounded-md bg-black/40 text-white/90 transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
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

// A tile is a real <a href> so the browser's native middle-click / cmd-click /
// ctrl-click "open in new tab" behaviour works, like on most sites. A plain left
// click is intercepted to open the game in-place (no full page reload); modified
// clicks are left alone so the browser opens the target URL itself.
const linkClick = (onLaunch, game) => (e) => {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  onLaunch(game);
};

// Per-card status: only for card-specific conditions (this game isn't wired
// up yet), never network state — a disconnected/wrong-network wallet doesn't
// change whether Wheel/Plinko show this. Always a plain-language label, never
// jargon, and never colour/greyscale alone — the label is the real signal.
const STATUS_LABEL = { "coming-soon": "Coming soon" };

function OnchainTile({ game, onLaunch, faved, onFav }) {
  const status = game.playable ? null : (game.status ?? "coming-soon");
  const statusLabel = status ? STATUS_LABEL[status] ?? status : null;
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition hover:ring-[var(--casino-primary)]">
      <a
        href={gameHref(game)}
        onClick={game.playable ? linkClick(onLaunch, game) : (e) => e.preventDefault()}
        aria-disabled={!game.playable}
        data-test-id={`onchain-${game.key}`}
        aria-label={game.playable ? `Play ${game.title}` : `${game.title} — ${statusLabel}`}
        className={`absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${game.playable ? "" : "pointer-events-none cursor-not-allowed"}`}
      >
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${game.playable ? "" : "opacity-40 grayscale"}`}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="text-xs font-bold text-white">{game.title}</div>
        </div>
      </a>
      {statusLabel && (
        <span className="pointer-events-none absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          {statusLabel}
        </span>
      )}
      {onFav && <FavStar faved={faved} onToggle={() => onFav(game)} title={game.title} />}
    </div>
  );
}

function ProviderTile({ game, onLaunch, faved, onFav }) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition hover:ring-[var(--casino-primary)]">
      <a
        href={gameHref(game)}
        onClick={linkClick(onLaunch, game)}
        data-test-id={`provider-${game.key}`}
        aria-label={`Play ${game.title}`}
        className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <img
          src={game.image}
          alt={game.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </a>
      {onFav && <FavStar faved={faved} onToggle={() => onFav(game)} title={game.title} />}
    </div>
  );
}

// Renders a game with the tile that matches its kind, wiring favorites through.
function Tile({ game, onLaunchOnchain, onLaunchProvider, isFav, onFav }) {
  const faved = isFav?.(game);
  return game.kind === "onchain" ? (
    <OnchainTile game={game} onLaunch={onLaunchOnchain} faved={faved} onFav={onFav} />
  ) : (
    <ProviderTile game={game} onLaunch={onLaunchProvider} faved={faved} onFav={onFav} />
  );
}

const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";
// Fixed-width tile used by every horizontal Rail — same card size everywhere
// a rail appears, so scanning across sections never looks inconsistent.
const RAIL_TILE = "w-[136px] shrink-0";

const matchesQuery = (game, q) => !q || game.title.toLowerCase().includes(q);

// Tracks whether a Rail's scroll body has more content past either edge, so
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

  const scrollByPage = (direction) => {
    const el = ref.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.9), behavior: reduceMotion ? "auto" : "smooth" });
  };

  return { ref, canScrollLeft, canScrollRight, scrollByPage };
}

// The one shared horizontal rail pattern used by every Lobby section:
// title (+ optional trust badge) on the left, "See all" + prev/next arrows
// on the right, a touch-scrollable row of fixed-width tiles below. Self-hides
// when there's nothing to show unless an `emptyState` is supplied (used by
// Recently Played, which wants to teach the feature rather than disappear).
function Rail({ title, badge, games, tileProps, onSeeAll, testId, emptyState }) {
  const { ref, canScrollLeft, canScrollRight, scrollByPage } = useRailScroll(games.length);

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

  return (
    <section data-test-id={testId} aria-label={title}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold">{title}</h2>
          {badge && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{badge}</span>}
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
            aria-label={`Scroll ${title} left`}
            disabled={!canScrollLeft}
            onClick={() => scrollByPage(-1)}
            className="hidden size-7 place-items-center rounded-md border border-white/10 text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 sm:grid"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Scroll ${title} right`}
            disabled={!canScrollRight}
            onClick={() => scrollByPage(1)}
            className="hidden size-7 place-items-center rounded-md border border-white/10 text-zinc-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 sm:grid"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 pr-4 [scrollbar-width:none] sm:snap-none [&::-webkit-scrollbar]:hidden"
      >
        {games.map((game) => (
          <div key={game.favId} className={cn(RAIL_TILE, "snap-start")}>
            <Tile game={game} {...tileProps} />
          </div>
        ))}
      </div>
    </section>
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
          {games.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
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
          {favorites.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
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
export function CasinoCatalog({ category, query, onLaunch, onLaunchProvider, isFav, onFav, recentIds, onBrowseGames, onSelectCategory }) {
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
    />
  );
}

// Its own component (not just a branch inside CasinoCatalog) so its
// view-tracking effect is a plain, unconditionally-called hook — CasinoCatalog
// itself returns early for Favorites/CategoryPage before this would ever be
// reached, and hooks can't live after an early return in the same component.
function LobbyDashboard({ category, query, q, favorites, recentGames, tileProps, onBrowseGames, onSelectCategory }) {
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
  const popularRow = takeUnclaimed(byTag("popular"), seen);
  const newReleasesRow = takeUnclaimed(byTag("new"), seen);
  const liveCasinoRow = takeUnclaimed(byTag("live-casino"), seen);
  const gameShowsRow = takeUnclaimed(byTag("game-shows"), seen);
  const providerRow = provider;

  const isEmpty = q && !favorites.length && !recentGames.length && !onchain.length
    && !popularRow.length && !newReleasesRow.length && !liveCasinoRow.length && !gameShowsRow.length && !providerRow.length;

  const visibleSections = [
    favorites.length > 0 && "favorites",
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
      <Rail testId="favorites-rail" title="Favorites" games={favorites} tileProps={tileProps} onSeeAll={seeAll("Favorites")} />

      <Rail
        testId="recently-played-rail"
        title="Recently played"
        games={recentGames}
        tileProps={tileProps}
        emptyState={
          !q ? (
            <EmptyState
              icon={<History className="size-5 text-zinc-500" aria-hidden="true" />}
              title="No recently played games yet"
              description="Games you open will show up here."
              cta={<BrowseGamesButton onClick={onBrowseGames} testId="recently-played-browse-games" />}
              className="py-6"
            />
          ) : undefined
        }
      />

      <Rail
        testId="originals-rail"
        title="Originals"
        badge="BetSwirl · Base Sepolia · Chainlink VRF"
        games={onchain}
        tileProps={tileProps}
      />

      <Rail testId="popular-rail" title="Popular" games={popularRow} tileProps={tileProps} onSeeAll={seeAll("Popular")} />
      <Rail testId="new-releases-rail" title="New Releases" games={newReleasesRow} tileProps={tileProps} onSeeAll={seeAll("New")} />
      <Rail testId="live-casino-rail" title="Live Casino" games={liveCasinoRow} tileProps={tileProps} onSeeAll={seeAll("Live Casino")} />
      <Rail testId="game-shows-rail" title="Game Shows" games={gameShowsRow} tileProps={tileProps} onSeeAll={seeAll("Game Shows")} />
      <Rail testId="providers-rail" title="Providers" badge="embedded · loads on open" games={providerRow} tileProps={tileProps} />
    </div>
  );
}
