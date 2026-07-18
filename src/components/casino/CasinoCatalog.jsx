import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { BETSWIRL_GAMES } from "@/web3/useBetSwirl";
import { PROVIDER_GAMES } from "./ProviderGame";

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
      aria-label={faved ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
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
// Compact horizontal row for the 2-5 item tier of "Your games" — fixed-width
// tiles in a single scrollable line, deliberately not the full wrapping grid
// (which is what produced the old "giant empty row" look for a single item).
const ROW = "flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]";
const ROW_TILE = "w-[136px] shrink-0";

const matchesQuery = (game, q) => !q || game.title.toLowerCase().includes(q);

// A lobby row only drops games also shown in "Your games" if doing so still
// leaves it with a reasonable amount of content — a row that would collapse
// to 1-5 items from deduping is more useful showing the duplicate than
// showing a half-empty row. Category *pages* (below) never dedup at all.
const DEDUP_MIN = 6;
const dedupAgainstYourGames = (games, yourGameIds) => {
  if (yourGameIds.size === 0) return games;
  const withoutDupes = games.filter((g) => !yourGameIds.has(g.favId));
  return withoutDupes.length >= DEDUP_MIN ? withoutDupes : games;
};

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
      <h1 className="text-lg font-bold">{category}</h1>
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
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-sm text-zinc-500">No {category.toLowerCase()} games yet.</p>
          <button
            onClick={onBrowseGames}
            className="mt-3 rounded-lg bg-[var(--casino-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--casino-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse games
          </button>
        </div>
      )}
    </section>
  );
}

function LobbyRow({ title, badge, games, tileProps }) {
  if (games.length === 0) return null;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {badge && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">{badge}</span>}
      </div>
      <div className={GRID}>
        {games.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
      </div>
    </section>
  );
}

// "Your games": recently played first, then favorites not already covered by
// recent play — never a lobby row just because a label exists elsewhere.
// Sizing follows content, not a fixed layout: 0 → no section at all; exactly
// 1 → shown inline (still the grid, so it's one small tile, never a
// full-width row); 2-5 → compact horizontal row; 6+ → a preview with
// "View all" expanding the rest in place.
function YourGames({ games, tileProps }) {
  const [expanded, setExpanded] = useState(false);
  if (games.length === 0) return null;

  const heading = (
    <div className="mb-3 flex items-center gap-2">
      <Star className="size-4 fill-amber-400 text-amber-400" />
      <h2 className="text-sm font-bold">Your games</h2>
    </div>
  );

  if (games.length <= 5) {
    const cls = games.length === 1 ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : ROW;
    return (
      <section data-test-id="your-games-section">
        {heading}
        <div className={cls}>
          {games.map((game) => (
            <div key={game.favId} className={games.length === 1 ? "w-[136px]" : ROW_TILE}>
              <Tile game={game} {...tileProps} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  const PREVIEW = 6;
  const shown = expanded ? games : games.slice(0, PREVIEW);
  return (
    <section data-test-id="your-games-section">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star className="size-4 fill-amber-400 text-amber-400" />
          <h2 className="text-sm font-bold">Your games</h2>
        </div>
        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            data-test-id="your-games-view-all"
            className="text-xs font-semibold text-[var(--casino-text-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all ({games.length})
          </button>
        )}
      </div>
      <div className={GRID}>
        {shown.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
      </div>
    </section>
  );
}

function FavoritesPage({ favorites, q, query, tileProps, onBrowseGames }) {
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
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-sm text-zinc-500">No favorites match “{query}”.</p>
          <button
            onClick={onBrowseGames}
            className="mt-3 rounded-lg bg-[var(--casino-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--casino-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse games
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-sm font-medium text-zinc-300">No favorites yet</p>
          <p className="mt-1 text-sm text-zinc-500">Save games using the star icon to find them here.</p>
          <button
            onClick={onBrowseGames}
            data-test-id="favorites-browse-games"
            className="mt-4 rounded-lg bg-[var(--casino-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--casino-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse games
          </button>
        </div>
      )}
    </section>
  );
}

// Casino catalog. Three destinations share this one component:
//  - category === "Favorites" → the Favorites page.
//  - category is a tag category (Popular/Slots/Live Casino/Game Shows/New)
//    → its own page: title, chips, full grid, never deduped.
//  - anything else (Lobby, default) → the lobby dashboard: Your games →
//    On-chain Casino (always) → Popular → New → Provider games → Live Casino
//    → Game Shows, each hidden if empty and deduped against Your games
//    (never below DEDUP_MIN — see dedupAgainstYourGames).
// `recentIds` (most-recent-first favIds) + favorites feed "Your games" —
// content priority: recently played, then favorites. `query` (from the
// search box above the catalog) filters every row/page by title.
export function CasinoCatalog({ category, query, onLaunch, onLaunchProvider, isFav, onFav, recentIds, onBrowseGames }) {
  const tileProps = { onLaunchOnchain: onLaunch, onLaunchProvider, isFav, onFav };
  const q = query?.trim().toLowerCase() ?? "";
  const favorites = (isFav ? ALL_GAMES.filter((g) => isFav(g)) : []).filter((g) => matchesQuery(g, q));

  const recentGames = (recentIds ?? []).map((id) => ALL_GAMES.find((g) => g.favId === id)).filter(Boolean);
  const yourGames = [...recentGames, ...favorites.filter((g) => !recentGames.some((r) => r.favId === g.favId))]
    .filter((g) => matchesQuery(g, q));

  if (category === "Favorites") {
    return <FavoritesPage favorites={favorites} q={q} query={query} tileProps={tileProps} onBrowseGames={onBrowseGames} />;
  }

  if (CATEGORY_META[category]) {
    return <CategoryPage category={category} tileProps={tileProps} onBrowseGames={onBrowseGames} />;
  }

  // Lobby dashboard.
  const onchain = ONCHAIN.filter((g) => matchesQuery(g, q));
  const provider = PROVIDER.filter((g) => matchesQuery(g, q));
  const byTag = (tag) => ALL_GAMES.filter((g) => g.tags?.includes(tag)).filter((g) => matchesQuery(g, q));
  const yourGameIds = new Set(yourGames.map((g) => g.favId));

  const popularRow = dedupAgainstYourGames(byTag("popular"), yourGameIds);
  const newRow = dedupAgainstYourGames(byTag("new"), yourGameIds);
  const providerRow = dedupAgainstYourGames(provider, yourGameIds);
  const liveCasinoRow = dedupAgainstYourGames(byTag("live-casino"), yourGameIds);
  const gameShowsRow = dedupAgainstYourGames(byTag("game-shows"), yourGameIds);

  if (q && !yourGames.length && !onchain.length && !popularRow.length && !newRow.length && !providerRow.length && !liveCasinoRow.length && !gameShowsRow.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
        <p className="text-sm text-zinc-500">No games match “{query}”.</p>
        {onBrowseGames && (
          <button
            onClick={onBrowseGames}
            className="mt-3 rounded-lg bg-[var(--casino-primary)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--casino-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Browse games
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <YourGames games={yourGames} tileProps={tileProps} />

      {/* On-chain Casino is always shown, unlike every row below it. */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-bold">On-chain casino</h2>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">
            BetSwirl · Base Sepolia · Chainlink VRF
          </span>
        </div>
        <div className={GRID}>
          {onchain.map((game) => <Tile key={game.favId} game={game} {...tileProps} />)}
        </div>
      </section>

      <LobbyRow title="Popular" games={popularRow} tileProps={tileProps} />
      <LobbyRow title="New" games={newRow} tileProps={tileProps} />
      <LobbyRow title="Provider games" badge="embedded · loads on open" games={providerRow} tileProps={tileProps} />
      <LobbyRow title="Live Casino" games={liveCasinoRow} tileProps={tileProps} />
      <LobbyRow title="Game Shows" games={gameShowsRow} tileProps={tileProps} />
    </div>
  );
}
