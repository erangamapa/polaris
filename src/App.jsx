import { useState, useRef, useEffect, useMemo } from "react";
import {
  LayoutGrid, Radio,
  Flame, Landmark, Bitcoin, Trophy, Cpu, LineChart, Wallet, ReceiptText,
  ShieldCheck, LifeBuoy, LogOut, LogIn, Settings,
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
import { CasinoCatalog, CategoryNav, gameHref, findGameByFavId, ALL_GAMES } from "./components/casino/CasinoCatalog";
import { CASINO_CATEGORIES, CASINO_PERSONAL_DESTINATIONS, activateCasinoCategory } from "./lib/casinoCategories";
import { useCasinoSearch } from "./components/casino/CasinoSearch";
import { FundsDialog } from "./components/wallet/FundsDialog";
import { AccountDialog } from "./components/wallet/AccountDialog";
import { BetHistoryDialog } from "./components/activity/BetHistoryDialog";
import { ResponsibleGamblingDialog } from "./components/trust/ResponsibleGamblingDialog";
import { ComplianceBlockDialog } from "./components/trust/ComplianceBlockDialog";
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
import { nowLabel } from "./lib/walletData";
import { PRED_CATEGORIES } from "./lib/predictionsData";
import { MVP_SPORTS } from "./lib/sportsModel";
import { getSportsInventory } from "./lib/sportsDemo";
import { useSportsBetslip } from "./lib/sportsBetslip";
import { useNormalizedAzuroEvents } from "./web3/useAzuro";
import { PREDICTIONS_PROMOS } from "./lib/arenaPromos";
import { NetworkBanner } from "./components/shell/NetworkBanner";
import { GeoBlock } from "./components/shell/GeoBlock";
import { ArenaErrorBoundary } from "./components/shell/ArenaErrorBoundary";
import { useGeoCheck } from "./lib/geo";
import { CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from "@shared/chains";
import { track } from "./lib/telemetry";
import { useDevMockState, getDevMockState, setDevMockState } from "./lib/devMock";
import { DEV_PANEL_ENABLED } from "./lib/devPanelFlag";
import { PROFILE_VARIANT, getProfileVariant, getSignOutAction } from "./lib/profileState";
import { canPerformAction } from "./lib/complianceState";
import { toggleFavorite, mergeAccountFavorites } from "./lib/casinoFavorites";
import { installDevFetchInterceptor } from "./lib/devFetchInterceptor";
import { useCasinoGameLaunch } from "./lib/useCasinoGameLaunch";
import { GAME_LAUNCH_STATUS } from "./lib/casinoGameLaunch";
import { GameLaunchSurface } from "./components/casino/GameLaunchSurface";
import { GameInfoPanel } from "./components/casino/GameInfoPanel";
import { normalizePendingRound, normalizeLiveResultRound } from "./lib/casinoRounds";

// Module-load-time, not inside the component — idempotent (see its own
// `installed` guard) and needs to be active before BetHistoryDialog's
// first /api/* call, not after some render has already happened. No-op in
// production (see devFetchInterceptor.js).
installDevFetchInterceptor();

// Developer Panel -> Casino -> Game state: simulates the *outcome* of a
// launch attempt (provider error, maintenance, region block, insufficient
// balance) by routing it through the real launch state machine as a genuine
// UNAVAILABLE result (see useCasinoGameLaunch's checkAvailability) instead of
// a one-off toast — the game-launch surface now owns every one of these copy
// paths (see GameLaunchSurface.jsx), so there is nothing left for a separate
// dev-only copy table to do. The specific reason below is never shown to the
// player (see UNAVAILABLE GAME STATE: "do not fake a maintenance reason") —
// it only decides *whether* checkGameAvailability blocks the launch.
// "loading" is deliberately excluded: it isn't an unavailable reason, it's a
// stuck-forever real REQUESTED/LOADING launch (see the ProviderGame onReady
// wiring below), so delayed/timeout states can be exercised through the real
// timers instead of being faked.
const DEV_UNAVAILABLE_GAME_STATUSES = new Set(["provider-error", "maintenance", "region-restricted", "insufficient-balance"]);

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
  // on Casino instead — reads as "full" at rest and everywhere
  // `DEV_PANEL_ENABLED` is off (devPanelFlag.js).
  const initialNav = parsePath(typeof window !== "undefined" ? window.location.pathname : "/");
  const initialPlatformScope = DEV_PANEL_ENABLED ? getDevMockState().platformScope : "full";
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
      const scope = DEV_PANEL_ENABLED ? getDevMockState().platformScope : "full";
      setProduct(resolveScopedProduct(nav.product, scope));
      setCasinoCategory(nav.casinoCategory);
      setPredSection(nav.predSection);
      setSportsView(nav.sportsView);
      setSportsSport(nav.sportsSport);
      setSportsCountry(nav.sportsCountry);
      setSportsLeague(nav.sportsLeague);
      setSportsEventId(nav.sportsEventId);
      resolveLaunchFromUrl();
      resolveInfoFromUrl();
    };
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
  // Dev-aware ONLY for the mobile account section's isConnected read below
  // (see accountItems) — everything else in this file (ensureAuth, balance
  // merging, chain tracking) deliberately keeps using the real `wallet`
  // above, unchanged. Without this, the Developer Panel's Wallet preset
  // would have no effect on the mobile menu's Account rows, since the real
  // wallet.isConnected can't see the mock (see TopBar.jsx, which already
  // reads this same hook for its own desktop ProfileMenu).
  const devWallet = useDevAwareWallet();
  // Developer Panel (Shift+D) mock state — currently live in every build
  // including production (see lib/devPanelFlag.js's DEV_PANEL_ENABLED), so
  // every field below reflects whatever the panel has been set to, and
  // reads as "default" (inert) until someone touches the panel. See
  // INTEGRATION PRIORITY: Casino favorites/recently played/game state are
  // wired here (App.jsx), not deeper inside CasinoLobby/CasinoCatalog, so
  // those components stay untouched. `platformScope` is the one exception
  // to "default = inert": its resting value is the literal "full"
  // (unrestricted) rather than "default" (see devMock.js's
  // DEFAULT_DEV_MOCK_STATE), and every read of it below is explicitly
  // gated on `DEV_PANEL_ENABLED` so it falls back to "full" wherever the
  // flag is off.
  const devMock = useDevMockState();
  const platformScope = DEV_PANEL_ENABLED ? devMock.platformScope : "full";
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

  // Casino-only "just happened in this tab" round cache — feeds
  // BetHistoryDialog's Casino tab (see lib/casinoRounds.js's mergeCasinoRounds)
  // so a round appears immediately without waiting for the next
  // /api/casino-history refetch, and so a bet shows as pending the moment
  // its transaction confirms. Deliberately separate from the older
  // `activity`/`logRound` state below (that one still feeds Sports/
  // Predictions' own demo betslip + badges — see CASINO-ONLY ACTIVITY SCOPE:
  // "do not merge incompatible arena data into one generic receipt
  // prematurely"). Capped the same way recentIds is, for the same reason:
  // this only needs to bridge "just played" to "the next real chain read",
  // not grow forever.
  const ACTIVITY_CAP = 20;
  const [casinoPendingRounds, setCasinoPendingRounds] = useState([]);
  const [casinoLiveResults, setCasinoLiveResults] = useState([]);
  const recordCasinoRoundPending = (e) => {
    setCasinoPendingRounds((list) => [normalizePendingRound(e), ...list].slice(0, ACTIVITY_CAP));
  };
  const recordCasinoRoundResolved = (e) => {
    setCasinoLiveResults((list) => [normalizeLiveResultRound(e), ...list].slice(0, ACTIVITY_CAP));
    // The pending placeholder for this exact tx is now redundant —
    // mergeCasinoRounds would already dedupe it, but dropping it here too
    // means the row doesn't even flash through both states in one render.
    setCasinoPendingRounds((list) => list.filter((r) => r.txHash !== e.txnHash));
  };

  // Known-unavailable before any init is attempted: a real non-playable
  // onchain game (see BETSWIRL_GAMES' own `playable` flag — Wheel/Plinko
  // revert on this testnet), or a Developer Panel simulation of a
  // provider-side outage. Returning any truthy reason here is what makes
  // useCasinoGameLaunch skip straight to UNAVAILABLE instead of ever opening
  // the launch surface's loading state (see UNAVAILABLE GAME STATE: "do not
  // open a loading state first when availability is already known").
  const checkGameAvailability = (game) =>
    (game.kind === "onchain" && !game.playable ? "coming-soon" : null) ||
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

  const [fundsOpen, setFundsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [rgOpen, setRgOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [complianceBlockOpen, setComplianceBlockOpen] = useState(false);

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
    setAccountOpen(false);
    setComplianceBlockOpen(false);
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
  // Not wallet-gated — Account is reachable logged-out and session-expired
  // too (it renders its own sign-in entry point in those cases; see
  // AccountDialog.jsx), unlike Wallet/Activity which require a connected
  // wallet before there's anything real to show.
  const openAccount = () => { setMobileMenuOpen(false); setAccountOpen(true); };

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
  // ensureAuth gates onchain games behind a connected wallet on the right
  // chain (see AUTH AND WALLET INDEPENDENCE — provider games need neither;
  // they run on a mock economy, not a wallet). This is the one place both a
  // card click and a direct `?play=` link apply that same gate, so a
  // bookmarked/shared onchain-game URL can't bypass it.
  //
  // GAME LAUNCH INTEGRATION: the same `kind === "onchain" && playable`
  // check IS this app's one real-money action (launching a playable
  // onchain BetSwirl game is placing a bet — see complianceState.js's
  // SENSITIVE_ACTIONS comment), so the shared compliance gate sits right
  // next to ensureAuth, checked first — neither the launch reducer nor
  // ensureAuth's wallet-connect prompt ever runs when compliance blocks the
  // attempt, so no loading starts, no Recently Played update, and no
  // pending round is ever created for a blocked attempt (see GAME LAUNCH
  // INTEGRATION: "do not start loading if play is already blocked").
  // Provider games are untouched by this — they're this app's only real
  // "demo" mode (no wallet, mock economy), which the task explicitly allows
  // to remain available (see GAME LAUNCH INTEGRATION: "demo games may
  // remain available only if actual policy supports them" — it does here).
  const attemptLaunch = (game, source, categoryId) => {
    if (game && game.kind === "onchain" && game.playable) {
      if (!canPerformAction({ action: "launch-real-game", complianceStatus: devMock.complianceStatus })) {
        setComplianceBlockOpen(true);
        return;
      }
      if (!ensureAuth()) return;
    }
    launch.launchCasinoGame({ gameId: game ? game.favId : null, source, categoryId });
  };
  const launchGame = (game, context) => {
    // Full-screen games cover the whole viewport (z-50, fixed inset-0), but
    // the mobile menu (z-70) would still sit on top of and stay interactive
    // over a game otherwise — close it explicitly rather than rely on
    // stacking order alone.
    setMobileMenuOpen(false);
    window.history.pushState({}, "", gameHref(game));
    attemptLaunch(game, context, casinoCategory);
  };
  const closeGame = () => {
    launch.closeLaunch();
    const bare = pathFor({ product, casinoCategory, predSection, sportsView, sportsSport, sportsCountry, sportsLeague, sportsEventId });
    if (window.location.pathname + window.location.search !== bare) window.history.replaceState({}, "", bare);
  };
  // A `?play=<favId>` on load or browser Back/forward drives the SAME shared
  // launch action every other entry point uses — an unknown/malformed favId
  // now surfaces the real "Game not found" state (see INVALID GAME STATE)
  // instead of silently doing nothing, and a known-but-unplayable favId
  // surfaces "Game unavailable" instead of a silent redirect (see
  // UNAVAILABLE GAME STATE: "do not silently redirect without explanation")
  // — both were gaps in the previous silent syncGameFromUrl behavior.
  const resolveLaunchFromUrl = () => {
    const favId = new URLSearchParams(window.location.search).get("play");
    if (!favId) { if (launch.state.status !== GAME_LAUNCH_STATUS.IDLE) launch.closeLaunch(); return; }
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
    // Session-expired only ever comes from the mock panel (see
    // profileState.js), gated on `DEV_PANEL_ENABLED` — same guard as every
    // other session-expired branch in this file. Nothing is mutated: the
    // real `favs` value is untouched, so the visible favorite state is
    // preserved rather than silently discarded.
    if (DEV_PANEL_ENABLED && profileVariant === PROFILE_VARIANT.SESSION_EXPIRED) {
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
      // The full Casino discovery/navigation map — Lobby, then Personal
      // (Favorites/Recently Played/My Bets), then Games (the shared
      // CASINO_CATEGORIES taxonomy, same array the in-page CategoryNav bar
      // and Casino search already render from — see lib/casinoCategories.js
      // — no second hand-rolled category list). Icons/labels/order all come
      // from that shared config; this builder only attaches the things that
      // must be App-level closures (Favorites' live count, My Bets' dialog
      // handler, the active id derived from dialog-open state).
      const lobbyEntry = CASINO_CATEGORIES.find((c) => c.id === "Lobby");
      const gamesItems = CASINO_CATEGORIES.filter((c) => c.kind !== "lobby")
        .map((c) => ({ id: c.id, label: c.label, icon: c.icon }));
      const personalItems = CASINO_PERSONAL_DESTINATIONS.map((d) =>
        d.kind === "action"
          ? { id: d.id, label: d.label, icon: d.icon, action: openHistory }
          : { id: d.id, label: d.label, icon: d.icon, count: d.id === "Favorites" && favs.size > 0 ? favs.size : undefined }
      );
      return {
        title: "Casino",
        // My Bets opens BetHistoryDialog rather than changing casinoCategory
        // (see PERSONAL DESTINATIONS: "no second history store") — its
        // active state is derived from whether that dialog is actually
        // open, not a fake route, so it never disagrees with the real URL.
        selected: historyOpen ? "My Bets" : casinoCategory,
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
          if (category?.kind === "rail") activateCasinoCategory(category, setCasinoCategory);
          else setCasinoCategory(id);
        },
        items: [
          { id: "Lobby", label: lobbyEntry.label, icon: lobbyEntry.icon },
          { id: "personal-divider", divider: true },
          { id: "personal-label", sectionLabel: "Personal" },
          ...personalItems,
          { id: "games-divider", divider: true },
          { id: "games-label", sectionLabel: "Games" },
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
            { id: "account-activity", label: "Activity", icon: ReceiptText, action: openHistory },
            { id: "account-rg", label: "Responsible Gaming", icon: ShieldCheck, action: openRg },
            { id: "account-support", label: "Support", icon: LifeBuoy, action: openSupport },
            { id: "account-signout", label: "Sign out", icon: LogOut, action: signOut },
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
  // SupportDialog is rendered alongside GeoBlock (not just GeoBlock alone)
  // so "Contact support" here opens this app's real Support system instead
  // of a hardcoded, unverified `mailto:` address (see GeoBlock.jsx).
  if (geo.blocked) {
    return (
      <>
        <GeoBlock reason={geo.reason} onContactSupport={() => setSupportOpen(true)} />
        <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
      </>
    );
  }

  return (
    <div data-product={product} className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        onBurger={toggleSidebar}
        burgerLabel={sidebarLabel}
        onAccount={openAccount}
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

      {launch.state.status !== GAME_LAUNCH_STATUS.IDLE && (
        <GameLaunchSurface
          launch={launch.state}
          game={launchedGame}
          onClose={closeGame}
          onRetry={launch.retryLaunch}
          onBrowseGames={() => { closeGame(); setCasinoCategory("Lobby"); }}
          onOpenInfo={launchedGame ? () => openGameInfo(launchedGame.favId, "gameplay-frame") : undefined}
        >
          {launchedGame?.kind === "onchain" ? (
            <BetSwirlGame
              key={`${launchedGame.favId}:${launch.state.attempt}`}
              game={launchedGame}
              onRound={(e) => { logRound(e); recordCasinoRoundResolved(e); }}
              onRoundPending={recordCasinoRoundPending}
            />
          ) : launchedGame ? (
            <ProviderGame
              key={`${launchedGame.favId}:${launch.state.attempt}`}
              game={launchedGame}
              onReady={
                DEV_PANEL_ENABLED && devMock.gameStatus === "loading"
                  ? undefined
                  : () => launch.markReady(launchedGame.favId)
              }
              onFailed={() => launch.markFailed(launchedGame.favId)}
            />
          ) : null}
        </GameLaunchSurface>
      )}
      <GameInfoPanel
        game={infoGame}
        open={!!infoFavId}
        notFound={Boolean(infoFavId) && !infoGame}
        onClose={closeGameInfo}
        onResponsibleGaming={() => { closeGameInfo(); openRg(); }}
      />
      <BetHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        casinoPendingRounds={casinoPendingRounds}
        casinoLiveResults={casinoLiveResults}
        profileVariant={profileVariant}
        onLogin={openFunds}
        onPlayAgain={(gameId) => {
          const game = findGameByFavId(gameId);
          if (game) launchGame(game, "receipt");
        }}
        onViewGameInfo={(gameId) => openGameInfo(gameId, "receipt")}
      />
      <AccountDialog
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        variant={profileVariant}
        address={devWallet.address}
        isConnected={devWallet.isConnected}
        authStatus={authStatus}
        onSignOut={signOut}
        onManageWallet={openFunds}
        onResponsibleGambling={openRg}
        onSupport={openSupport}
      />
      <ResponsibleGamblingDialog open={rgOpen} onClose={() => setRgOpen(false)} complianceStatus={devMock.complianceStatus} onSupport={openSupport} />
      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
      <ComplianceBlockDialog
        open={complianceBlockOpen}
        onClose={() => setComplianceBlockOpen(false)}
        complianceStatus={devMock.complianceStatus}
        onSupport={openSupport}
        onResponsibleGaming={openRg}
      />
      <FundsDialog open={fundsOpen} onClose={() => setFundsOpen(false)} />
    </div>
  );
}

function CasinoLobby({ category, onLaunchOnchain, onLaunchProvider, isFav, onFav, recentIds, onBrowseGames, onSelectCategory }) {
  const [query, setQuery] = useState("");
  const browseAll = () => { setQuery(""); onBrowseGames?.(); };
  const selectCategory = (c) => { setQuery(""); onSelectCategory?.(c); };
  // CategoryNav now owns its own click behavior (see
  // lib/casinoLobbyScroll.js's activateLobbyPill — every pill scrolls the
  // Lobby to its section instead of navigating away, see PILL NAVIGATION
  // CONSISTENCY). It only needs a way to actually switch to the Lobby route
  // when clicked from somewhere else (Favorites, a standalone category
  // page), and a place to report analytics — this file keeps owning both,
  // same as every other Casino selection handler here.
  const navigateToLobby = () => { setQuery(""); onSelectCategory?.("Lobby"); };
  const onPillActivated = (categoryConfig) => {
    track("casino_category_selected", {
      categoryId: categoryConfig.id,
      source: "category-nav",
      previousCategory: category,
      destination: categoryConfig.id === "Lobby" ? "lobby-top" : "lobby-scroll",
    });
  };

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
      <CategoryNav selected={category} onNavigateToLobby={navigateToLobby} onPillActivated={onPillActivated} />
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
