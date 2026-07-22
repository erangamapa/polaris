import { useState, useRef, useEffect, useMemo } from "react";
import {
  LayoutGrid, Gem, Cherry, Radio, Tv, Sparkles, Star,
  Flame, Landmark, Bitcoin, Trophy, Cpu, LineChart, Wallet, ReceiptText,
  ShieldCheck, LifeBuoy, LogOut, LogIn,
} from "lucide-react";
import { TopBar } from "./components/shell/TopBar";
import { Sidebar } from "./components/shell/Sidebar";
import { MobileBottomNav } from "./components/shell/MobileBottomNav";
import { MobileFullScreenMenu } from "./components/shell/MobileFullScreenMenu";
import { Footer } from "./components/shell/Footer";
import { Toaster } from "./components/shell/Toaster";
import { DevPanel } from "./components/dev/DevPanel";
import { PromoStrip } from "./components/casino/PromoStrip";
import { BetSwirlGame } from "./components/casino/BetSwirlGame";
import { ProviderGame } from "./components/casino/ProviderGame";
import { CasinoCatalog, CategoryNav, CATEGORY_LABEL, gameHref, findGameByFavId, ALL_GAMES } from "./components/casino/CasinoCatalog";
import { useCasinoSearch } from "./components/casino/CasinoSearch";
import { FundsDialog } from "./components/wallet/FundsDialog";
import { BetHistoryDialog } from "./components/activity/BetHistoryDialog";
import { ResponsibleGamblingDialog } from "./components/trust/ResponsibleGamblingDialog";
import { SupportDialog } from "./components/trust/SupportDialog";
import { useWallet } from "./web3/useWallet";
import { useDevAwareWallet } from "./lib/useDevAwareWallet";
import { toast } from "./lib/toast";
import { parsePath, pathFor, DEFAULT_NAV } from "./lib/routing";
import { isArenaAllowed, resolveScopedProduct } from "./lib/platformScope";
import { PredictionsApp } from "./components/predictions/PredictionsApp";
import { SportsArena } from "./components/sports/SportsArena";
import { DesktopBetslipPanel } from "./components/sports/DesktopBetslipPanel";
import { useSportsDesktopBetslipUi, useIsDesktopBetslipLayout } from "./lib/sportsDesktopBetslipUi";
import { ArenaTileRow } from "./components/shell/ArenaTileRow";
import { CATEGORIES } from "./lib/mockData";
import { nowLabel } from "./lib/walletData";
import { PRED_CATEGORIES } from "./lib/predictionsData";
import { MVP_SPORTS } from "./lib/sportsModel";
import { getSportsInventory } from "./lib/sportsDemo";
import { useSportsBetslip } from "./lib/sportsBetslip";
import { useSportsEvents } from "./web3/useSportsEvents";
import { PREDICTIONS_PROMOS } from "./lib/arenaPromos";
import { NetworkBanner } from "./components/shell/NetworkBanner";
import { GeoBlock } from "./components/shell/GeoBlock";
import { ArenaErrorBoundary } from "./components/shell/ArenaErrorBoundary";
import { useGeoCheck } from "./lib/geo";
import { CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from "@shared/chains";
import { track } from "./lib/telemetry";
import { useDevMockState, getDevMockState, setDevMockState } from "./lib/devMock";
import { PROFILE_VARIANT, getProfileVariant, getSignOutAction } from "./lib/profileState";
import { toggleFavorite, mergeAccountFavorites } from "./lib/casinoFavorites";
import { installDevFetchInterceptor } from "./lib/devFetchInterceptor";

// Module-load-time, not inside the component — idempotent (see its own
// `installed` guard) and needs to be active before BetHistoryDialog's
// first /api/* call, not after some render has already happened. No-op in
// production (see devFetchInterceptor.js).
installDevFetchInterceptor();

// Developer Panel -> Casino -> Game state: simulates the *outcome* of a
// launch attempt (provider error, maintenance, region block, etc.) without
// touching BetSwirlGame/ProviderGame's own real launch logic — the safest
// way to exercise every error copy path without needing to fake a whole
// in-game error UI inside those real iframes (see DO NOT ADD: "fake
// backend"). Module scope (not recreated every render) and gated on the
// build-time `import.meta.env.DEV` constant so these dev-only copy strings
// don't ship in the production bundle at all — confirmed via a production
// build grep (see DEV-ONLY REQUIREMENT: "tree-shake where practical").
const DEV_GAME_STATE_COPY = import.meta.env.DEV ? {
  loading: { type: "info", title: "Loading (dev simulation)", message: "Simulating a slow game launch." },
  "provider-error": { type: "error", title: "Provider error (dev simulation)", message: "The game provider is unavailable right now." },
  maintenance: { type: "warning", title: "Game under maintenance (dev simulation)", message: "This game is temporarily unavailable." },
  "region-restricted": { type: "error", title: "Not available in your region (dev simulation)", message: "This game can't be played from your location." },
  "insufficient-balance": { type: "error", title: "Insufficient balance (dev simulation)", message: "Add funds to play this game." },
} : {};

const CASINO_ICONS = {
  Lobby: LayoutGrid, Popular: Gem, Slots: Cherry, "Live Casino": Radio,
  "Game Shows": Tv, New: Sparkles, Favorites: Star,
};

// Favorites persist across sessions in localStorage, keyed by the game's favId.
const FAVS_KEY = "tribet_favs";
const loadFavs = () => {
  try { return new Set(JSON.parse(localStorage.getItem(FAVS_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveFavs = (set) => {
  try { localStorage.setItem(FAVS_KEY, JSON.stringify([...set])); } catch { /* ignore */ }
};

// Recently-played games (most-recent-first), capped — feeds the Recently
// Played rail, a distinct personalized section from Favorites (see
// CasinoCatalog.jsx). Persisted like favorites.
const RECENT_KEY = "tribet_recent";
const RECENT_CAP = 12;
const loadRecent = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch { return []; }
};
const saveRecent = (list) => {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ }
};

// Mock "account favorites" — there's no real backend, so wallet-linked
// favorites are simulated as a per-address localStorage bucket (easy to swap
// for a real API later without touching the merge logic below).
const loadAccountFavs = (address) => {
  try { return new Set(JSON.parse(localStorage.getItem(`tribet_favs_${address}`) || "[]")); }
  catch { return new Set(); }
};
const saveAccountFavs = (address, set) => {
  try { localStorage.setItem(`tribet_favs_${address}`, JSON.stringify([...set])); } catch { /* ignore */ }
};
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
  // Developer Panel's Platform Scope mock (see lib/platformScope.js) so a
  // deep link straight into /sports or /predictions while in MVP mode lands
  // on Casino instead — same as devMock everywhere else, this reads as
  // "full" in production (getDevMockState() only ever returns a real
  // platformScope value in dev; see devMock.js's safeLoad).
  const initialNav = parsePath(typeof window !== "undefined" ? window.location.pathname : "/");
  const initialPlatformScope = import.meta.env.DEV ? getDevMockState().platformScope : "full";
  const [product, setProduct] = useState(resolveScopedProduct(initialNav.product, initialPlatformScope));

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
    const path = pathFor({ product, casinoCategory, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId });
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
  }, [product, casinoCategory, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId]);
  useEffect(() => {
    const onPop = () => {
      const nav = parsePath(window.location.pathname);
      const scope = import.meta.env.DEV ? getDevMockState().platformScope : "full";
      setProduct(resolveScopedProduct(nav.product, scope));
      setCasinoCategory(nav.casinoCategory);
      setPredSection(nav.predSection);
      setSportsView(nav.sportsView);
      setSportsSport(nav.sportsSport);
      setSportsCountry(nav.sportsCountry);
      setSportsLeague(nav.sportsLeague);
      setSportsEventId(nav.sportsEventId);
      syncGameFromUrl();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Sports inventory from the active provider (SX Bet by default; Azuro when
  // VITE_SPORTS_PROVIDER=azuro) — fetched once here, not inside SportsArena,
  // since the sidebar/mobile-menu live-count badges need the same merged data.
  // With SX active there are no placeholders — real markets stand alone (demo
  // mode is off, see sportsDemo.js).
  const { events: sportsProviderEvents, loading: sportsLoading } = useSportsEvents();
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
  // Dev-aware ONLY for the mobile account section's isConnected read below
  // (see accountItems) — everything else in this file (ensureAuth, balance
  // merging, chain tracking) deliberately keeps using the real `wallet`
  // above, unchanged. Without this, the Developer Panel's Wallet preset
  // would have no effect on the mobile menu's Account rows, since the real
  // wallet.isConnected can't see the mock (see TopBar.jsx, which already
  // reads this same hook for its own desktop ProfileMenu).
  const devWallet = useDevAwareWallet();
  // Developer Panel (Shift+D) mock state — a no-op object in production
  // (useDevMockState always returns DEFAULT_DEV_MOCK_STATE there, and every
  // field below reads as "default", so every override branch this file
  // adds is inert). See INTEGRATION PRIORITY: Casino favorites/recently
  // played/game state are wired here (App.jsx), not deeper inside
  // CasinoLobby/CasinoCatalog, so those components stay untouched.
  // `platformScope` is the one exception to "default = inert": its default
  // is the literal value "mvp", not "default" (see devMock.js), so every
  // read of it below is explicitly gated on `import.meta.env.DEV` instead —
  // production always behaves as "full" (unrestricted), matching every
  // other Developer-Panel-mocked field's no-op-in-prod guarantee.
  const devMock = useDevMockState();
  const platformScope = import.meta.env.DEV ? devMock.platformScope : "full";
  // "Switching to MVP while inside Sports or Predictions immediately
  // redirects to Casino" — also the safety net for the initial-load/popstate
  // resolution above (resolveScopedProduct), in case of any other path that
  // lands `product` on a disallowed arena.
  useEffect(() => {
    if (!isArenaAllowed(product, platformScope)) {
      setProduct("casino");
      setCasinoCategory(DEFAULT_NAV.casinoCategory);
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
    if (!import.meta.env.DEV) return;
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
  const [favs, setFavs] = useState(loadFavs);
  // Favorites captured before any wallet was ever connected on this device —
  // the baseline every account merge starts from, so switching accounts
  // never carries a *different* account's favorites forward (see the merge
  // effect below). Captured once; never mutated after mount.
  const deviceBaselineRef = useRef(loadFavs());
  // While a wallet is connected, favorites are account-scoped (see toggleFav)
  // and must not bleed back into the shared device bucket, or the next
  // account to connect on this device would inherit them.
  useEffect(() => { if (!wallet.isConnected) saveFavs(favs); }, [favs, wallet.isConnected]);
  const [recentIds, setRecentIds] = useState(loadRecent);
  useEffect(() => { saveRecent(recentIds); }, [recentIds]);
  const trackRecent = (game) => {
    setRecentIds((list) => [game.favId, ...list.filter((id) => id !== game.favId)].slice(0, RECENT_CAP));
  };
  const [onchainGame, setOnchainGame] = useState(null);
  const [providerGame, setProviderGame] = useState(null);
  const [fundsOpen, setFundsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rgOpen, setRgOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

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
    setFundsOpen(false);
    setHistoryOpen(false);
    setRgOpen(false);
    setSupportOpen(false);
    setOnchainGame(null);
    setProviderGame(null);
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

  // Only one overlay owns focus/scroll-lock at a time — any dialog opening
  // closes the mobile drawer first so they never stack.
  const openFunds = () => { setMobileMenuOpen(false); if (!ensureAuth()) return; setFundsOpen(true); };
  const openHistory = () => { setMobileMenuOpen(false); if (!ensureAuth()) return; setHistoryOpen(true); };
  // Not wallet-gated — Responsible Gambling/Support are reachable whether
  // or not a wallet is connected. Hoisted out of Footer's own inline
  // handlers so the new desktop ProfileMenu (see TopBar.jsx) can open the
  // exact same dialogs rather than a second copy.
  const openRg = () => { setMobileMenuOpen(false); setRgOpen(true); };
  const openSupport = () => { setMobileMenuOpen(false); setSupportOpen(true); };

  // Player Profile / Account — same auth/wallet-independence model
  // TopBar.jsx's desktop ProfileMenu uses (see lib/profileState.js),
  // computed here too since the mobile account section (below, in
  // mobileMenu) needs it for its own item list. `devMock.authStatus` reads
  // as "default" outside dev (see devMock.js), so `profileVariant` always
  // falls back to deriving from the real `wallet.isConnected` in
  // production — no separate auth system, per this app's existing
  // architecture (see devMock.js's own note on this).
  const authStatus = import.meta.env.DEV ? devMock.authStatus : "default";
  const profileVariant = getProfileVariant({ authStatus, isConnected: devWallet.isConnected });
  // Mirrors TopBar.jsx's identical handleSignOut — see lib/profileState.js's
  // getSignOutAction for why this never disconnects the real wallet just to
  // clear a *mocked* auth state (see SIGN OUT: "preserve wallet connection
  // unless current product logic explicitly disconnects it").
  const signOut = () => {
    setMobileMenuOpen(false);
    if (import.meta.env.DEV && getSignOutAction(authStatus) === "reset-auth-mock") {
      setDevMockState({ authStatus: "logged-out" });
    } else {
      wallet.disconnect();
    }
  };

  // Game tiles are real links (`?play=<favId>`) so middle-click / cmd-click opens
  // a new tab, like on most sites. These helpers keep that URL in sync with the
  // modal state for the in-page (left-click) path, and resolve it back to a
  // modal on load / back-forward so the link actually works when followed.
  // `context` ("home" | "favorites" | "recent" | "category" | "search") is
  // analytics-only, forwarded from CasinoGameCard/search's own launch calls
  // — see CasinoCatalog.jsx's CasinoGameCard — so casino_game_opened can
  // report which section a launch actually came from, never used for any
  // gating/behavior decision here.
  const openGame = (game, context) => {
    if (devMock.gameStatus !== "default") {
      const copy = DEV_GAME_STATE_COPY[devMock.gameStatus];
      if (copy) toast[copy.type](copy.title, { message: copy.message });
      return;
    }
    // Full-screen games cover the whole viewport (z-50, fixed inset-0), but
    // the mobile menu (z-70) would still sit on top of and stay interactive
    // over a game otherwise — close it explicitly rather than rely on
    // stacking order alone.
    setMobileMenuOpen(false);
    if (game.kind === "onchain") {
      if (game.playable && ensureAuth()) {
        setOnchainGame(game);
        trackRecent(game);
        track("casino_game_opened", { gameId: game.favId, category: casinoCategory, walletState: wallet.isConnected ? "connected" : "disconnected", sourceContext: context });
      }
      return;
    }
    setProviderGame(game);
    trackRecent(game);
    track("casino_game_opened", { gameId: game.favId, category: casinoCategory, walletState: wallet.isConnected ? "connected" : "disconnected", sourceContext: context });
  };
  const launchGame = (game, context) => {
    window.history.pushState({}, "", gameHref(game));
    openGame(game, context);
  };
  const closeGame = () => {
    setOnchainGame(null);
    setProviderGame(null);
    const bare = pathFor({ product, casinoCategory, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId });
    if (window.location.pathname + window.location.search !== bare) window.history.replaceState({}, "", bare);
  };
  const syncGameFromUrl = () => {
    const favId = new URLSearchParams(window.location.search).get("play");
    const game = favId ? findGameByFavId(favId) : null;
    const openable = game && (game.kind !== "onchain" || game.playable);
    if (openable) openGame(game);
    else { setOnchainGame(null); setProviderGame(null); if (favId) closeGame(); }
  };
  // Resolve a deep link on first load (e.g. a game opened in a new tab).
  useEffect(() => { syncGameFromUrl(); }, []);

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
  // Optimistic: the star fills / sidebar count updates immediately (setFavs is
  // synchronous). "Sync in background" has nothing real to sync against yet —
  // there's no favorites backend, only localStorage — so this always
  // "succeeds"; the shape (a resolved promise + a revert path) is here so a
  // real API can slot in later without changing the calling code or the
  // never-navigate/never-a-modal contract.
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
    // Session-expired is dev-only (see profileState.js — authStatus is
    // hardcoded "default" outside dev, so profileVariant can never actually
    // equal SESSION_EXPIRED in production); the literal `import.meta.env.DEV
    // &&` here is what actually keeps this branch (and its string) out of
    // the production bundle, not the variant check alone (see DEV-ONLY
    // REQUIREMENT — same fix as every other session-expired branch in this
    // file). Nothing is mutated: the real `favs` value is untouched, so the
    // visible favorite state is preserved rather than silently discarded.
    if (import.meta.env.DEV && profileVariant === PROFILE_VARIANT.SESSION_EXPIRED) {
      showFavoriteToast("warning", "Log in again to update Favorites", { action: { label: "Log in again", onClick: openFunds } });
      return;
    }
    const { next, adding } = toggleFavorite(favs, game.favId);
    setFavs(next);
    // Once connected, favorites are account-scoped — persist to that
    // account's own bucket so a different account connecting later on this
    // device never inherits this one's picks (see the merge effect below).
    if (wallet.isConnected && wallet.address) saveAccountFavs(wallet.address, next);
    syncFavorite(game, adding).then((ok) => {
      if (ok) {
        showFavoriteToast("success", adding ? "Added to Favorites" : "Removed from Favorites", adding ? {
          action: { label: "View favorites", onClick: () => { setCasinoCategory("Favorites"); } },
        } : undefined);
        track(adding ? "casino_favorite_added" : "casino_favorite_removed", { gameId: game.favId, category: casinoCategory });
      } else {
        const { next: reverted } = toggleFavorite(next, game.favId);
        setFavs(reverted);
        if (wallet.isConnected && wallet.address) saveAccountFavs(wallet.address, reverted);
        showFavoriteToast("error", "Couldn't update Favorites. Try again.");
      }
    });
  };

  // Favorites work fully offline (local-first) via `deviceBaselineRef` — the
  // set captured before any wallet was ever connected. Every account merge
  // starts from that same fixed baseline (not from whatever `favs` currently
  // holds), so switching from account A to account B can never carry A's
  // picks into B: on disconnect it reverts to the baseline, and on connect
  // it's baseline ∪ that address's own bucket, always freshly computed.
  const mergedForAddress = useRef(null);
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      if (mergedForAddress.current) setFavs(deviceBaselineRef.current);
      mergedForAddress.current = null;
      return;
    }
    if (mergedForAddress.current === wallet.address) return;
    mergedForAddress.current = wallet.address;
    track("wallet_connected", { walletState: "connected" });
    const account = loadAccountFavs(wallet.address);
    const { merged, added } = mergeAccountFavorites(deviceBaselineRef.current, account);
    setFavs(merged);
    if (added > 0) toast.success(`Synced ${added} favorite${added === 1 ? "" : "s"} from your wallet`);
    saveAccountFavs(wallet.address, merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Favorites is a separated utility destination, not just another
      // category — kept out of the main flat list and appended after a
      // divider (Architecture rules: "Favorites as a separated utility item
      // at the bottom").
      return {
        title: "Casino",
        selected: casinoCategory,
        onSelect: setCasinoCategory,
        items: [
          ...CATEGORIES.filter((c) => c !== "Favorites").map((c) => ({ id: c, label: CATEGORY_LABEL[c] ?? c, icon: CASINO_ICONS[c] })),
          { id: "fav-divider", divider: true },
          { id: "Favorites", label: "Favorites", icon: CASINO_ICONS.Favorites, count: favs.size > 0 ? favs.size : undefined },
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
  // `profileVariant === SESSION_EXPIRED` can only be true in dev (see
  // profileState.js's getProfileVariant — the session-expired mock has no
  // real-world equivalent), so this leads with the build-time
  // `import.meta.env.DEV` constant, not just the runtime variant check —
  // same fix as ProfileMenu.jsx's identical branch (see DEV-ONLY
  // REQUIREMENT).
  const accountItems =
    import.meta.env.DEV && profileVariant === PROFILE_VARIANT.SESSION_EXPIRED
      ? [
          { id: "account-reconnect", label: "Log in again", icon: LogIn, action: openFunds },
          { id: "account-rg", label: "Responsible Gaming", icon: ShieldCheck, action: openRg },
          { id: "account-support", label: "Support", icon: LifeBuoy, action: openSupport },
        ]
      : profileVariant === PROFILE_VARIANT.LOGGED_IN
        ? [
            { id: "account-wallet", label: devWallet.isConnected ? "Wallet" : "Connect wallet", icon: Wallet, action: openFunds },
            { id: "account-activity", label: "Activity", icon: ReceiptText, action: openHistory },
            { id: "account-rg", label: "Responsible Gaming", icon: ShieldCheck, action: openRg },
            { id: "account-support", label: "Support", icon: LifeBuoy, action: openSupport },
            { id: "account-signout", label: "Sign out", icon: LogOut, action: signOut },
          ]
        : [
            { id: "account-connect", label: "Connect wallet", icon: Wallet, action: openFunds },
            { id: "account-rg", label: "Responsible Gaming", icon: ShieldCheck, action: openRg },
            { id: "account-support", label: "Support", icon: LifeBuoy, action: openSupport },
          ];

  // Bottom-nav arena switch: always lands on that arena's default section
  // (Stake-style "tap the tab, go home"), unlike the desktop arena tabs,
  // which preserve whatever section was last viewed — an intentional,
  // mobile-only difference, not a desktop behavior change.
  const selectMobileArena = (id) => {
    closeMobileMenu();
    setProduct(id);
    if (id === "casino") setCasinoCategory(DEFAULT_NAV.casinoCategory);
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
  if (geo.blocked) return <GeoBlock reason={geo.reason} />;

  return (
    <div data-product={product} className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        onBurger={toggleSidebar}
        burgerLabel={sidebarLabel}
        onManageWallet={openFunds}
        onFund={openFunds}
        onActivity={openHistory}
        onResponsibleGambling={openRg}
        onSupport={openSupport}
        wrongNetwork={wrongNetwork}
        onSwitchNetwork={() => wallet.switchTo(arenaChainId)}
        openPositionsCount={openPositionsCount}
      />
      <NetworkBanner show={wrongNetwork} switching={wallet.isSwitching} onSwitch={() => wallet.switchTo(arenaChainId)} />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          railMode={railMode}
          product={product}
          setProduct={setProduct}
          items={sidebar.items}
          selected={sidebar.selected}
          onSelect={handleSelect}
        />

        <main ref={mainRef} tabIndex={-1} className="tribet-scrollbar min-w-0 flex-1 overflow-y-auto px-4 pb-nav pt-4 [scrollbar-gutter:stable] focus:outline-none">
          <ArenaErrorBoundary key={product}>
            <div className="animate-fade-in-up">
              {product === "casino" && (
                <CasinoLobby
                  category={casinoCategory}
                  onLaunchOnchain={launchGame}
                  onLaunchProvider={launchGame}
                  isFav={effectiveIsFav}
                  onFav={toggleFav}
                  recentIds={effectiveRecentIds}
                  onBrowseGames={() => setCasinoCategory("Lobby")}
                  onSelectCategory={setCasinoCategory}
                  profileVariant={profileVariant}
                  onLogin={openFunds}
                />
              )}
              {product === "predictions" && (
                <PredictionsSection
                  predSection={predSection}
                  balance={balance}
                  setBalance={setBalance}
                  onBet={placeBet}
                  ensureAuth={ensureAuth}
                />
              )}
              {product === "sports" && (
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
              )}
            </div>
          </ArenaErrorBoundary>
          <Footer
            onResponsibleGambling={openRg}
            onSupport={openSupport}
          />
        </main>

        {/* Desktop Sports betslip panel — a real flex sibling of Sidebar/
            main (not an overlay), so it resizes Sports content instead of
            covering it. Only mounted for Sports at >=1024px: below that,
            SportsArena's own Dialog-based modal handles the betslip, and
            outside Sports this never renders at all (state stays alive in
            memory via sportsBetslip/sportsDesktopUi above, ready to restore
            when the user returns to Sports). */}
        {product === "sports" && isDesktopBetslipLayout && (
          <DesktopBetslipPanel
            betslip={sportsBetslip}
            uiState={sportsDesktopUi}
            onBetPlaced={logRound}
            onDemoBetPlaced={placeBet}
            onDone={sportsBetslip.clearSelections}
          />
        )}
      </div>

      {/* Exactly one live MobileBottomNav at a time: the shell renders it
          only while the menu is closed; MobileFullScreenMenu renders the
          same component internally (as a real descendant of its own Dialog
          Content, inside its focus boundary) while open. No z-index or
          pointer-events trick makes two DOM copies act like one — there is
          only ever one. */}
      {!mobileMenuOpen && (
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
      <DevPanel />

      {onchainGame && (
        <BetSwirlGame game={onchainGame} onRound={logRound} onClose={closeGame} />
      )}
      {providerGame && (
        <ProviderGame game={providerGame} onClose={closeGame} />
      )}
      <BetHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ResponsibleGamblingDialog open={rgOpen} onClose={() => setRgOpen(false)} />
      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
      <FundsDialog open={fundsOpen} onClose={() => setFundsOpen(false)} />
    </div>
  );
}

function CasinoLobby({ category, onLaunchOnchain, onLaunchProvider, isFav, onFav, recentIds, onBrowseGames, onSelectCategory, profileVariant, onLogin }) {
  const [query, setQuery] = useState("");
  const browseAll = () => { setQuery(""); onBrowseGames?.(); };
  const selectCategory = (c) => { setQuery(""); onSelectCategory?.(c); };

  // Casino-only grouped search (games/providers/categories, ranking,
  // keyboard nav, recent searches, mobile full-screen surface) — see
  // CasinoSearch.jsx. Sports/Predictions keep the plain ScopedSearch input
  // (see ArenaTileRow.jsx), untouched by this.
  const { searchPanelProps, mobileOverlay } = useCasinoSearch({
    query, onQuery: setQuery, onLaunchOnchain, onLaunchProvider, isFav, onFav,
    onSelectCategory: selectCategory,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* The default Lobby view has no visible title (the promo area already
          sets the context) but every page needs exactly one <h1> — Favorites
          and each category page render their own visible one; this covers
          the one remaining case without adding visual chrome the design
          doesn't call for. */}
      {category === "Lobby" && <h1 className="sr-only">Casino Lobby</h1>}
      <PromoStrip query={query} onQuery={setQuery} searchPanelProps={searchPanelProps} />
      {mobileOverlay}
      <CategoryNav selected={category} onSelect={selectCategory} />
      <CasinoCatalog
        category={category}
        query={query}
        onLaunch={onLaunchOnchain}
        onLaunchProvider={onLaunchProvider}
        isFav={isFav}
        onFav={onFav}
        recentIds={recentIds}
        onBrowseGames={browseAll}
        onSelectCategory={selectCategory}
        profileVariant={profileVariant}
        onLogin={onLogin}
      />
    </div>
  );
}

// Same top-section system as Casino (ArenaTileRow: wallet tile + two arena
// promos + scoped search), just with predictions-flavoured promos and search
// scope. Replaces the old single oversized SectionHero.
function PredictionsSection({ predSection, balance, setBalance, onBet, ensureAuth }) {
  const [query, setQuery] = useState("");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ArenaTileRow arena="predictions" promos={PREDICTIONS_PROMOS} query={query} onQuery={setQuery} />
      <PredictionsApp section={predSection} balance={balance} setBalance={setBalance} onBet={onBet} ensureAuth={ensureAuth} query={query} />
    </div>
  );
}
