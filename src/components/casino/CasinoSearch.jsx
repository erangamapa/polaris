import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Search, X, ArrowLeft, Clock, Building2, Compass, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { track } from "@/lib/telemetry";
import { gameHref, gameProviderName, useBrokenImage, FavStar } from "./CasinoCatalog";
import { scrollToRail, activateCasinoCategory } from "@/lib/casinoCategories";
import { searchCasino, hasAnyResults, SEARCH_CATEGORIES } from "@/lib/casinoSearch";
import { loadRecentSearches, addRecentSearch, clearRecentSearches } from "@/lib/casinoRecentSearches";

// Debounce only the filter computation, never the input's own value — typing
// always feels instant, the (cheap, synchronous) ranking pass just doesn't
// re-run on every single keystroke.
const DEBOUNCE_MS = 150;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function GameThumb({ game }) {
  const { broken, onError } = useBrokenImage();
  if (broken) {
    return (
      <span className="grid size-9 shrink-0 place-items-center rounded bg-zinc-800 text-zinc-600">
        <Gamepad2 className="size-4" aria-hidden="true" />
      </span>
    );
  }
  return (
    <img
      src={game.image}
      alt=""
      loading="lazy"
      onError={onError}
      className="size-9 shrink-0 rounded bg-zinc-800 object-cover"
    />
  );
}

const ROW = "flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 py-1.5 text-left text-sm outline-none";
const rowTone = (active) => cn(ROW, active ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5");

function GameRow({ id, game, active, onHover, onSelect, isFav, onFav }) {
  const faved = isFav?.(game);
  // favId (not game.key) — the onchain "dice" and provider "dice" share the
  // same `key`, only favId (casino:dice / provider:dice) is unique.
  const testKey = game.favId.replace(":", "-");
  const linkClick = (e) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    onSelect(game);
  };
  return (
    <li role="option" id={id} aria-selected={active}>
      <a
        href={gameHref(game)}
        onMouseEnter={onHover}
        onMouseDown={(e) => e.preventDefault()}
        onClick={linkClick}
        data-test-id={`casino-search-game-${testKey}`}
        className={cn(rowTone(active), "focus-visible:ring-2 focus-visible:ring-ring")}
      >
        <GameThumb game={game} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{game.title}</span>
          <span className="block truncate text-xs text-zinc-500">{gameProviderName(game)}</span>
        </span>
        {onFav && (
          <FavStar
            faved={faved}
            onToggle={() => onFav(game)}
            title={game.title}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            data-test-id={`casino-search-fav-${testKey}`}
            className="shrink-0 text-zinc-500 hover:bg-white/10 hover:text-white"
          />
        )}
      </a>
    </li>
  );
}

function ProviderRow({ id, provider, active, onHover, onSelect }) {
  return (
    <li role="option" id={id} aria-selected={active}>
      <button
        type="button"
        onMouseEnter={onHover}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect(provider)}
        data-test-id={`casino-search-provider-${provider.id}`}
        className={cn(rowTone(active), "focus-visible:ring-2 focus-visible:ring-ring")}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white/5 text-zinc-400">
          <Building2 className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{provider.name}</span>
          <span className="block truncate text-xs text-zinc-500">{provider.count} game{provider.count === 1 ? "" : "s"}</span>
        </span>
      </button>
    </li>
  );
}

function CategoryRow({ id, category, active, onHover, onSelect }) {
  return (
    <li role="option" id={id} aria-selected={active}>
      <button
        type="button"
        onMouseEnter={onHover}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect(category)}
        data-test-id={`casino-search-category-${category.id.toLowerCase().replace(/\s+/g, "-")}`}
        className={cn(rowTone(active), "focus-visible:ring-2 focus-visible:ring-ring")}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white/5 text-zinc-400">
          <Compass className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 truncate font-medium">{category.label}</span>
      </button>
    </li>
  );
}

function GroupHeading({ children, "aria-hidden": ariaHidden }) {
  return <div aria-hidden={ariaHidden} className="px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 first:pt-2">{children}</div>;
}

function RecentRow({ id, term, active, onHover, onSelect }) {
  return (
    <li role="option" id={id} aria-selected={active}>
      <button
        type="button"
        onMouseEnter={onHover}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onSelect(term)}
        data-test-id="casino-search-recent"
        className={cn(rowTone(active), "focus-visible:ring-2 focus-visible:ring-ring")}
      >
        <Clock className="size-4 shrink-0 text-zinc-500" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate">{term}</span>
      </button>
    </li>
  );
}

// Reused by both the empty-query state and the no-results recovery state —
// a compact set of category chips, never a second Casino Home.
function PopularCategoryChips({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-2.5 pb-1">
      {SEARCH_CATEGORIES.filter((c) => c.kind === "routed").map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c)}
          data-test-id={`casino-search-popular-${c.id.toLowerCase().replace(/\s+/g, "-")}`}
          className="min-h-11 rounded-full border border-white/10 px-3 text-xs font-semibold text-zinc-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// Builds the flattened, keyboard-navigable item list for whichever state is
// showing — one ordered array is what makes ArrowUp/Down/Enter meaningful
// across visually distinct groups without each group owning its own index.
function useFlatItems(mode, groups, recentSearches) {
  return useMemo(() => {
    if (mode === "empty") {
      return [
        ...recentSearches.map((term) => ({ type: "recent", key: `recent:${term}`, payload: term })),
        ...SEARCH_CATEGORIES.filter((c) => c.kind === "routed").map((c) => ({ type: "popular-category", key: `popular:${c.id}`, payload: c })),
      ];
    }
    if (mode === "results") {
      return [
        ...groups.games.map((g) => ({ type: "game", key: `game:${g.favId}`, payload: g })),
        ...groups.providers.map((p) => ({ type: "provider", key: `provider:${p.id}`, payload: p })),
        ...groups.categories.map((c) => ({ type: "category", key: `category:${c.id}`, payload: c })),
      ];
    }
    return [];
  }, [mode, groups, recentSearches]);
}

// The panel's actual content — identical whether it renders inline (desktop
// dropdown) or inside the full-screen mobile Dialog, so behavior never
// diverges between the two surfaces.
function SearchResultsBody({
  mode, query, groups, recentSearches, flatItems, activeIndex, onHoverIndex,
  onSelectGame, onSelectProvider, onSelectCategory, onSelectRecent, onClearRecent, onClearQuery,
  isFav, onFav,
}) {
  const indexOf = (key) => flatItems.findIndex((i) => i.key === key);

  // One polite announcement per settled query (mode/counts only change on
  // the debounced query, not per keystroke or per hover) — never spammed.
  const announcement = mode === "no-results"
    ? `No Casino results found for ${query}`
    : mode === "results"
      // No providers clause — see lib/casinoSearch.js: `groups.providers`
      // is always empty (no real, multi-provider inventory yet), so
      // announcing "0 providers" every time would just be confusing noise.
      ? `${groups.games.length} game${groups.games.length === 1 ? "" : "s"}, ${groups.categories.length} categor${groups.categories.length === 1 ? "y" : "ies"} found`
      : "";
  const liveRegion = <div role="status" aria-live="polite" className="sr-only">{announcement}</div>;

  let body = null;
  if (mode === "empty" && flatItems.length > 0) {
    // flatItems.length === 0 here is effectively unreachable (popular
    // categories always exist) — kept as a defensive "render nothing" case.
    body = (
      <ul role="listbox" aria-label="Search suggestions">
        {recentSearches.length > 0 && (
          <li role="group" aria-label="Recent searches">
            <div className="flex items-center justify-between">
              <GroupHeading aria-hidden="true">Recent searches</GroupHeading>
              <button
                type="button"
                onClick={onClearRecent}
                data-test-id="casino-search-clear-recent"
                className="mr-2 text-[11px] font-semibold text-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear all
              </button>
            </div>
            <ul>
              {recentSearches.map((term) => {
                const key = `recent:${term}`;
                const i = indexOf(key);
                return (
                  <RecentRow key={key} id={`casino-search-opt-${i}`} term={term} active={i === activeIndex} onHover={() => onHoverIndex(i)} onSelect={onSelectRecent} />
                );
              })}
            </ul>
          </li>
        )}
        <li role="group" aria-label="Popular categories">
          <GroupHeading aria-hidden="true">Popular categories</GroupHeading>
          <PopularCategoryChips onSelect={onSelectCategory} />
        </li>
      </ul>
    );
  } else if (mode === "no-results") {
    body = (
      <div className="px-4 py-6 text-center" data-test-id="casino-search-no-results">
        <p className="text-sm font-medium text-zinc-200">No Casino results found</p>
        <p className="mt-1 text-sm text-zinc-500">
          Nothing matches "{query}". Try a different spelling or a shorter term.
        </p>
        <button
          type="button"
          onClick={onClearQuery}
          data-test-id="casino-search-clear-query"
          // RESKIN: arena color as TEXT is explicitly banned by the
          // guide's arena-color rules — was casino-text-accent.
          className="mt-3 text-sm font-semibold text-[var(--foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear search
        </button>
        <div className="mt-4 border-t border-white/10 pt-3 text-left">
          <GroupHeading>Popular categories</GroupHeading>
          <PopularCategoryChips onSelect={onSelectCategory} />
        </div>
      </div>
    );
  } else if (mode === "results") {
    body = (
      <ul role="listbox" aria-label="Search results">
        {groups.games.length > 0 && (
          <li role="group" aria-label="Games">
            <GroupHeading aria-hidden="true">Games</GroupHeading>
            <ul>
              {groups.games.map((g) => {
                const key = `game:${g.favId}`;
                const i = indexOf(key);
                return <GameRow key={key} id={`casino-search-opt-${i}`} game={g} active={i === activeIndex} onHover={() => onHoverIndex(i)} onSelect={onSelectGame} isFav={isFav} onFav={onFav} />;
              })}
            </ul>
          </li>
        )}
        {groups.providers.length > 0 && (
          <li role="group" aria-label="Providers">
            <GroupHeading aria-hidden="true">Providers</GroupHeading>
            <ul>
              {groups.providers.map((p) => {
                const key = `provider:${p.id}`;
                const i = indexOf(key);
                return <ProviderRow key={key} id={`casino-search-opt-${i}`} provider={p} active={i === activeIndex} onHover={() => onHoverIndex(i)} onSelect={onSelectProvider} />;
              })}
            </ul>
          </li>
        )}
        {groups.categories.length > 0 && (
          <li role="group" aria-label="Categories">
            <GroupHeading aria-hidden="true">Categories</GroupHeading>
            <ul>
              {groups.categories.map((c) => {
                const key = `category:${c.id}`;
                const i = indexOf(key);
                return <CategoryRow key={key} id={`casino-search-opt-${i}`} category={c} active={i === activeIndex} onHover={() => onHoverIndex(i)} onSelect={onSelectCategory} />;
              })}
            </ul>
          </li>
        )}
      </ul>
    );
  }

  return (
    <>
      {liveRegion}
      {body}
    </>
  );
}

// Owns every piece of Casino search state and behavior: debounced ranking,
// recent searches, the flattened keyboard index, and routing selections to
// their real destinations. Returns the props ScopedSearch needs for the
// desktop anchored panel, plus a ready-to-render mobile full-screen surface
// — the one place both surfaces share logic, so they can never drift apart.
export function useCasinoSearch({ query, onQuery, onLaunchOnchain, onLaunchProvider, isFav, onFav, onSelectCategory }) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(loadRecentSearches);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wasOpenRef = useRef(false);
  const noResultsReportedFor = useRef(null);

  // Same technique App.jsx's mobile menu uses (see mainRef there): lock
  // <main>'s own scroll rather than document.body — this app's root shell
  // scrolls via <main>, body was never scrollable to begin with. Belt and
  // braces alongside the Dialog's own opaque full-viewport overlay, which
  // already blocks pointer/touch reach to whatever's behind it. Self-
  // contained here (not lifted to App.jsx) since search doesn't need to
  // survive an arena switch the way favorites/recent-played do.
  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    main.style.overflowY = mobileOpen ? "hidden" : "";
    return () => { main.style.overflowY = ""; };
  }, [mobileOpen]);

  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS);
  const trimmed = debouncedQuery.trim();
  const groups = useMemo(() => searchCasino(trimmed), [trimmed]);
  const mode = trimmed ? (hasAnyResults(groups) ? "results" : "no-results") : "empty";
  const flatItems = useFlatItems(mode, groups, recentSearches);

  useEffect(() => { setActiveIndex(-1); }, [mode, trimmed]);

  // casino_search_query fires once per settled (debounced) non-empty query,
  // not per keystroke — and never logs the raw query text (see SEARCH
  // ANALYTICS: "normalized query length" only).
  useEffect(() => {
    if (!trimmed) return;
    track("casino_search_query", { queryLength: trimmed.length });
  }, [trimmed]);
  useEffect(() => {
    if (mode !== "no-results" || noResultsReportedFor.current === trimmed) return;
    noResultsReportedFor.current = trimmed;
    track("casino_search_no_results", { queryLength: trimmed.length });
  }, [mode, trimmed]);

  const recordSearch = (term) => setRecentSearches((list) => addRecentSearch(list, term));
  const clearQuery = () => onQuery("");

  const closeAll = () => { setDesktopOpen(false); setMobileOpen(false); wasOpenRef.current = false; };

  const selectGame = (game, rank) => {
    (game.kind === "onchain" ? onLaunchOnchain : onLaunchProvider)(game, "search");
    recordSearch(query);
    track("casino_search_result_selected", { resultType: "game", resultId: game.favId, resultRank: rank ?? -1 });
    closeAll();
    onQuery("");
  };
  const selectProvider = (provider, rank) => {
    onSelectCategory?.("Lobby");
    scrollToRail(provider.railTarget);
    recordSearch(query);
    track("casino_search_result_selected", { resultType: "provider", resultId: provider.id, resultRank: rank ?? -1 });
    closeAll();
    onQuery("");
  };
  const selectCategory = (category, rank) => {
    // Same shared behavior the in-page CategoryNav bar uses (see
    // CasinoCatalog.jsx's activateCasinoCategory) — "Providers"/
    // "Originals" scroll to their rail, everything else changes route.
    activateCasinoCategory(category, onSelectCategory);
    if (trimmed) recordSearch(query);
    track("casino_search_result_selected", { resultType: "category", resultId: category.id, resultRank: rank ?? -1 });
    closeAll();
    onQuery("");
  };
  const selectRecent = (term) => {
    onQuery(term);
  };
  const clearRecent = () => setRecentSearches(clearRecentSearches);

  // Dispatches a flat-list entry to its type-specific handler + reports its
  // rank within its own group (not its flattened position) for analytics.
  const activateItem = (item) => {
    if (!item) return;
    if (item.type === "game") selectGame(item.payload, groups.games.indexOf(item.payload));
    else if (item.type === "provider") selectProvider(item.payload, groups.providers.indexOf(item.payload));
    else if (item.type === "category") selectCategory(item.payload, groups.categories.indexOf(item.payload));
    else if (item.type === "popular-category") selectCategory(item.payload, -1);
    else if (item.type === "recent") selectRecent(item.payload);
  };

  const onInputKeyDown = (e) => {
    if (flatItems.length === 0) {
      if (e.key === "Escape" && query) { e.preventDefault(); clearQuery(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); activateItem(flatItems[activeIndex]); }
    else if (e.key === "Escape") {
      // Two-stage: first clears the active selection, second (browser-
      // default-prevented only when there was nothing left to clear) closes
      // the panel via ScopedSearch's own fallback.
      if (activeIndex >= 0) { e.preventDefault(); setActiveIndex(-1); }
    }
  };

  const panelId = "casino-search-panel";
  const activeDescendantId = activeIndex >= 0 ? `casino-search-opt-${activeIndex}` : undefined;

  const panelBody = (
    <SearchResultsBody
      mode={mode} query={trimmed} groups={groups} recentSearches={recentSearches} flatItems={flatItems}
      activeIndex={activeIndex} onHoverIndex={setActiveIndex}
      onSelectGame={(g) => selectGame(g, groups.games.indexOf(g))}
      onSelectProvider={(p) => selectProvider(p, groups.providers.indexOf(p))}
      onSelectCategory={(c) => selectCategory(c, groups.categories.indexOf(c))}
      onSelectRecent={selectRecent}
      onClearRecent={clearRecent}
      onClearQuery={clearQuery}
      isFav={isFav} onFav={onFav}
    />
  );

  const searchPanelProps = {
    panel: panelBody,
    panelId,
    onInputKeyDown,
    activeDescendantId,
    open: desktopOpen,
    onOpenChange: (open) => {
      setDesktopOpen(open);
      if (open && !wasOpenRef.current) track("casino_search_started", {});
      wasOpenRef.current = open;
    },
    mobileMode: "fullscreen",
    onMobileFocus: () => setMobileOpen(true),
  };

  const mobileOverlay = (
    <CasinoMobileSearchDialog
      open={mobileOpen}
      onClose={() => setMobileOpen(false)}
      query={query}
      onQuery={onQuery}
      onOpen={() => { if (!wasOpenRef.current) track("casino_search_started", {}); wasOpenRef.current = true; }}
    >
      {panelBody}
    </CasinoMobileSearchDialog>
  );

  return { searchPanelProps, mobileOverlay };
}

// Full-screen mobile search — same Dialog/z-layer/safe-area pattern as
// MobileFullScreenMenu.jsx (see that file), a completely separate DOM
// surface from the inline desktop dropdown so it can own sticky header,
// internal scroll, and a real back/close control without fighting the
// anchored-panel positioning desktop uses.
function CasinoMobileSearchDialog({ open, onClose, query, onQuery, onOpen, children }) {
  const inputRef = useRef(null);
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-x-0 top-0 z-[var(--z-fullscreen-menu)] h-dvh bg-background" />
        <DialogPrimitive.Content
          id="casino-mobile-search"
          aria-label="Search Casino"
          className="fixed inset-x-0 top-0 z-[var(--z-fullscreen-menu)] flex h-dvh flex-col bg-background outline-none"
          onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); onOpen(); }}
        >
          <DialogPrimitive.Description className="sr-only">Search Casino games and categories.</DialogPrimitive.Description>
          <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top,0px))]">
            <DialogPrimitive.Close
              aria-label="Close search"
              data-test-id="casino-mobile-search-close"
              className="grid size-11 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title asChild>
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => onQuery(e.target.value)}
                  placeholder="Search games or categories"
                  aria-label="Search Casino"
                  data-test-id="casino-mobile-search-input"
                  autoComplete="off"
                  className="h-11 w-full min-w-0 rounded-lg border border-white/10 bg-zinc-900 pl-9 pr-9 text-sm text-white placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--product-primary)]"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { onQuery(""); inputRef.current?.focus(); }}
                    aria-label="Clear search"
                    data-test-id="casino-mobile-search-clear"
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </DialogPrimitive.Title>
          </div>
          <div className="tribet-scrollbar min-h-0 flex-1 overflow-y-auto pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
