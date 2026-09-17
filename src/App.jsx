import { useState, useRef, useEffect, useMemo, lazy, Suspense } from "react";
import { Analytics } from "@vercel/analytics/react";
import {
  LayoutGrid, Radio,
  Flame, Landmark, Bitcoin, Trophy, Cpu, LineChart, Wallet, ReceiptText,
  ShieldCheck, LifeBuoy, LogOut, LogIn, Settings, Loader2,
} from "lucide-react";
import { TopBar } from "./components/shell/TopBar";
import { Sidebar } from "./components/shell/Sidebar";
import { MobileBottomNav } from "./components/shell/MobileBottomNav";
import { MobileFullScreenMenu } from "./components/shell/MobileFullScreenMenu";
import { Footer } from "./components/shell/Footer";
import { Toaster } from "./components/shell/Toaster";
import { DevPanel } from "./components/dev/DevPanel";
import { PromoStrip, ScopedSearch } from "./components/casino/PromoStrip";
import { CasinoCatalog, CategoryNav, gameHref, findGameByFavId, ALL_GAMES } from "./components/casino/CasinoCatalog";
// Not lazy-loaded: this component has no heavy dependencies of its own — a
// small iframe wrapper. The actual weight for every game (BGaming's demo
// pages) is loaded on-demand via the iframe's own `src`, unrelated to this
// component's own JS bundling.
import { ProviderGame } from "./components/casino/ProviderGame";
import { CASINO_CATEGORIES, CASINO_PERSONAL_DESTINATIONS, activateCasinoCategory } from "./lib/casinoCategories";
import { useCasinoSearch } from "./components/casino/CasinoSearch";
import { useWallet } from "./web3/useWallet";
import { useDevAwareWallet } from "./lib/useDevAwareWallet";
import { toast } from "./lib/toast";
import { parsePath, pathFor, DEFAULT_NAV } from "./lib/routing";
import { applyRouteMetadata } from "./lib/seo";
import { isArenaAllowed, resolveScopedProduct, resolveEffectivePlatformScope, isFullPlatformFeatureEnabled } from "./lib/platformScope";
// PERFORMANCE task: heavy, on-demand-only surfaces are code-split via
// React.lazy rather than statically imported, so their code (and, for
// Sports/Predictions, their SDK dependencies — @azuro-org/sdk,
// @azuro-org/toolkit, @apollo/client, graphql; plus each dialog's own
// weight) never ships in the initial Casino MVP bundle. Each is already
// either conditionally rendered
// (Sports/Predictions/DesktopBetslipPanel, gated on `product`) or gated
// behind its own `open` boolean (the dialogs below) — see each render call
// site further down for the matching Suspense boundary.
const PredictionsApp = lazy(() => import("./components/predictions/PredictionsApp").then((m) => ({ default: m.PredictionsApp })));
const SportsArena = lazy(() => import("./components/sports/SportsArena").then((m) => ({ default: m.SportsArena })));
const DesktopBetslipPanel = lazy(() => import("./components/sports/DesktopBetslipPanel").then((m) => ({ default: m.DesktopBetslipPanel })));
const FundsDialog = lazy(() => import("./components/wallet/FundsDialog").then((m) => ({ default: m.FundsDialog })));
const AccountDialog = lazy(() => import("./components/wallet/AccountDialog").then((m) => ({ default: m.AccountDialog })));
const BetHistoryDialog = lazy(() => import("./components/activity/BetHistoryDialog").then((m) => ({ default: m.BetHistoryDialog })));
const ResponsibleGamblingDialog = lazy(() => import("./components/trust/ResponsibleGamblingDialog").then((m) => ({ default: m.ResponsibleGamblingDialog })));
const ComplianceBlockDialog = lazy(() => import("./components/trust/ComplianceBlockDialog").then((m) => ({ default: m.ComplianceBlockDialog })));
const SupportDialog = lazy(() => import("./components/trust/SupportDialog").then((m) => ({ default: m.SupportDialog })));
const CasinoConcierge = lazy(() => import("./components/casino/CasinoConcierge"));
const GameInfoPanel = lazy(() => import("./components/casino/GameInfoPanel").then((m) => ({ default: m.GameInfoPanel })));
import { useSportsDesktopBetslipUi, useIsDesktopBetslipLayout } from "./lib/sportsDesktopBetslipUi";
import { ArenaTileRow } from "./components/shell/ArenaTileRow";
import { ArenaPageColumn } from "./components/shell/ArenaPageColumn";
import { nowLabel } from "./lib/format";
import { PRED_CATEGORIES } from "./lib/predictionsData";
import { MVP_SPORTS } from "./lib/sportsModel";
import { getSportsInventory } from "./lib/sportsDemo";
import { useSportsBetslip } from "./lib/sportsBetslip";
import { useNormalizedAzuroEvents } from "./web3/useAzuro";
import { PREDICTIONS_PROMOS } from "./lib/arenaPromos";
import { NetworkBanner } from "./components/shell/NetworkBanner";
import { GeoBlock } from "./components/shell/GeoBlock";
import { ArenaErrorBoundary } from "./components/shell/ArenaErrorBoundary";
import { ArenaContentStage } from "./components/shell/ArenaContentStage";
import { useGeoCheck } from "./lib/geo";
import { CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from "@shared/chains";
import { track } from "./lib/telemetry";
import { useDevMockState, getDevMockState, setDevMockState } from "./lib/devMock";
import { DEV_PANEL_ENABLED } from "./lib/devPanelFlag";
import { PROFILE_VARIANT, getProfileVariant, getSignOutAction } from "./lib/profileState";
import { toggleFavorite } from "./lib/casinoFavorites";
import { usePlayerSettings } from "./lib/usePlayerSettings.jsx";
import { useRealityCheck } from "./lib/useRealityCheck";
import { installDevFetchInterceptor } from "./lib/devFetchInterceptor";
import { useCasinoGameLaunch } from "./lib/useCasinoGameLaunch";
import { GAME_LAUNCH_STATUS, isLaunchActive } from "./lib/casinoGameLaunch";
import { CasinoGamePage } from "./components/casino/CasinoGamePage";

// Module-load-time, not inside the component — idempotent (see its own
// `installed` guard) and needs to be active before BetHistoryDialog's
// first /api/* call, not after some render has already happened. No-op in
// production (see devFetchInterceptor.js).
installDevFetchInterceptor();

// Developer Panel -> Casino -> Game state: simulates the *outcome* of a
// launch attempt (provider error, maintenance, region block, insufficient
// balance) by routing it through the real launch state machine as a genuine
// UNAVAILABLE result (see useCasinoGameLaunch's checkAvailability) instead of
// a one-off toast — GameUnavailable.jsx now owns every one of these copy
// paths, so there is nothing left for a separate dev-only copy table to do.
// The specific reason below is never shown to the
// player (see UNAVAILABLE GAME STATE: "do not fake a maintenance reason") —
// it only decides *whether* checkGameAvailability blocks the launch.
// "loading" is deliberately excluded: it isn't an unavailable reason, it's a
// stuck-forever real REQUESTED/LOADING launch (see the ProviderGame onReady
// wiring below), so delayed/timeout states can be exercised through the real
// timers instead of being faked.
const DEV_UNAVAILABLE_GAME_STATUSES = new Set(["provider-error", "maintenance", "region-restricted", "insufficient-balance"]);

// Shared fallback for every lazy-loaded dialog below — the page underneath
// stays fully rendered/interactive the whole time (only the not-yet-open
// dialog's own chunk is loading), so there is no full-page blank flash to
// avoid; an sr-only status is still announced for screen-reader users per
// LOADING FALLBACKS: "accessible text status... no duplicate spinners".
// First open of a given dialog after a fresh page load briefly fetches its
// chunk; every subsequent open in the same session is instant (cached).
const DIALOG_SUSPENSE_FALLBACK = <div role="status" aria-live="polite" className="sr-only">Loading…</div>;

// Gates a lazy dialog's FIRST mount on real open-intent (so its chunk is
// never fetched until the user actually asks for it), while never
// unmounting it again afterwards — every dialog in this app relies on
// Radix's own `data-[state=closed]:animate-out` close transition, which
// requires staying mounted (with `open` flipping to false) rather than
// disappearing immediately (see DO NOT CHANGE: "visual design" — losing
// the close animation on every dialog would be exactly that). The real
// `open` boolean is still what the caller passes down and what controls
// Radix's actual visible open/close state; this only ever decides whether
// to render the component (and therefore fetch its chunk) at all yet.
function useLazyMount(isOpen) {
  const [everOpened, setEverOpened] = useState(isOpen);
  useEffect(() => { if (isOpen) setEverOpened(true); }, [isOpen]);
  return everOpened;
}

// Sports/Predictions arena chunks are a full main-content-area surface, not
// a small dialog — an sr-only-only fallback would leave <main> visibly
// blank for a moment (see LOADING FALLBACKS: "no full-page blank flash"),
// so this one is visibly present with real text, matching the same
// spinner+text pattern GameLoading.jsx's own loading state already uses.
function ArenaLoadingFallback({ label }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center justify-center gap-3 py-24 text-center text-muted-foreground">
      <Loader2 className="size-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <p className="text-sm">Loading {label}…</p>
    </div>
  );
}

// Favorites and recently-played are PLAYER SETTINGS now, stored per wallet and
// synced across devices (see lib/usePlayerSettings.jsx). They used to be three
// separate localStorage buckets here — a device bucket, a per-address bucket
// simulating a backend, and a baseline ref to merge between them — because
// there was no backend to key them to. There is one now: the settings store
// owns the scoping (including seeding a newly-connected wallet from whatever
// was chosen before connecting — see lib/playerSettingsStorage.js's
// readAccountEnvelope), so none of that machinery lives here anymore.
//
// Recently-played is capped here as well as in the store (the store's cap is a
// storage bound; this is the product's "how long is the rail" number).
const RECENT_CAP = 12;

const PRED_ICONS = {
  Trending: Flame, Politics: Landmark, Crypto: Bitcoin, Sports: Trophy, Tech: Cpu, Economy: LineChart,
};

// Sidebar rail mode ("expanded" | "collapsed") persists across sessions —
// an explicit user choice always wins over the breakpoint default below.
const SIDEBAR_KEY = "casinoSidebarState";
const loadSidebarMode = () => {
  try { return localStorage.getItem(SIDEBAR_KEY); } catch { return null; }
};
const saveSidebarMode = (mode) => {
  try { localStorage.setItem(SIDEBAR_KEY, mode); } catch { /* ignore */ }
};

export default function App() {
  // Geo-block: a page-level state, checked before anything else renders —
  // no header, sidebar or game grid ever mounts behind it. Stubbed to always
  // allow for now (see useGeoCheck); the gate itself is real.
  const geo = useGeoCheck();

  // Seed navigation from the URL so deep links work. Resolved against the
  // Developer Panel's Platform Scope mock (see lib/platformScope.js's
  // resolveEffectivePlatformScope — the one shared resolver every surface
  // that needs "the platformScope in effect right now" calls, instead of
  // each independently re-deriving it) so a deep link straight into
  // /sports or /predictions while in MVP mode lands on Casino instead.
  const initialNav = parsePath(typeof window !== "undefined" ? window.location.pathname : "/");
  const initialPlatformScope = resolveEffectivePlatformScope(getDevMockState());
  const [product, setProduct] = useState(resolveScopedProduct(initialNav.product, initialPlatformScope));

  // NAV SPEC §4.3 — "Every overlay owns a `modal` query param value...
  // Opening = pushState. Browser back closes the modal and returns to the
  // exact prior state. Every modal is deep-linkable and shareable." Covers
  // the app's six previously URL-less dialogs (Funds/History/Responsible
  // Gambling/Support/Account/Compliance-block — see openFunds etc. below);
  // Casino's `?play=`/`?info=` params are deliberately left alone — both
  // already satisfy the same behavior (URL-driven, deep-linkable, closed by
  // Back) under their own established, working, Casino-specific names, so
  // migrating them to a generic `modal=` value would be a pure style
  // change with real regression risk for zero behavioral gain.
  const readModalParam = () => new URLSearchParams(window.location.search).get("modal");
  const [modal, setModal] = useState(() => (typeof window !== "undefined" ? readModalParam() : null));
  const openModal = (name) => {
    const url = new URL(window.location.href);
    url.searchParams.set("modal", name);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setModal(name);
  };
  // Closing always goes through the browser's own Back when WE pushed the
  // modal entry (the ✕ button and a real Back press must be indistinguishable
  // — both just remove the one history entry the open added) — falling back
  // to a plain state clear only for the edge case of a modal opened via a
  // fresh deep link/reload, where there is no "opened this" history entry
  // for Back to land on.
  const closeModal = () => {
    if (readModalParam()) window.history.back();
    else setModal(null);
  };

  // Desktop/tablet (≥768px): a persistent expanded/collapsed rail, never
  // fully hidden. Defaults (no stored preference): expanded ≥1280px,
  // collapsed 768-1279px.
  const [railMode, setRailMode] = useState(() => {
    const stored = loadSidebarMode();
    if (stored === "expanded" || stored === "collapsed") return stored;
    if (typeof window === "undefined") return "expanded";
    return window.innerWidth >= 1280 ? "expanded" : "collapsed";
  });
  // Mobile (<768px): one explicit open/closed state for the full-screen
  // section menu — never persisted, never carries over from desktop's
  // expanded/collapsed preference (a genuinely different concept: this is
  // "is the section menu open", not "how wide is the rail").
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Scroll lock for the mobile menu targets <main> directly, not
  // document.body — this app's root is a fixed h-dvh/overflow-hidden shell
  // with <main> as the only scrollable region, so body was never
  // scrollable to begin with (no scrollbar-compensation/gutter-shift logic
  // needed). Toggling overflow never touches scrollTop, so the exact scroll
  // position is preserved automatically with no jump on close.
  const mainRef = useRef(null);
  // CASINO GAME EXPERIENCE (routing): <main>'s scroll position captured on
  // game launch, restored on close — see launchGame/closeGame below.
  const lobbyScrollTopRef = useRef(null);
  // NAV SPEC §5.3 — "expanded-rail depth" (how many items each Lobby rail's
  // Load More has revealed, see CasinoCatalog.jsx's CasinoGameRail) must
  // survive a round-trip through a game the same way scroll position does.
  // Lifted here (App.jsx never unmounts across a game launch/close, unlike
  // CasinoLobby/LobbyDashboard/CasinoGameRail, which fully remount) rather
  // than encoded in the URL — a Lobby can have several independently-
  // expanded rails at once, and a `?expanded=a,b,c`-style param for that is
  // more fragile than plain session state for no real deep-linking benefit
  // (nobody shares "with these specific rails pre-expanded" as a link).
  // Keyed by each rail's own `testId` (already a stable, unique per-rail
  // identity used for data-test-id) -> how many of that rail's items are
  // currently visible (HOTFIX: a count, not a boolean — every rail now
  // pages by RAIL_PAGE_SIZE instead of revealing everything at once; see
  // CasinoCatalog.jsx). Session-only (a plain useState, not persisted to
  // localStorage) — this only needs to survive within one browser
  // session's back/forward, not a full reload.
  const [expandedRails, setExpandedRails] = useState(() => new Map());
  const expandRail = (testId, totalCount) => setExpandedRails((prev) => {
    const RAIL_PAGE_SIZE = 8;
    const current = prev.get(testId) ?? Math.min(RAIL_PAGE_SIZE, totalCount);
    const next = Math.min(current + RAIL_PAGE_SIZE, totalCount);
    if (next === current) return prev;
    const copy = new Map(prev);
    copy.set(testId, next);
    return copy;
  });
  useEffect(() => {
    const el = mainRef.current;
    if (el) el.style.overflowY = mobileMenuOpen ? "hidden" : "";
  }, [mobileMenuOpen]);
  // Focus target for "navigate" closes (arena/section selection — see
  // MobileFullScreenMenu's action-specific focus restoration): <main> is
  // the one stable landmark every destination page renders into, so
  // focusing it directly (via tabIndex={-1} below) satisfies "focus
  // destination page heading or main content" without needing a
  // per-page heading ref — the standard, low-risk pattern for "route
  // change moves focus to the main region."
  const focusMainContent = () => mainRef.current?.focus();

  // Cross-tab sync: another tab flipping the rail mode updates this one too.
  // Guarded so it never fires from our own write (storage events only reach
  // *other* tabs) and never touches the mobile menu, which is per-tab and
  // ephemeral by design.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== SIDEBAR_KEY) return;
      if (e.newValue !== "expanded" && e.newValue !== "collapsed") return;
      setRailMode((current) => (current === e.newValue ? current : e.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Crossing into desktop width closes the mobile menu and drops its state
  // cleanly; crossing back into mobile always starts closed (this state is
  // never carried across the breakpoint in either direction).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = (e) => { if (e.matches) setMobileMenuOpen(false); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Desktop-only now — the mobile burger is CSS-hidden below 768px (see
  // TopBar), so this never runs at mobile widths.
  const toggleSidebar = () => {
    setRailMode((m) => {
      const next = m === "expanded" ? "collapsed" : "expanded";
      saveSidebarMode(next);
      track(next === "expanded" ? "casino_nav_expanded" : "casino_nav_collapsed", { sidebarState: next });
      return next;
    });
  };
  const sidebarLabel = railMode === "expanded" ? "Collapse menu" : "Expand menu";

  const toggleMobileMenu = () => {
    setMobileMenuOpen((open) => {
      const next = !open;
      // OVERLAY OWNERSHIP: only one primary modal/focus trap is ever active.
      // The other direction (funds/history/rg/support/games -> close the
      // menu first) was already true before this task; this is the
      // missing reverse guard — opening the menu closes anything else that
      // might currently hold focus/scroll-lock, so the menu never stacks
      // on top of another dialog.
      if (next) closeOtherOverlays();
      track(next ? "mobile_menu_opened" : "mobile_menu_closed", { arena: product });
      return next;
    });
  };

  const [casinoCategory, setCasinoCategory] = useState(initialNav.casinoCategory);
  // TWO-ROUTE SPLIT (spec §4.1): "dashboard" (default multi-rail Lobby),
  // "home" (chip-driven in-lobby filter — promo+chips retained, grid
  // replaces rails), "category" (standalone destination — hero+filter+
  // sort+grid, no promo/chips), "providers"/"provider" (spec §6.2's
  // provider route family). Kept alongside `casinoCategory` rather than
  // folded into it, since the same category can be reached via either of
  // two different views (or, for a provider page, no content category at
  // all is selected).
  const [casinoView, setCasinoView] = useState(initialNav.casinoView);
  const [casinoProviderSlug, setCasinoProviderSlug] = useState(initialNav.casinoProviderSlug);
  // Single place every Casino content-category selection goes through, so
  // `casinoCategory`/`casinoView`/`casinoProviderSlug` can never drift out
  // of sync with each other (a call site that only set `casinoCategory`
  // would silently fall back to the Lobby path in `pathFor` — see
  // routing.js). `view` defaults to "category" (spec §4.1: "Entered from:
  // sidebar, rail View All" -> the destination route) since every existing
  // call site (sidebar, search, rail "See all") already meant exactly that
  // before this split existed; only the chip rail's new "home" filter
  // click passes `"home"` explicitly. Lobby/Favorites/Recently Played have
  // no "home"/"category" distinction, so the view always collapses to
  // "dashboard" for them regardless of what's passed.
  const selectCasinoCategory = (id, view = "category") => {
    setCasinoCategory(id);
    setCasinoView(id === "Lobby" || id === "Favorites" || id === "Recently Played" ? "dashboard" : view);
    setCasinoProviderSlug(null);
  };
  const selectCasinoProvidersIndex = () => {
    setCasinoCategory("Lobby");
    setCasinoView("providers");
    setCasinoProviderSlug(null);
  };
  const selectCasinoProvider = (providerId) => {
    setCasinoCategory("Lobby");
    setCasinoView("provider");
    setCasinoProviderSlug(providerId);
  };
  const [predSection, setPredSection] = useState(initialNav.predSection);
  // Sports nav is a deeper hierarchy than the other two arenas (sport ->
  // country -> league -> event), so it's five fields instead of one — see
  // lib/routing.js. `sportsView` is the one source of truth for which of
  // the six Sports page types is showing; the other four are only ever
  // populated for the views that need them.
  const [sportsView, setSportsView] = useState(initialNav.sportsView);
  const [sportsSport, setSportsSport] = useState(initialNav.sportsSport);
  const [sportsCountry, setSportsCountry] = useState(initialNav.sportsCountry);
  const [sportsLeague, setSportsLeague] = useState(initialNav.sportsLeague);
  const [sportsEventId, setSportsEventId] = useState(initialNav.sportsEventId);

  // Keep the URL in sync with navigation, and restore state on back/forward.
  useEffect(() => {
    const nav = { product, casinoCategory, casinoView, casinoProviderSlug, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId };
    const path = pathFor(nav);
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    // Title/description/canonical follow the same resolved route the URL
    // does. Driven off `path` rather than window.location so a deep link
    // that got scoped elsewhere (e.g. /sports in MVP mode lands on Casino)
    // canonicalises to where the user actually is, not where they aimed.
    applyRouteMetadata(path, nav);
  }, [product, casinoCategory, casinoView, casinoProviderSlug, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId]);
  // FINAL QA fix: this listener is attached once ([] deps — re-adding it
  // every render would be wasteful, and every setter below is already
  // stable) but its body calls `resolveLaunchFromUrl`/`resolveInfoFromUrl`,
  // which read `launch.state` — a plain `const` re-created fresh each
  // render, NOT stable across renders. With the body inlined directly in
  // the effect, the closure captured at mount would freeze `launch.state`
  // at its INITIAL (idle, no gameId) value forever, so every later
  // `popstate` (e.g. Game Info's own close-via-`history.back()`) would see
  // a permanently stale "idle" launch state, fail resolveLaunchFromUrl's
  // "already on this game" guard, and force a full spurious relaunch of
  // the game underneath it — confirmed via a real Playwright trace: after
  // Game Info's close-button/back path, `launch.state.status` read as
  // "idle" no matter how long the game had actually been running, and the
  // game visibly reloaded from scratch. A ref updated every render (not
  // the listener itself) keeps the listener registration stable while the
  // body it calls always sees the latest state — the same "ref holds the
  // latest, effect subscribes once" idea already used for `lastFocusedRef`
  // above.
  const onPopRef = useRef(null);
  onPopRef.current = () => {
    const nav = parsePath(window.location.pathname);
    const scope = resolveEffectivePlatformScope(getDevMockState());
    setProduct(resolveScopedProduct(nav.product, scope));
    setCasinoCategory(nav.casinoCategory);
    setCasinoView(nav.casinoView);
    setCasinoProviderSlug(nav.casinoProviderSlug);
    setPredSection(nav.predSection);
    setSportsView(nav.sportsView);
    setSportsSport(nav.sportsSport);
    setSportsCountry(nav.sportsCountry);
    setSportsLeague(nav.sportsLeague);
    setSportsEventId(nav.sportsEventId);
    setModal(readModalParam());
    resolveLaunchFromUrl();
    resolveInfoFromUrl();
  };
  useEffect(() => {
    const onPop = () => onPopRef.current?.();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Sports inventory (real Azuro + demo-mode placeholders) — fetched once
  // here, not inside SportsArena, since the sidebar/mobile-menu live-count
  // badges need the same merged data.
  const { events: sportsProviderEvents, loading: sportsLoading } = useNormalizedAzuroEvents();
  const sportsEvents = useMemo(() => getSportsInventory({ providerEvents: sportsProviderEvents }), [sportsProviderEvents]);
  // Lifted here (not owned inside SportsArena) for the same reason as favs/
  // activity/recentIds above: SportsArena remounts on every arena switch
  // (see the <ArenaErrorBoundary key={product}> below), so state that must
  // survive leaving Sports for Casino/Predictions and coming back can't
  // live inside it.
  const sportsBetslip = useSportsBetslip();
  // Desktop betslip panel open/collapsed state — presentation-only, kept
  // separate from sportsBetslip itself (see sportsDesktopBetslipUi.js).
  // Lifted here for the same "must survive leaving Sports" reason as
  // sportsBetslip above.
  const sportsDesktopUi = useSportsDesktopBetslipUi(sportsBetslip.selectionCount);
  const isDesktopBetslipLayout = useIsDesktopBetslipLayout();
  const navigateSports = (patch) => {
    if ("view" in patch) setSportsView(patch.view);
    if ("sport" in patch) setSportsSport(patch.sport);
    if ("country" in patch) setSportsCountry(patch.country);
    if ("league" in patch) setSportsLeague(patch.league);
    if ("eventId" in patch) setSportsEventId(patch.eventId);
  };

  // Wallet connection replaces password login. Connecting (on the right network)
  // is the gate for placing bets; the Reown modal handles the connect flow.
  const wallet = useWallet();
  // A landing CTA must perform its named action, not merely navigate here.
  // Consume the intent once: refresh/Back must not repeatedly reopen AppKit.
  const connectIntentHandled = useRef(false);
  useEffect(() => {
    if (modal !== "connect" || connectIntentHandled.current) return;
    if (wallet.status === "reconnecting") return;
    connectIntentHandled.current = true;
    const url = new URL(window.location.href);
    if (wallet.isConnected) url.searchParams.set("modal", "funds");
    else url.searchParams.delete("modal");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    setModal(wallet.isConnected ? "funds" : null);
    if (!wallet.isConnected) {
      Promise.resolve(wallet.connect()).catch(() => {
        toast.error("Wallet picker could not open", { message: "Please try Connect Wallet again." });
      });
    }
  }, [modal, wallet]);
  // Dev-aware ONLY for the mobile account section's isConnected read below
  // (see accountItems) — everything else in this file (ensureAuth, balance
  // merging, chain tracking) deliberately keeps using the real `wallet`
  // above, unchanged. Without this, the Developer Panel's Wallet preset
  // would have no effect on the mobile menu's Account rows, since the real
  // wallet.isConnected can't see the mock (see TopBar.jsx, which already
  // reads this same hook for its own desktop ProfileMenu).
  const devWallet = useDevAwareWallet();
  // Developer Panel (Shift+D) mock state — active only when
  // VITE_ENABLE_DEV_PANEL is set (see lib/devPanelFlag.js's
  // DEV_PANEL_ENABLED), so every field below reflects whatever the panel
  // has been set to when it's on, and reads as "default" (inert) until
  // someone touches the panel. See INTEGRATION PRIORITY: Casino
  // favorites/recently played/game state are wired here (App.jsx), not
  // deeper inside CasinoLobby/CasinoCatalog, so those components stay
  // untouched. `platformScope` is the one exception to "default = inert":
  // resolved via resolveEffectivePlatformScope (lib/platformScope.js) — the
  // one shared resolver Sidebar.jsx/MobileBottomNav.jsx/PromoStrip.jsx/
  // Footer.jsx also call, instead of each independently re-deriving it —
  // so disabling the Dev Panel can never silently promote the product to
  // Full mode anywhere in the app, not just here.
  const devMock = useDevMockState();
  const platformScope = resolveEffectivePlatformScope(devMock);
  // "Switching to MVP while inside Sports or Predictions immediately
  // redirects to Casino" — also the safety net for the initial-load/popstate
  // resolution above (resolveScopedProduct), in case of any other path that
  // lands `product` on a disallowed arena.
  useEffect(() => {
    if (!isArenaAllowed(product, platformScope)) {
      setProduct("casino");
      selectCasinoCategory(DEFAULT_NAV.casinoCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to
    // scope flips and product changes, not every unrelated devMock field.
  }, [platformScope, product]);
  // Developer Panel -> Transactions: no deposit/withdrawal system exists
  // in this app at all (see DO NOT ADD: "fake backend") — rather than
  // fabricate one, each selection fires the same customer-safe toast copy
  // a real transaction of that kind would show, via the app's existing
  // toast mechanism (see lib/toast.js), so every transaction-state's copy
  // is reviewable without inventing backing data. Effect (not inline in the
  // <select> handler) so it also fires correctly on session-restore.
  useEffect(() => {
    if (!DEV_PANEL_ENABLED) return;
    const copy = {
      "deposit-pending": { type: "info", title: "Deposit pending", message: "Waiting for confirmations." },
      "deposit-confirmed": { type: "success", title: "Deposit confirmed", message: "Your balance has been updated." },
      "withdrawal-pending": { type: "info", title: "Withdrawal pending", message: "Waiting for confirmations." },
      "withdrawal-failed": { type: "error", title: "Withdrawal failed", message: "Please try again or contact support." },
      "bet-won": { type: "success", title: "Bet won", message: "Winnings have been credited." },
      "bet-lost": { type: "error", title: "Bet lost", message: "Better luck next time." },
    }[devMock.transactionStatus];
    if (copy) toast[copy.type](copy.title, { message: copy.message });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire only on
    // an actual selection change, not on every unrelated devMock update.
  }, [devMock.transactionStatus]);

  const [balance, setBalance] = useState(250);
  const [activity, setActivity] = useState([]);
  // Derived from the settings store rather than held as its own state, so there
  // is exactly one source of truth for favorites (see the note above the
  // RECENT_CAP constant). `readSettings` is the synchronous escape hatch the
  // rapid-click path needs — see toggleFav.
  const { settings: playerSettings, readSettings, updateGroup: updateSettings } = usePlayerSettings();
  // Delivers the reality-check reminder the player configured in Responsible
  // Gaming — mounted once here, app-wide, since it is about time spent in the
  // app rather than any one screen.
  useRealityCheck();
  const favs = useMemo(() => new Set(playerSettings.casino.favorites), [playerSettings.casino.favorites]);
  const setFavorites = (set) => updateSettings("casino", { favorites: [...set] });
  // FAVORITES ADD CUE — a brief, premium attention pulse on the sidebar's
  // own Heart icon (see the sidebar builder below) every time a favorite is
  // successfully ADDED, so a player who just favorited a game from a card
  // (with no lobby rail to look at anymore — see FAVORITES LOBBY REMOVAL)
  // always sees where it landed — not just on the very first favorite.
  // Purely transient UI state, never persisted. A monotonically increasing
  // sequence rather than a boolean: Sidebar.jsx keys the animated icon off
  // this value, so each new add remounts and replays the animation fresh
  // even if the previous one is still mid-flight (see index.css's
  // sidebar-fav-heart-pulse) — no timeout/cleanup needed, since the CSS
  // animation is a single finite play with no fill-mode holding it open.
  const [favoritesCueSeq, setFavoritesCueSeq] = useState(0);
  const recentIds = playerSettings.casino.recentlyPlayed;
  const trackRecent = (game) => {
    const list = readSettings().casino.recentlyPlayed;
    updateSettings("casino", { recentlyPlayed: [game.favId, ...list.filter((id) => id !== game.favId)].slice(0, RECENT_CAP) });
  };

  // Known-unavailable before any init is attempted: a Developer Panel
  // simulation of a provider-side outage. Returning any truthy reason here
  // is what makes useCasinoGameLaunch skip straight to UNAVAILABLE instead
  // of ever opening the launch surface's loading state (see UNAVAILABLE
  // GAME STATE: "do not open a loading state first when availability is
  // already known").
  const checkGameAvailability = () =>
    (DEV_PANEL_ENABLED && DEV_UNAVAILABLE_GAME_STATUSES.has(devMock.gameStatus) ? devMock.gameStatus : null);

  // The one shared Casino game-launch state machine — every entry point
  // (Lobby rail, category page, search, Favorites, Recently Played, a direct
  // `?play=` link) drives this through launchGame below rather than each
  // owning its own isLoading/showGame/launchFailed booleans (see PRIMARY
  // GOAL). `onReady` is the single, real "this launch actually succeeded"
  // signal Recently Played is keyed on — never the click itself (see
  // RECENTLY PLAYED RULES).
  const launch = useCasinoGameLaunch({
    resolveGame: findGameByFavId,
    checkAvailability: checkGameAvailability,
    onReady: (game) => { if (game) trackRecent(game); },
  });
  const launchedGame = findGameByFavId(launch.state.gameId);
  // A Casino game is on screen, so the page below <main> must stay exactly as
  // tall as <main> — see the Footer gate in the render tree.
  const gameIsOpen = product === "casino" && isLaunchActive(launch.state.status);

  // Game info — a plain sibling piece of state, entirely separate from
  // `launch` (see useCasinoGameLaunch above): opening/closing it never
  // dispatches a launch action, so it can't remount the game, reset a
  // round, or touch Recently Played (see GAMEPLAY INTEGRATION). Viewable
  // independent of an active launch too (a direct `?info=` link works
  // whether or not `?play=` is also present — see GAME DETAILS ENTRY
  // POINTS: "direct game-detail route").
  const [infoFavId, setInfoFavId] = useState(null);
  const infoGame = infoFavId ? findGameByFavId(infoFavId) : null;
  // Tracks whether the CURRENT `info` URL entry was pushed by openGameInfo
  // in this tab (vs. arrived at via a direct link/reload/Back) — only then
  // is it safe to close via history.back() instead of replaceState, so
  // Back really does "close info before closing gameplay" (see ESCAPE AND
  // BROWSER BACK) without ever assuming history-stack shape it can't verify.
  const infoPushedRef = useRef(false);
  // Its own dedicated trigger ref, NOT the shared `lastFocusedRef` above —
  // that tracker freezes capture as soon as ANY `[role="dialog"]` is
  // present, which is correct for the 7 Radix dialogs (each opened from a
  // trigger with no other dialog yet open). CASINO GAME EXPERIENCE: the
  // game surface itself (CasinoGamePage/GameStage) is no longer a
  // `role="dialog"` — it's a real inline page now, not a modal overlay —
  // so this is arguably no longer strictly required for that original
  // reason. Left in place anyway as a robust, redundant capture: capturing
  // `document.activeElement` synchronously inside openGameInfo's own click
  // handler is exact regardless of what else is mounted at that moment
  // (Game Info itself is still `role="dialog"`, and can still open while a
  // game is playing), and changing a working focus-restoration path
  // without new evidence it's actually broken wasn't worth the risk here.
  const gameInfoTriggerRef = useRef(null);

  // Whether the NEXT Funds/Wallet dialog open should land straight on its
  // own confirm-disconnect screen instead of the plain wallet view — set
  // just before opening (see openDisconnectWallet below), read once by
  // FundsDialog's `startAtDisconnectConfirm` prop. Not modal-param-backed
  // like `modal` itself: this only decides which of FundsDialog's OWN
  // internal states it opens on, not a distinct dialog/URL of its own (see
  // DISCONNECT WALLET WIRING task: reuse the existing confirm flow, don't
  // fork a second modal for it).
  const [fundsStartAtDisconnectConfirm, setFundsStartAtDisconnectConfirm] = useState(false);

  // Each derived straight from the one URL-backed `modal` value above —
  // only one of these is ever true at a time, since only one modal name can
  // occupy the param.
  const fundsOpen = modal === "funds";
  const historyOpen = modal === "history";
  const rgOpen = modal === "rg";
  const supportOpen = modal === "support";
  const accountOpen = modal === "account";
  const complianceBlockOpen = modal === "compliance-block";

  // PERFORMANCE task: each of these lazy dialogs' chunk is only fetched
  // once it's genuinely been requested open — see useLazyMount above.
  const infoMounted = useLazyMount(!!infoFavId);
  const historyMounted = useLazyMount(historyOpen);
  const accountMounted = useLazyMount(accountOpen);
  const rgMounted = useLazyMount(rgOpen);
  const supportMounted = useLazyMount(supportOpen);
  const complianceBlockMounted = useLazyMount(complianceBlockOpen);
  const fundsMounted = useLazyMount(fundsOpen);

  // OVERLAY OWNERSHIP: the one place every other App-level overlay gets
  // closed from, so opening any of them (including the mobile menu, see
  // toggleMobileMenu) never stacks a second live focus trap/scroll lock on
  // top of another. The Sports mobile betslip sheet isn't included here —
  // its open state lives inside SportsArena (by design, so it can survive
  // arena remounts — see lib/sportsBetslip.js), and in practice it can
  // never collide with these: its own z-[var(--z-transaction-overlay)]
  // already sits above the bottom nav, so none of these triggers are
  // reachable while it's open. The one real collision risk — opening the
  // betslip while ANY of these (including the menu) happen to be open — is
  // guarded from the other side, in SportsArena's pick().
  const closeOtherOverlays = () => {
    // A plain state clear, not closeModal()'s history.back() — this fires
    // right before some OTHER navigation (opening a different overlay,
    // launching a game, switching arenas), which will itself update the URL;
    // going back here too would remove an extra, unrelated history entry.
    setModal(null);
    closeGame();
  };

  // Gate: require a connected wallet on Base Sepolia before betting.
  const ensureAuth = () => {
    if (!wallet.isConnected) { setMobileMenuOpen(false); wallet.connect(); return false; }
    if (!wallet.onCasinoChain) { toast.warning("Switch to Base Sepolia to continue"); wallet.switchTo(CASINO_CHAIN_ID); return false; }
    return true;
  };

  // Global network state, detected once from the wallet's real chainId (not
  // per-card): "wrong" is relative to whichever arena is active — Casino
  // wants Base Sepolia, Sports wants Polygon Amoy, Predictions is mock (no
  // chain requirement). Game/market cards never detect this themselves.
  const arenaChainId = product === "sports" ? SPORTS_CHAIN_ID : CASINO_CHAIN_ID;
  const wrongNetwork = wallet.isConnected && product !== "predictions" &&
    (product === "sports" ? !wallet.onSportsChain : !wallet.onCasinoChain);
  // Real, existing data (same `activity` array the Sports sidebar's own
  // My Bets badge already reads — see sidebar.items above) — never a fake/
  // decorative unread dot (see ACTIVITY ACCESS: "no decorative unread dot
  // without data").
  const openPositionsCount = activity.filter((a) => a.status === "open").length;

  // FINAL QA fix — focus-restore regression from lazy-loading these
  // dialogs (see PERFORMANCE task's useLazyMount): Radix's own default
  // focus-restore-on-close only works reliably when the Dialog has been
  // mounted continuously since before it opened, so its FocusScope can
  // correctly capture "what was focused right before I opened." On a
  // dialog's very FIRST open, useLazyMount mounts it for the first time at
  // the exact moment `open` becomes true, which is too late to correctly
  // capture the real trigger when the trigger is a ProfileMenu item:
  // clicking "Account" moves DOM focus onto that menu item first (Radix's
  // own roving focus), the item is removed the instant the dropdown
  // closes, and — traced via a real focusin listener — the dropdown's own
  // onCloseAutoFocus DOES correctly refocus the profile-trigger button
  // moments later, but only AFTER this new Dialog has already opened and
  // moved focus into its own content, so that correct intermediate
  // "back to the trigger" moment is immediately overwritten and lost.
  // Fix: track the most recent focusin target continuously, but FREEZE
  // that tracking once a Dialog has actually MOUNTED in the DOM (checked
  // directly, not via React's `accountOpen`-style state — that flips true
  // immediately on click, well before the lazy chunk resolves, whereas the
  // real race is against the closing dropdown's own async
  // onCloseAutoFocus, which runs DURING that gap and correctly refocuses
  // the profile-trigger button — freezing on the state flip alone missed
  // that event every time, confirmed via a real focusin trace). Once the
  // new Dialog's own content actually mounts (`[role="dialog"]` — Radix's
  // own default role, true for all of these), it starts auto-focusing its
  // own content, which must NOT overwrite the frozen "restore to" value.
  // Same manual capture/restore idea MobileFullScreenMenu.jsx already uses
  // for an analogous problem, delivered here via `onCloseAutoFocus`.
  const lastFocusedRef = useRef(null);
  useEffect(() => {
    const onFocusIn = (e) => {
      if (document.querySelector('[role="dialog"]')) return;
      lastFocusedRef.current = e.target instanceof HTMLElement ? e.target : null;
    };
    window.addEventListener("focusin", onFocusIn, true);
    return () => window.removeEventListener("focusin", onFocusIn, true);
  }, []);
  const restoreFocusFrom = (ref) => (e) => {
    e?.preventDefault?.();
    const el = ref.current;
    if (el && document.contains(el)) el.focus();
    ref.current = null;
  };
  const restoreFocus = restoreFocusFrom(lastFocusedRef);

  // Only one overlay owns focus/scroll-lock at a time — any dialog opening
  // closes the mobile drawer first so they never stack.
  const openFunds = () => { setMobileMenuOpen(false); if (!ensureAuth()) return; setFundsStartAtDisconnectConfirm(false); openModal("funds"); };
  // The mobile menu's "Disconnect Wallet" — opens the SAME FundsDialog
  // every other wallet entry point does, just pre-set to land on its own
  // "Disconnect Wallet?" confirm screen (FundsDialog's
  // startAtDisconnectConfirm prop) instead of the plain wallet view. This
  // is the real wallet-disconnect flow (runDisconnect/disconnectAsync,
  // loading/error/success states, the Cancel/Disconnect confirmation) —
  // never signOut, which is a separate account/session action (see MOBILE
  // MENU ACCOUNT ACTIONS: "Disconnect Wallet and Sign out ... must NOT
  // share behavior").
  const openDisconnectWallet = () => { setMobileMenuOpen(false); if (!ensureAuth()) return; setFundsStartAtDisconnectConfirm(true); openModal("funds"); };
  const openHistory = () => { setMobileMenuOpen(false); if (!ensureAuth()) return; openModal("history"); };
  // Not wallet-gated — Responsible Gambling/Support are reachable whether
  // or not a wallet is connected. Hoisted out of Footer's own inline
  // handlers so the new desktop ProfileMenu (see TopBar.jsx) can open the
  // exact same dialogs rather than a second copy.
  const openRg = () => { setMobileMenuOpen(false); openModal("rg"); };
  const openSupport = () => { setMobileMenuOpen(false); openModal("support"); };
  // Not wallet-gated — Account is reachable logged-out and session-expired
  // too (it renders its own sign-in entry point in those cases; see
  // AccountDialog.jsx), unlike Wallet/Activity which require a connected
  // wallet before there's anything real to show.
  const openAccount = () => { setMobileMenuOpen(false); openModal("account"); };

  // Player Profile / Account — same auth/wallet-independence model
  // TopBar.jsx's desktop ProfileMenu uses (see lib/profileState.js),
  // computed here too since the mobile account section (below, in
  // mobileMenu) needs it for its own item list. `devMock.authStatus` reads
  // as "default" wherever `DEV_PANEL_ENABLED` is off (see devMock.js), so
  // `profileVariant` falls back to deriving from the real
  // `wallet.isConnected` there — no separate auth system, per this app's
  // existing architecture (see devMock.js's own note on this).
  const authStatus = DEV_PANEL_ENABLED ? devMock.authStatus : "default";
  const profileVariant = getProfileVariant({ authStatus, isConnected: devWallet.isConnected });
  // Mirrors TopBar.jsx's identical handleSignOut — see lib/profileState.js's
  // getSignOutAction for why this never disconnects the real wallet just to
  // clear a *mocked* auth state (see SIGN OUT: "preserve wallet connection
  // unless current product logic explicitly disconnects it").
  const signOut = () => {
    setMobileMenuOpen(false);
    if (DEV_PANEL_ENABLED && getSignOutAction(authStatus) === "reset-auth-mock") {
      setDevMockState({ authStatus: "logged-out" });
    } else {
      wallet.disconnect();
    }
  };

  // Game tiles are real links (`?play=<favId>`) so middle-click / cmd-click opens
  // a new tab, like on most sites. These helpers keep that URL in sync with the
  // launch state for the in-page (left-click) path, and resolve it back to a
  // launch on load / back-forward so the link actually works when followed.
  // `context` ("home" | "favorites" | "recent" | "category" | "search" |
  // "direct-link") is the launch's `source` — forwarded from CasinoGameCard/
  // search's own launch calls (see CasinoCatalog.jsx's CasinoGameCard) into
  // useCasinoGameLaunch's analytics, never used for any gating/behavior
  // decision here.
  //
  // Every game is a provider (BGaming) game — no wallet gate, no compliance
  // gate: this app's only real-money action was launching a playable
  // onchain BetSwirl game, which no longer exists (see complianceState.js's
  // SENSITIVE_ACTIONS comment). Provider games run on a mock economy and
  // need neither (see AUTH AND WALLET INDEPENDENCE).
  const attemptLaunch = (game, source, categoryId) => {
    launch.launchCasinoGame({ gameId: game ? game.favId : null, source, categoryId });
  };
  // ARENA-SWITCH TEARDOWN — Game Info and Report Issue are global overlays
  // (rendered as plain siblings of the arena content, not gated on
  // `product === "casino"` — see App.jsx's own render tree), so leaving
  // Casino for any reason (a new launch superseding them, the internal
  // Back button, an arena switch, Casino-internal navigation while playing)
  // must close them explicitly or they'd stay visible over whatever comes
  // next. Nulling the focus-restore refs BEFORE closing (rather than
  // calling closeGameInfo(), which also does its own history.back() — wrong
  // here, since the caller is about to push/replace its own URL) means the
  // existing "restore focus on close" effects see an already-null ref and
  // safely no-op (see restoreFocusFrom's `if (el && document.contains(el))`
  // guard) instead of trying to refocus a Casino element that's mid-unmount
  // — "let the destination own focus," not the element that's disappearing.
  const closeCasinoGameOverlays = () => {
    if (infoFavId) {
      gameInfoTriggerRef.current = null;
      setInfoFavId(null);
    }
    if (supportOpen) {
      lastFocusedRef.current = null;
      setModal(null);
    }
  };
  const launchGame = (game, context) => {
    // CASINO GAME EXPERIENCE: the game page now renders inline in place of
    // CasinoLobby (see the `product === "casino"` branch below), not a
    // full-viewport overlay — but the mobile menu is still a real modal
    // surface of its own, so it's still closed explicitly rather than
    // relying on paint order.
    setMobileMenuOpen(false);
    // A new launch (another game superseding one already active — see
    // ANOTHER GAME LAUNCH) must not carry the old game's overlays forward.
    closeCasinoGameOverlays();
    // ROUTING (game page repair): CasinoLobby now fully unmounts while a
    // game is open (it used to stay mounted underneath the old full-
    // viewport modal, so <main>'s scroll position was preserved for free).
    // Capture it here so `closeGame` can restore it — see there.
    lobbyScrollTopRef.current = mainRef.current?.scrollTop ?? null;
    window.history.pushState({}, "", gameHref(game));
    attemptLaunch(game, context, casinoCategory);
  };
  // NAV SPEC §5.3 — "Tribet must restore both scroll position and expanded-
  // rail depth when returning to the lobby from a game... it must survive a
  // real back navigation, not just an in-app router push." Split out of the
  // old `closeGame` (which only ran from the header's own in-app Back
  // button) so the SAME restore logic also runs from a genuine browser Back
  // press — see resolveLaunchFromUrl below, which used to call
  // `launch.closeLaunch` directly and skip this whole thing entirely. Takes
  // no action on history itself; callers own that.
  const restoreLobbyAfterGame = () => {
    closeCasinoGameOverlays();
    // Restore the scroll position captured in `launchGame` — CasinoLobby is
    // about to remount fresh (same category, per the lifted `casinoCategory`
    // state above) one frame from now; wait for its real content/height
    // before assigning scrollTop, or it would just clamp back to 0.
    const savedScrollTop = lobbyScrollTopRef.current;
    lobbyScrollTopRef.current = null;
    if (savedScrollTop != null) {
      // A single rAF isn't reliably enough: CasinoLobby's game-tile images
      // are still loading/decoding at that point, so <main>'s scrollHeight
      // hasn't reached its final size yet — the browser clamps the
      // assignment to whatever's scrollable *right then* (found via direct
      // measurement: assigning 900 landed at 517, the lobby's momentary
      // scrollable max one frame in), and a clamped scrollTop does not
      // self-correct later as the page keeps growing. Re-asserting the
      // target across ~20 frames (~300ms) is cheap and self-terminating —
      // once real content has grown enough to accept it, later assignments
      // are harmless no-ops.
      let framesLeft = 20;
      const reassert = () => {
        if (mainRef.current) mainRef.current.scrollTop = savedScrollTop;
        framesLeft -= 1;
        if (framesLeft > 0) requestAnimationFrame(reassert);
      };
      requestAnimationFrame(reassert);
    }
  };
  const closeGame = () => {
    launch.closeLaunch("game-back");
    const bare = pathFor({ product, casinoCategory, casinoView, casinoProviderSlug, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId });
    if (window.location.pathname + window.location.search !== bare) window.history.replaceState({}, "", bare);
    restoreLobbyAfterGame();
  };

  // ARENA-SWITCH TEARDOWN — the canonical path for leaving an active Casino
  // game for ANY reason other than the internal Back button (which already
  // has its own closeGame above, tuned to restore focus/scroll/category).
  // Idempotent: closeCasinoGameOverlays and launch.closeLaunch are both
  // no-ops when nothing is open/active, so calling this when there is no
  // active game (the common case) costs nothing and is always safe to call
  // unconditionally from every navigation entry point below, rather than
  // scattering the same "is a game active?" check across each caller.
  //
  // Deliberately does NOT touch fullscreen/GameStage/provider-iframe
  // cleanup directly — CasinoGamePage's own unmount effect (see that file)
  // owns that, since this function runs in App.jsx a render *before* the
  // component actually unmounts (React batches the state updates below into
  // one commit, then unmounts the old <ArenaErrorBoundary key={product}>
  // subtree) — trying to reach into a child's DOM/refs from here would be
  // fighting React's own lifecycle instead of using it.
  const teardownActiveCasinoGame = (reason) => {
    if (!isLaunchActive(launch.state.status)) return;
    closeCasinoGameOverlays();
    launch.closeLaunch(reason);
  };

  // CASINO ARENA RETURN DESTINATION vs GAME LAUNCH ORIGIN — leaving Casino
  // for Sports/Predictions while a game is active must land back on the
  // canonical main Casino lobby next time, never the game that was just
  // torn down (see ARENA SWITCHING task's "an active game route must never
  // become the Casino arena return route"). `casinoCategory` IS that return
  // destination (it's what `product === "casino"` renders once
  // isLaunchActive is false again — see the render tree below), so resetting
  // it to DEFAULT_NAV.casinoCategory ("Lobby") here is what makes returning
  // to Casino open the main lobby instead of resuming wherever the game had
  // been launched from. This is intentionally separate from Casino-internal
  // navigation while playing (closeActiveGameForCasinoNav below), which
  // must NOT reset the category — the user explicitly picked a destination
  // there, e.g. Favorites, and should land on it, not on the Lobby.
  const switchArena = (nextProduct) => {
    if (isLaunchActive(launch.state.status)) {
      teardownActiveCasinoGame("arena-switch");
      selectCasinoCategory(DEFAULT_NAV.casinoCategory);
    }
    setProduct(nextProduct);
  };

  // Casino-internal navigation (Sidebar category/Favorites/etc.) selected
  // WHILE a game is active — the sidebar stays visible and interactive
  // during gameplay (see TASK 1: "keep visible... Casino sidebar"), so this
  // is reachable. Unlike switchArena, this does NOT reset casinoCategory —
  // the caller (handleSelect below) is already setting it to whatever the
  // user picked, and that destination is exactly where Casino should land.
  const closeActiveGameForCasinoNav = () => teardownActiveCasinoGame("casino-navigation");
  // CASINO GAME EXPERIENCE — "Retry" during the Slow Loading sub-state
  // (see GameLoading.jsx): the reducer's own RETRY action only accepts a
  // genuinely FAILED launch (see lib/casinoGameLaunch.js's guard), and at
  // this point nothing has actually failed yet — it's still REQUESTED/
  // LOADING, just taking a while. Restarting means closing the in-flight
  // attempt and requesting the exact same game fresh, using the two
  // existing actions rather than weakening that guard.
  const restartLoadingGame = () => {
    const game = launchedGame;
    if (!game) { closeGame(); return; }
    const { source, categoryId } = launch.state;
    closeGame();
    attemptLaunch(game, source, categoryId);
  };
  // A `?play=<favId>` on load or browser Back/forward drives the SAME shared
  // launch action every other entry point uses — an unknown/malformed favId
  // now surfaces the real "Game not found" state (see INVALID GAME STATE)
  // instead of silently doing nothing, and a known-but-unplayable favId
  // surfaces "Game unavailable" instead of a silent redirect (see
  // UNAVAILABLE GAME STATE: "do not silently redirect without explanation")
  // — both were gaps in the previous silent syncGameFromUrl behavior.
  const resolveLaunchFromUrl = () => {
    // BROWSER NAVIGATION TEARDOWN — `?play=` only ever means anything on a
    // `/casino/...` path (see lib/routing.js's pathFor, which never emits
    // it for Sports/Predictions). Checking the pathname here, not just the
    // query string, closes a real gap: a stale/hand-edited `?play=` co-
    // existing with a non-Casino path could otherwise silently launch (and
    // hold open) a Casino game while `product` shows Sports/Predictions —
    // "the inactive Casino arena retaining a mounted game tree" the ARENA-
    // SWITCH TEARDOWN task explicitly calls out to prevent.
    const onCasinoPath = window.location.pathname.startsWith("/casino");
    const favId = onCasinoPath ? new URLSearchParams(window.location.search).get("play") : null;
    // NAV SPEC §5.3 — a genuine browser Back press (this function's caller,
    // the popstate handler) used to skip straight to `launch.closeLaunch`
    // here, never touching scroll/overlay restoration at all: only the
    // header's own in-app Back button (closeGame) got that. Routing this
    // through the same `restoreLobbyAfterGame` closeGame uses is the actual
    // fix — a real Back press now restores scroll exactly like the in-app
    // button does, not just a fresh scrolled-to-top remount.
    if (!favId) { if (launch.state.status !== GAME_LAUNCH_STATUS.IDLE) { launch.closeLaunch("browser-navigation"); restoreLobbyAfterGame(); } return; }
    if (launch.state.gameId === favId && launch.state.status !== GAME_LAUNCH_STATUS.IDLE) return;
    attemptLaunch(findGameByFavId(favId), "direct-link", casinoCategory);
  };
  // Resolve a deep link on first load (e.g. a game opened in a new tab).
  useEffect(() => { resolveLaunchFromUrl(); }, []);

  // Mirrors resolveLaunchFromUrl's own `?play=` handling for the separate
  // `?info=` param — an unknown favId here safely renders the panel's own
  // "Game information unavailable" state (see GameInfoPanel.jsx) rather
  // than silently doing nothing.
  const resolveInfoFromUrl = () => {
    infoPushedRef.current = false;
    setInfoFavId(new URLSearchParams(window.location.search).get("info"));
  };
  useEffect(() => { resolveInfoFromUrl(); }, []);

  const openGameInfo = (favId, source) => {
    gameInfoTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    infoPushedRef.current = true;
    const params = new URLSearchParams(window.location.search);
    params.set("info", favId);
    window.history.pushState({}, "", `${window.location.pathname}?${params.toString()}`);
    setInfoFavId(favId);
    track("casino_game_info_opened", { gameId: favId, source, launchState: launch.state.status });
  };
  const closeGameInfo = () => {
    track("casino_game_info_closed", { gameId: infoFavId });
    if (infoPushedRef.current) {
      infoPushedRef.current = false;
      window.history.back();
    } else {
      const params = new URLSearchParams(window.location.search);
      params.delete("info");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? "?" + qs : ""}`);
    }
    setInfoFavId(null);
  };

  // FINAL QA fix — GameInfoPanel is a plain custom overlay (role="dialog",
  // not a Radix Dialog), so it has no `onCloseAutoFocus` prop to hook
  // focus-restore into the way the other 7 dialogs do; this effect plus
  // `gameInfoTriggerRef` above is its equivalent. Watching `infoFavId`
  // itself (not wrapping closeGameInfo) is what makes this correct
  // regardless of HOW the panel closed — the X button, the backdrop,
  // Escape (all call closeGameInfo, which sets infoFavId null
  // synchronously — see closeGameInfo above), or a direct browser Back
  // press (which never calls closeGameInfo at all, only
  // resolveInfoFromUrl's own setInfoFavId via the popstate listener — in
  // that case `gameInfoTriggerRef.current` is already null since
  // openGameInfo never ran, so restoreFocusFrom is a harmless no-op).
  const prevInfoFavIdRef = useRef(infoFavId);
  useEffect(() => {
    if (prevInfoFavIdRef.current && !infoFavId) restoreFocusFrom(gameInfoTriggerRef)();
    prevInfoFavIdRef.current = infoFavId;
  }, [infoFavId]);

  const activityRef = useRef([]);
  useEffect(() => { activityRef.current = activity; }, [activity]);

  const settleBet = (id) => {
    const a = activityRef.current.find((x) => x.id === id);
    if (!a || a.status !== "open") return;
    // Sports bets carry a predetermined result (score-driven); others fall back to winProb.
    const result = a.result ?? (Math.random() < (a.winProb ?? 0.5) ? "won" : "lost");
    setActivity((list) => list.map((x) => (x.id === id ? { ...x, status: result } : x)));
    if (result === "won") setBalance((b) => +(b + a.potential).toFixed(2));
    else if (result === "void") setBalance((b) => +(b + a.stake).toFixed(2)); // stake returned
  };

  const betRef = () => "#" + Math.random().toString(36).slice(2, 7).toUpperCase();

  const placeBet = (e) => {
    const id = `a${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    setActivity((list) => [{ id, ref: betRef(), status: "open", time: nowLabel(), winProb: 0.5, ...e }, ...list]);
    setTimeout(() => settleBet(id), 6000 + Math.random() * 5000);
  };

  // Casino rounds settle instantly — log as already-resolved history.
  const logRound = (e) =>
    setActivity((list) => [{ id: `a${Date.now()}${Math.random().toString(36).slice(2, 5)}`, ref: betRef(), time: nowLabel(), ...e }, ...list]);

  const isFav = (game) => favs.has(game.favId);
  // Developer Panel overrides — "populated" uses real games from the
  // catalog (never invented ones), "empty" always reports false regardless
  // of the real set. "default" (or prod, where devMock.favoritesPreset is
  // always "default") defers to the real isFav above untouched.
  const mockFavIds = ALL_GAMES.slice(0, 3).map((g) => g.favId);
  const effectiveIsFav = devMock.favoritesPreset === "empty" ? () => false
    : devMock.favoritesPreset === "populated" ? (game) => mockFavIds.includes(game.favId)
    : isFav;
  const effectiveRecentIds = devMock.recentlyPlayedPreset === "empty" ? []
    : devMock.recentlyPlayedPreset === "populated" ? ALL_GAMES.slice(0, 4).map((g) => g.favId)
    : recentIds;
  // Optimistic: the star fills / sidebar count updates immediately, because the
  // settings store applies writes to state and localStorage synchronously and
  // only the network push is deferred (see lib/usePlayerSettings.jsx). The
  // resolved-promise shape and the revert path below are kept as-is: the store
  // reports sync failures through its own status surface (see
  // SettingsSyncNotice) rather than by rejecting individual writes, so a
  // favorite toggle still never navigates and never opens a modal.
  const syncFavorite = () => Promise.resolve(true);
  // Coalesces rapid toggling into one visible toast instead of stacking one
  // per click — dismissing whatever favorite-toggle toast is still showing
  // before adding the next one, so mashing a star only ever leaves the
  // latest state's message on screen (see FEEDBACK: "no repeated noisy
  // toast spam during rapid toggling").
  const lastFavToastRef = useRef(null);
  const showFavoriteToast = (type, title, opts) => {
    if (lastFavToastRef.current != null) toast.dismiss(lastFavToastRef.current);
    lastFavToastRef.current = toast[type](title, opts);
  };
  const toggleFav = (game) => {
    // Session-expired only ever comes from the mock panel (see
    // profileState.js), gated on `DEV_PANEL_ENABLED` — same guard as every
    // other session-expired branch in this file. Nothing is mutated: the
    // real `favs` value is untouched, so the visible favorite state is
    // preserved rather than silently discarded.
    if (DEV_PANEL_ENABLED && profileVariant === PROFILE_VARIANT.SESSION_EXPIRED) {
      showFavoriteToast("warning", "Log in again to update Favorites", { action: { label: "Log in again", onClick: openFunds } });
      return;
    }
    // FAVORITES REGRESSION FIX: a leftover Dev Panel favoritesPreset
    // ("populated"/"empty") makes `effectiveIsFav` above ignore the real
    // `favs` Set entirely — every surface that reads favorite status
    // through it (the star, the Favorites page/rail) stays frozen on the
    // mock's fixed answer forever, while this function's own mutation
    // below, the toast, and telemetry all still fire correctly. That
    // produced exactly the reported bug: "toast is right, nothing visible
    // ever changes," for every click, in both directions. A real,
    // user-initiated star click is a genuine action — it should always
    // supersede a stale preview, not be silently absorbed by it. This is
    // the only thing that was actually broken; `favs`, `toggleFavorite`,
    // and the star/count/page/persistence wiring downstream of the real
    // `isFav` were already correct (verified directly against a clean,
    // non-mocked session before writing this fix).
    if (DEV_PANEL_ENABLED && getDevMockState().favoritesPreset !== "default") {
      setDevMockState({ favoritesPreset: "default" });
    }
    // RAPID-CLICK FIX: read through `readSettings()` (not the `favs` Set from
    // the outer closure) so two clicks fired before React has re-rendered each
    // see the OTHER click's result, not the same stale snapshot twice —
    // otherwise a fast double-click could compute "adding" from the same stale
    // snapshot twice instead of correctly alternating add/remove, and the
    // toast/telemetry below would fire twice for what should net out to a
    // single flip. `readSettings` returns the store's ref-backed current value,
    // which every `updateSettings` call updates synchronously — the same
    // guarantee the previous functional-setState form relied on.
    const before = new Set(readSettings().casino.favorites);
    const { next, adding } = toggleFavorite(before, game.favId);
    setFavorites(next);
    // FAVORITES ADD CUE — fires on every real add, never on a remove (see
    // the state's own comment above). Incrementing (not toggling a boolean)
    // is what makes rapid back-to-back favorites each replay their own full
    // animation in Sidebar.jsx rather than a second `true` being a no-op
    // against an already-`true` value. Already collapsed to ~0 duration
    // under prefers-reduced-motion by this app's existing blanket
    // reduced-motion rule (index.css) — no extra check needed here.
    if (adding) {
      setFavoritesCueSeq((n) => n + 1);
    }
    // Persistence and account scoping are the settings store's job now — a
    // connected wallet's favorites go to that wallet's bucket and sync up;
    // a disconnected player's go to the device bucket (see
    // lib/playerSettingsStorage.js). Nothing to do here.
    syncFavorite(game, adding).then((ok) => {
      if (ok) {
        showFavoriteToast("success", adding ? "Added to Favorites" : "Removed from Favorites", adding ? {
          action: { label: "View favorites", onClick: () => { selectCasinoCategory("Favorites"); } },
        } : undefined);
        track(adding ? "casino_favorite_added" : "casino_favorite_removed", { gameId: game.favId, category: casinoCategory });
      } else {
        setFavorites(toggleFavorite(new Set(readSettings().casino.favorites), game.favId).next);
        showFavoriteToast("error", "Couldn't update Favorites. Try again.");
      }
    });
  };

  // Favorites hydration used to live here: a device baseline unioned with a
  // per-address localStorage bucket, recomputed on every connect. The settings
  // store does all of that now (account scoping, seeding a first-time wallet
  // from pre-connect choices, and reconciling with the server) — see
  // lib/playerSettingsStorage.js and lib/usePlayerSettings.jsx.
  //
  // What remains is the telemetry that effect also carried. Its
  // once-per-address guard is kept for exactly the reason documented before:
  // `connectedForAddress` is a plain ref that starts at `null` on every page
  // load, so this fires on any mount with an already-connected wallet (restored
  // session, plain refresh, reconnect, account switch) — which is why it stays
  // silent. It emits an event; it must never surface a toast, because none of
  // those cases is a user-initiated action. The one genuinely user-initiated
  // sync in the app is the explicit "Sync to wallet" control (see
  // SettingsSyncNotice), and that is where feedback belongs.
  const connectedForAddress = useRef(null);
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      connectedForAddress.current = null;
      return;
    }
    if (connectedForAddress.current === wallet.address) return;
    connectedForAddress.current = wallet.address;
    track("wallet_connected", { walletState: "connected" });
  }, [wallet.isConnected, wallet.address]);

  // network_switched fires on real chain changes only — not on the very
  // first render (that's just "the wallet happened to already be on chain
  // X", not a switch).
  const lastChainId = useRef(wallet.chainId);
  useEffect(() => {
    if (lastChainId.current !== undefined && lastChainId.current !== wallet.chainId) {
      track("network_switched", { chainId: wallet.chainId, category: product });
    }
    lastChainId.current = wallet.chainId;
  }, [wallet.chainId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build the contextual sidebar for the active product.
  const sidebar = (() => {
    if (product === "casino") {
      // The full Casino discovery/navigation map — Lobby, then Personal
      // (Favorites/Recently Played — My Bets removed, not relevant to
      // Casino), then Games (the shared CASINO_CATEGORIES taxonomy, same
      // array the in-page CategoryNav bar and Casino search already render
      // from — see lib/casinoCategories.js — no second hand-rolled category
      // list). Icons/labels/order all come from that shared config; this
      // builder only attaches the things that must be App-level closures
      // (Favorites' live count).
      const lobbyEntry = CASINO_CATEGORIES.find((c) => c.id === "Lobby");
      const gamesItems = CASINO_CATEGORIES.filter((c) => c.kind !== "lobby").map((c) => ({ id: c.id, label: c.label, icon: c.icon }));
      // NAV SPEC §3.2.1 — count badges belong on every PERSONAL-band row
      // whose count changes whether the click is worth it (Favorites,
      // Recently Played), hidden entirely at zero, never on a GAMES-band
      // row.
      //
      // Counts only ids that still resolve to a VISIBLE game (findGameByFavId
      // reads CasinoCatalog.jsx's ALL_GAMES) — a stale persisted favorite/
      // recently-played id for a game no longer in the catalog stays in
      // storage but must not count toward, or appear in, what the player
      // sees here.
      const personalCount = (id) => {
        if (id === "Favorites") {
          const visible = [...favs].filter((favId) => findGameByFavId(favId)).length;
          return visible > 0 ? visible : undefined;
        }
        if (id === "Recently Played") {
          const visible = effectiveRecentIds.filter((favId) => findGameByFavId(favId)).length;
          return visible > 0 ? visible : undefined;
        }
        return undefined;
      };
      const personalItems = CASINO_PERSONAL_DESTINATIONS.map((d) =>
        d.kind === "action"
          ? { id: d.id, label: d.label, icon: d.icon, action: openHistory }
          : { id: d.id, label: d.label, icon: d.icon, count: personalCount(d.id), pulseSeq: d.id === "Favorites" ? favoritesCueSeq : undefined }
      );
      return {
        title: "Casino",
        selected: casinoCategory,
        onSelect: (id) => {
          // Games items keep opening a real destination (see PILL
          // NAVIGATION CONSISTENCY: "Sidebar items = open category
          // destination") — rail-kind categories (Originals/Providers) have
          // no dedicated route, so they still scroll to their Lobby rail
          // via the existing activateCasinoCategory, same as Search's
          // category results. This is deliberately NOT the Lobby pill bar's
          // own scroll-every-category behavior (see
          // lib/casinoLobbyScroll.js) — looked up here by id rather than
          // changing Sidebar.jsx's onSelect contract to pass a whole
          // object, so Predictions/Sports' own onSelect stays untouched.
          const category = CASINO_CATEGORIES.find((c) => c.id === id);
          if (category?.kind === "rail") activateCasinoCategory(category, selectCasinoCategory);
          else selectCasinoCategory(id);
        },
        items: [
          { id: "Lobby", label: lobbyEntry.label, icon: lobbyEntry.icon },
          { id: "personal-divider", divider: true },
          { id: "personal-label", sectionLabel: "Personal" },
          ...personalItems,
          // No divider/section label when there's nothing under it — an
          // empty "Games" heading would be a dangling section, not a
          // simplified nav.
          ...(gamesItems.length ? [{ id: "games-divider", divider: true }, { id: "games-label", sectionLabel: "Games" }] : []),
          ...gamesItems,
        ],
      };
    }
    if (product === "predictions") {
      return {
        title: "Markets",
        selected: predSection,
        onSelect: setPredSection,
        items: [
          ...PRED_CATEGORIES.map((c) => ({ id: c, label: c, icon: PRED_ICONS[c] })),
          { id: "div", divider: true },
          { id: "My Positions", label: "My Positions", icon: Wallet },
        ],
      };
    }
    // Sports Home / Live sit above the five-sport whitelist (never removed
    // for sparse inventory — see INVENTORY STABILITY); My Bets is a
    // separated utility destination below a divider, same convention as
    // Casino's Favorites.
    const openSportsBets = activity.filter((a) => a.product === "sports" && a.status === "open").length;
    return {
      title: "Sports",
      selected: sportsView === "home" ? "home" : sportsView === "live" ? "live" : sportsView === "my-bets" ? "my-bets" : sportsSport,
      onSelect: (id) => {
        if (id === "home") navigateSports({ view: "home", sport: null, country: null, league: null, eventId: null });
        else if (id === "live") navigateSports({ view: "live", sport: null, country: null, league: null, eventId: null });
        else if (id === "my-bets") navigateSports({ view: "my-bets", sport: null, country: null, league: null, eventId: null });
        else navigateSports({ view: "sport", sport: id, country: null, league: null, eventId: null });
      },
      items: [
        { id: "home", label: "Sports Home", icon: LayoutGrid },
        { id: "live", label: "Live", icon: Radio },
        ...MVP_SPORTS.map((s) => ({ id: s.id, label: s.name, icon: s.icon })),
        { id: "sports-div", divider: true },
        { id: "my-bets", label: "My Bets", icon: ReceiptText, count: openSportsBets > 0 ? openSportsBets : undefined },
      ],
    };
  })();

  // Desktop-only selection path (Sidebar's rail).
  const handleSelect = (id) => {
    // Sidebar stays visible/interactive during an active Casino game (see
    // TASK 1) — selecting a Casino destination while playing must close
    // that game rather than leaving it rendered underneath the ignored
    // click (see CASINO NAVIGATION WHILE A GAME IS ACTIVE). A no-op when
    // product isn't "casino" or no game is active.
    if (product === "casino") closeActiveGameForCasinoNav();
    sidebar.onSelect(id);
    track("casino_nav_item_selected", { category: id, sidebarState: railMode });
  };

  // Mobile full-screen menu content — the exact same primary/utility item
  // data the desktop sidebar renders (split on the same divider convention),
  // so this is one data source with two presentations, not a second
  // navigation model. One mobile-only difference from desktop: Predictions'
  // "Sports" category is relabelled "Sports markets" so it's never confused
  // with the Sports arena tab right next to it in the bottom nav. Sports'
  // own item list (Sports Home / Live / five sports / My Bets) is already
  // identical on both surfaces — no mobile-only additions needed there.
  const ARENA_TITLES = { casino: "Casino", predictions: "Predictions", sports: "Sports" };
  const mobileMenu = (() => {
    const dividerIndex = sidebar.items.findIndex((it) => it.divider);
    const rawPrimary = dividerIndex === -1 ? sidebar.items : sidebar.items.slice(0, dividerIndex);
    const rawUtility = dividerIndex === -1 ? [] : sidebar.items.slice(dividerIndex + 1);
    const relabel = (it) => (product === "predictions" && it.id === "Sports" ? { ...it, label: "Sports markets" } : it);
    return { title: ARENA_TITLES[product], primary: rawPrimary.map(relabel), utility: rawUtility.map(relabel) };
  })();
  const handleMobileMenuSelect = (id) => {
    sidebar.onSelect(id);
    track("mobile_menu_item_selected", { arena: product, section: id });
  };

  // Mobile's account/menu-layer entry point (see MobileFullScreenMenu's
  // `accountItems` prop) — the same three PROFILE_VARIANT bodies desktop's
  // ProfileMenu renders, just as plain menu rows instead of a popover.
  // Support/Responsible Gaming are always reachable regardless of variant
  // (see RESPONSIBLE GAMING: "must be easy to find... near Support"), never
  // buried behind auth state.
  // `profileVariant === SESSION_EXPIRED` only ever comes from the mock
  // panel (see profileState.js's getProfileVariant), so this leads with
  // `DEV_PANEL_ENABLED` — same pattern as ProfileMenu.jsx's identical
  // branch.
  const accountItems =
    DEV_PANEL_ENABLED && profileVariant === PROFILE_VARIANT.SESSION_EXPIRED
      ? [
          { id: "account-reconnect", label: "Log in again", icon: LogIn, action: openFunds },
          { id: "account-settings", label: "Account", icon: Settings, action: openAccount },
          { id: "account-rg", label: "Responsible Gaming", icon: ShieldCheck, action: openRg },
          { id: "account-support", label: "Support", icon: LifeBuoy, action: openSupport },
        ]
      : profileVariant === PROFILE_VARIANT.LOGGED_IN
        ? [
            { id: "account-settings", label: "Account", icon: Settings, action: openAccount },
            { id: "account-wallet", label: devWallet.isConnected ? "Wallet" : "Connect wallet", icon: Wallet, action: openFunds },
            // CASINO-ONLY MVP AUDIT: Activity (bet history) isn't part of
            // the current MVP scope — hidden via the same platformScope
            // flag Sports/Predictions use, not a bespoke mobile check (see
            // isFullPlatformFeatureEnabled in lib/platformScope.js).
            ...(isFullPlatformFeatureEnabled(platformScope)
              ? [{ id: "account-activity", label: "Activity", icon: ReceiptText, action: openHistory }]
              : []),
            { id: "account-rg", label: "Responsible Gaming", icon: ShieldCheck, action: openRg },
            { id: "account-support", label: "Support", icon: LifeBuoy, action: openSupport },
            // MOBILE MENU DESTRUCTIVE ACTION LAYOUT: this used to be a
            // neutral "Sign out" row here PLUS a separate, differently-
            // aligned (centered) "Disconnect Wallet" footer button in
            // MobileFullScreenMenu.jsx — two destructive-looking controls in
            // one menu, one of which didn't even match the list's own row
            // geometry. Sign out (an account/session action, still reachable
            // from the desktop Account popover — see ProfileMenu.jsx,
            // untouched by this) has no real mobile equivalent action of its
            // own once this app has no separate auth from wallet connection
            // in practice (see `signOut`'s own comment above); the ONE real
            // destructive action mobile needs is Disconnect Wallet, now a
            // normal row in this same list — same MenuRow component, same
            // icon/label alignment as Support/Account above, just flagged
            // `destructive` for DESTRUCTIVE_ACTION_CLASS styling (see
            // MobileFullScreenMenu.jsx's MenuRow). `openDisconnectWallet`
            // (not `signOut`) opens the real Wallet-modal confirm-disconnect
            // flow — see FundsDialog's `startAtDisconnectConfirm`.
            { id: "account-disconnect-wallet", label: "Disconnect Wallet", icon: LogOut, action: openDisconnectWallet, destructive: true },
          ]
        : [
            // Account stays reachable even logged-out (see LOGGED-OUT
            // ACCOUNT STATE: "Account destination should present sign-in
            // entry") — AccountDialog's own LoggedOutBody is what actually
            // renders, matching ProfileMenu.jsx's identical logged-out row.
            { id: "account-connect", label: "Connect wallet", icon: Wallet, action: openFunds },
            { id: "account-settings", label: "Account", icon: Settings, action: openAccount },
            { id: "account-rg", label: "Responsible Gaming", icon: ShieldCheck, action: openRg },
            { id: "account-support", label: "Support", icon: LifeBuoy, action: openSupport },
          ];

  // Bottom-nav arena switch: always lands on that arena's default section
  // (Stake-style "tap the tab, go home"), unlike the desktop arena tabs,
  // which preserve whatever section was last viewed — an intentional,
  // mobile-only difference, not a desktop behavior change.
  const selectMobileArena = (id) => {
    closeMobileMenu();
    switchArena(id);
    if (id === "casino") selectCasinoCategory(DEFAULT_NAV.casinoCategory);
    else if (id === "predictions") setPredSection(DEFAULT_NAV.predSection);
    else if (id === "sports") navigateSports({ view: DEFAULT_NAV.sportsView, sport: DEFAULT_NAV.sportsSport, country: DEFAULT_NAV.sportsCountry, league: DEFAULT_NAV.sportsLeague, eventId: DEFAULT_NAV.sportsEventId });
    track("mobile_bottom_nav_selected", { target: id });
    track("mobile_arena_selected", { arena: id });
  };

  // The menu can only ever be open on a route that's about to change under
  // it (browser Back, a deep link resolving, dev-panel actions) — force it
  // closed on any such change instead of trusting every call site to close
  // it explicitly.
  useEffect(() => { setMobileMenuOpen(false); }, [product, casinoCategory, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId]);

  // All hooks above run unconditionally either way — only the returned JSX
  // branches on the geo check, so this stays a valid conditional render.
  // SupportDialog is rendered alongside GeoBlock (not just GeoBlock alone)
  // so "Contact support" here opens this app's real Support system instead
  // of a hardcoded, unverified `mailto:` address (see GeoBlock.jsx).
  if (geo.blocked) {
    return (
      <>
        <GeoBlock reason={geo.reason} onContactSupport={() => openModal("support")} />
        {supportMounted && (
          <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
            <SupportDialog open={supportOpen} onClose={closeModal} />
          </Suspense>
        )}
      </>
    );
  }

  return (
    // `data-arena` is aliased onto the SAME `product` value `data-product`
    // already carries, not a second state store. ONE-BRAND UNIFICATION:
    // neither attribute drives colour anymore (index.css's old
    // [data-product="..."] CTA-resolution blocks are gone — every consumer
    // reads --global-cta directly) — both stay purely for non-visual
    // purposes (analytics, tests, any future arena-scoped logic).
    // `data-product` specifically stays because existing selectors and a
    // couple of component comments already reference it.
    <div data-product={product} data-arena={product} className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        onBurger={toggleSidebar}
        burgerLabel={sidebarLabel}
        onAccount={openAccount}
        onManageWallet={openFunds}
        onActivity={openHistory}
        mobileActivityEnabled={isFullPlatformFeatureEnabled(platformScope)}
        onResponsibleGambling={openRg}
        onSupport={openSupport}
        wrongNetwork={wrongNetwork}
        onSwitchNetwork={() => wallet.switchTo(arenaChainId)}
        openPositionsCount={openPositionsCount}
      />
      <NetworkBanner show={wrongNetwork} switching={wallet.isSwitching} onSwitch={() => wallet.switchTo(arenaChainId)} />

      <div className="flex min-h-0 flex-1" data-test-id="shell-row">
        <Sidebar
          railMode={railMode}
          product={product}
          setProduct={switchArena}
          items={sidebar.items}
          selected={sidebar.selected}
          onSelect={handleSelect}
        />

        <main ref={mainRef} tabIndex={-1} data-test-id="main-content" className="tribet-scrollbar min-w-0 flex-1 overflow-y-auto px-4 pb-nav pt-4 [scrollbar-gutter:stable] [overflow-anchor:none] focus:outline-none">
          {/* STABLE ARENA CONTENT STAGE — see ArenaContentStage.jsx for the
              full crossfade architecture. `arenaKey={product}` is the ONLY
              thing that tells the stage a transition should happen; the
              stage itself never remounts (no key here), so it — and
              everything outside it (TopBar/Sidebar/<main>) — stays a
              single, continuously-mounted DOM subtree across every arena
              switch. `key={product}` on ArenaErrorBoundary below is
              intentionally still route-specific (permitted on the INNER
              content layer only): each arena's page has always remounted
              on switch (state that must survive lives lifted in App.jsx —
              see sportsBetslip/favorites/etc. above), and that contract is
              unchanged here. */}
          <ArenaContentStage arenaKey={product} minHeight={480}>
            <ArenaErrorBoundary key={product}>
              {product === "casino" && (
                isLaunchActive(launch.state.status) ? (
                  <CasinoGamePage
                    game={launchedGame}
                    launch={launch.state}
                    isFav={effectiveIsFav}
                    onFav={toggleFav}
                    onRestartFromLoading={restartLoadingGame}
                    onRetryFailed={launch.retryLaunch}
                    onBack={closeGame}
                    onBrowseGames={() => { closeGame(); selectCasinoCategory("Lobby"); }}
                    onOpenGameInfo={launchedGame ? () => openGameInfo(launchedGame.favId, "gameplay-frame") : undefined}
                    onReportIssue={openSupport}
                  >
                    {launchedGame ? (
                      <ProviderGame
                        key={`${launchedGame.favId}:${launch.state.attempt}`}
                        game={launchedGame}
                        onReady={DEV_PANEL_ENABLED && devMock.gameStatus === "loading" ? undefined : () => launch.markReady(launchedGame.favId)}
                        onFailed={() => launch.markFailed(launchedGame.favId)}
                      />
                    ) : null}
                  </CasinoGamePage>
                ) : (
                  <CasinoLobby
                    category={casinoCategory}
                    view={casinoView}
                    providerSlug={casinoProviderSlug}
                    onLaunchOnchain={launchGame}
                    onLaunchProvider={launchGame}
                    isFav={effectiveIsFav}
                    onFav={toggleFav}
                    onManageWallet={openFunds}
                    recentIds={effectiveRecentIds}
                    onBrowseGames={() => selectCasinoCategory("Lobby")}
                    onSelectCategory={selectCasinoCategory}
                    onSelectHomeFilter={(id) => selectCasinoCategory(id, "home")}
                    onSelectProvidersIndex={selectCasinoProvidersIndex}
                    onSelectProvider={selectCasinoProvider}
                    expandedRails={expandedRails}
                    onExpandRail={expandRail}
                  />
                )
              )}
              {product === "predictions" && (
                <Suspense fallback={<ArenaLoadingFallback label="Predictions" />}>
                  <PredictionsSection
                    predSection={predSection}
                    balance={balance}
                    setBalance={setBalance}
                    onBet={placeBet}
                    ensureAuth={ensureAuth}
                  />
                </Suspense>
              )}
              {product === "sports" && (
                <Suspense fallback={<ArenaLoadingFallback label="Sports" />}>
                  <SportsArena
                    view={sportsView}
                    sport={sportsSport}
                    country={sportsCountry}
                    league={sportsLeague}
                    eventId={sportsEventId}
                    events={sportsEvents}
                    loading={sportsLoading}
                    betslip={sportsBetslip}
                    onNavigate={navigateSports}
                    activity={activity}
                    onBetPlaced={logRound}
                    onDemoBetPlaced={placeBet}
                    onBetslipWillOpen={() => { setMobileMenuOpen(false); closeOtherOverlays(); }}
                  />
                </Suspense>
              )}
            </ArenaErrorBoundary>
          </ArenaContentStage>
          {/* No site footer under an open game. The game page is sized to fill
              exactly the space <main> gives it (CasinoGamePage's
              useAvailableHeight), so anything appended below it turns a page
              that should fit into a scrolling one — the footer alone added
              ~646px on mobile, pushing the frame out of view. Nobody reaches
              for the RG/support links mid-round either; they are one tap away
              in the menu, and the game's own utility bar is right there. */}
          {!gameIsOpen && (
            <Footer
              onResponsibleGambling={openRg}
              onSupport={openSupport}
            />
          )}
        </main>

        {/* Desktop Sports betslip panel — a real flex sibling of Sidebar/
            main (not an overlay), so it resizes content instead of covering
            it. Only mounted at >=1024px: below that, SportsArena's own
            Dialog-based modal handles the betslip instead.
            LAYOUT STABILITY: deliberately NOT gated on `product === "sports"`
            — this used to unmount entirely the moment you left Sports,
            which snapped <main>'s available width back up and reflowed
            everything sharing that width (Footer's grid, in particular,
            visibly jumped by 300px+ once a betslip selection had been made,
            since Footer's own box is capped by max-w-6xl but still shrinks
            to whatever's actually available when that's narrower). The
            panel's own width already collapses to 0px whenever
            `uiState.isOpen` is false (see DesktopBetslipPanel), so on a
            fresh session with no selections this renders exactly as before
            — width 0 on every arena. Once a selection exists, the panel
            (and the space it reserves) now stays put across arena switches
            instead of vanishing and reappearing, which is also the more
            useful product behavior: an in-progress bet slip shouldn't
            disappear just because you glanced at Casino. */}
        {isDesktopBetslipLayout && (
          // Its own error boundary + Suspense: unlike SportsArena above, this
          // panel is a sibling of <main>, not a descendant of
          // ArenaErrorBoundary, so a chunk-load failure here would otherwise
          // have nothing to catch it (see CHUNK LOAD ERRORS: "do not crash
          // the full application").
          <ArenaErrorBoundary key="sports-betslip">
            <Suspense fallback={null}>
              <DesktopBetslipPanel
                betslip={sportsBetslip}
                uiState={sportsDesktopUi}
                onBetPlaced={logRound}
                onDemoBetPlaced={placeBet}
                onDone={sportsBetslip.clearSelections}
              />
            </Suspense>
          </ArenaErrorBoundary>
        )}
      </div>

      {/* Exactly one live MobileBottomNav at a time: the shell renders it
          only while the menu is closed; MobileFullScreenMenu renders the
          same component internally (as a real descendant of its own Dialog
          Content, inside its focus boundary) while open. No z-index or
          pointer-events trick makes two DOM copies act like one — there is
          only ever one.
          RESPONSIVE AUDIT fix: also unmounted (not just visually covered)
          during an active game launch — CasinoGamePage wants nearly the
          full viewport height below the persistent header (see
          CasinoGamePage.jsx's own useAvailableHeight, which measures down
          to the bottom of the viewport and assumes nothing else is
          contesting that space); a mobile nav bar left visible underneath
          would both shrink the real available room and leave its buttons
          reachable in the tab order behind a page that reads as
          full-height (see GAMEPLAY: "bottom nav hidden... restored after
          gameplay"). Reuses the already-tested `isLaunchActive` predicate
          (see lib/casinoGameLaunch.test.js) so "restored after gameplay"
          falls out for free the moment `launch.state.status` returns to
          IDLE, rather than re-deriving the same IDLE comparison a second,
          untested way. */}
      {!mobileMenuOpen && !isLaunchActive(launch.state.status) && (
        <MobileBottomNav
          product={product}
          onSelectArena={selectMobileArena}
          menuOpen={mobileMenuOpen}
          onToggleMenu={toggleMobileMenu}
        />
      )}
      <MobileFullScreenMenu
        open={mobileMenuOpen}
        title={mobileMenu.title}
        primaryItems={mobileMenu.primary}
        utilityItems={mobileMenu.utility}
        accountItems={accountItems}
        selected={sidebar.selected}
        onSelect={handleMobileMenuSelect}
        onClose={closeMobileMenu}
        product={product}
        onSelectArena={selectMobileArena}
        onToggleMenu={toggleMobileMenu}
        onFocusMainContent={focusMainContent}
      />
      <Toaster />
      {import.meta.env.VITE_CONCIERGE_ENABLED === 'true' && product === 'casino' && !modal && !infoFavId && !mobileMenuOpen && !isLaunchActive(launch.state.status) && (
        <Suspense fallback={null}><CasinoConcierge /></Suspense>
      )}
      <DevPanel />

      {/* PERFORMANCE task: each dialog below is only mounted (and its chunk
          only fetched) once its own `open` condition is actually true —
          previously all were unconditionally mounted with `open={false}`,
          so React.lazy alone would have fetched every chunk on first
          Casino render regardless of whether the user ever opened them. */}
      {infoMounted && (
        <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
          <GameInfoPanel
            game={infoGame}
            open={!!infoFavId}
            notFound={Boolean(infoFavId) && !infoGame}
            onClose={closeGameInfo}
            onResponsibleGaming={() => { closeGameInfo(); openRg(); }}
          />
        </Suspense>
      )}
      {historyMounted && (
        <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
          <BetHistoryDialog
            open={historyOpen}
            onClose={closeModal}
            onCloseAutoFocus={restoreFocus}
          />
        </Suspense>
      )}
      {accountMounted && (
        <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
          <AccountDialog
            open={accountOpen}
            onClose={closeModal}
            onCloseAutoFocus={restoreFocus}
            variant={profileVariant}
            address={devWallet.address}
            isConnected={devWallet.isConnected}
            authStatus={authStatus}
            onSignOut={signOut}
            onManageWallet={openFunds}
            onResponsibleGambling={openRg}
            onSupport={openSupport}
          />
        </Suspense>
      )}
      {rgMounted && (
        <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
          <ResponsibleGamblingDialog open={rgOpen} onClose={closeModal} onCloseAutoFocus={restoreFocus} complianceStatus={devMock.complianceStatus} onSupport={openSupport} />
        </Suspense>
      )}
      {supportMounted && (
        <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
          <SupportDialog open={supportOpen} onClose={closeModal} onCloseAutoFocus={restoreFocus} />
        </Suspense>
      )}
      {complianceBlockMounted && (
        <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
          <ComplianceBlockDialog
            open={complianceBlockOpen}
            onClose={closeModal}
            onCloseAutoFocus={restoreFocus}
            complianceStatus={devMock.complianceStatus}
            onSupport={openSupport}
            onResponsibleGaming={openRg}
          />
        </Suspense>
      )}
      {fundsMounted && (
        <Suspense fallback={DIALOG_SUSPENSE_FALLBACK}>
          <FundsDialog open={fundsOpen} onClose={closeModal} onCloseAutoFocus={restoreFocus} startAtDisconnectConfirm={fundsStartAtDisconnectConfirm} />
        </Suspense>
      )}
      <Analytics />
    </div>
  );
}

// TWO-ROUTE SPLIT (nav spec §4.1) — `view` picks which chrome renders
// above CasinoCatalog's content: "dashboard"/"home" keep the promo strip +
// chip rail (the Lobby's own navigation layer); "category"/"providers"/
// "provider" are standalone destinations with their own hero (rendered by
// CasinoCatalog's own page components) and get a bare search bar instead —
// no promo cards, no chip rail, per the spec's own chrome table.
function CasinoLobby({ category, view, providerSlug, onLaunchOnchain, onLaunchProvider, isFav, onFav, onManageWallet, recentIds, onBrowseGames, onSelectCategory, onSelectHomeFilter, onSelectProvider, expandedRails, onExpandRail }) {
  const [query, setQuery] = useState("");
  const browseAll = () => { setQuery(""); onBrowseGames?.(); };
  const selectCategory = (c) => { setQuery(""); onSelectCategory?.(c); };
  const selectHomeFilter = (id) => { setQuery(""); onSelectHomeFilter?.(id); };
  const onPillActivated = (categoryConfig) => {
    track("casino_category_selected", {
      categoryId: categoryConfig.id,
      source: "category-nav",
      previousCategory: category,
      destination: categoryConfig.id === "Lobby" ? "lobby-dashboard" : "lobby-home-filter",
    });
  };

  // Casino-only grouped search (games/providers/categories, ranking,
  // keyboard nav, recent searches, mobile full-screen surface) — see
  // CasinoSearch.jsx. Sports/Predictions keep the plain ScopedSearch input
  // (see ArenaTileRow.jsx), untouched by this. Called unconditionally
  // (hooks can't be conditional) even though only one of the two chrome
  // branches below actually renders its output.
  const { searchPanelProps, mobileOverlay } = useCasinoSearch({
    query, onQuery: setQuery, onLaunchOnchain, onLaunchProvider, isFav, onFav,
    onSelectCategory: selectCategory,
  });

  const isDestination = view === "category" || view === "providers" || view === "provider";

  return (
    <ArenaPageColumn>
      {/* The default Lobby view has no visible title (the promo area already
          sets the context) but every page needs exactly one <h1> — Favorites,
          the destination views, and each category page render their own
          visible one; this covers the one remaining case without adding
          visual chrome the design doesn't call for. */}
      {category === "Lobby" && view === "dashboard" && <h1 className="sr-only">Casino Lobby</h1>}
      {isDestination ? (
        <div className="space-y-4">
          <ScopedSearch query={query} onQuery={setQuery} {...searchPanelProps} />
          {mobileOverlay}
        </div>
      ) : (
        /* LOBBY HIERARCHY PASS: search + category pills read as one
           navigation layer, not two independently-spaced blocks — grouped
           into their own `space-y-4` (matching PromoStrip's own internal
           promo-row/search rhythm) so this boundary is visibly tighter than
           the nav-layer -> content gap below, which still gets
           ArenaPageColumn's full `space-y-8` since this whole group is now
           ONE of its two children instead of two of its three. */
        <div className="space-y-4">
          <PromoStrip query={query} onQuery={setQuery} searchPanelProps={searchPanelProps} onManageWallet={onManageWallet} />
          {mobileOverlay}
          <CategoryNav selected={category} activeView={view} onSelectHomeFilter={selectHomeFilter} onPillActivated={onPillActivated} />
        </div>
      )}
      <CasinoCatalog
        category={category}
        view={view}
        providerSlug={providerSlug}
        query={query}
        onLaunch={onLaunchOnchain}
        onLaunchProvider={onLaunchProvider}
        isFav={isFav}
        onFav={onFav}
        recentIds={recentIds}
        onBrowseGames={browseAll}
        onSelectCategory={selectCategory}
        onSelectProvider={onSelectProvider}
        expandedRails={expandedRails}
        onExpandRail={onExpandRail}
      />
    </ArenaPageColumn>
  );
}

// Same top-section system as Casino (ArenaTileRow: wallet tile + two arena
// promos + scoped search), just with predictions-flavoured promos and search
// scope. Replaces the old single oversized SectionHero.
function PredictionsSection({ predSection, balance, setBalance, onBet, ensureAuth }) {
  const [query, setQuery] = useState("");
  return (
    <ArenaPageColumn>
      <ArenaTileRow arena="predictions" promos={PREDICTIONS_PROMOS} query={query} onQuery={setQuery} />
      <PredictionsApp section={predSection} balance={balance} setBalance={setBalance} onBet={onBet} ensureAuth={ensureAuth} query={query} />
    </ArenaPageColumn>
  );
}
