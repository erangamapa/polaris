import { useState, useRef, useEffect, useMemo } from "react";
import {
  LayoutGrid, Gem, Cherry, Radio, Tv, Sparkles, Star,
  Flame, Landmark, Bitcoin, Trophy, Cpu, LineChart, Wallet, ReceiptText,
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
import { CasinoCatalog, gameHref, findGameByFavId, ALL_GAMES } from "./components/casino/CasinoCatalog";
import { FundsDialog } from "./components/wallet/FundsDialog";
import { BetHistoryDialog } from "./components/activity/BetHistoryDialog";
import { ResponsibleGamblingDialog } from "./components/trust/ResponsibleGamblingDialog";
import { SupportDialog } from "./components/trust/SupportDialog";
import { useWallet } from "./web3/useWallet";
import { toast } from "./lib/toast";
import { parsePath, pathFor, DEFAULT_NAV } from "./lib/routing";
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
import { useNormalizedAzuroEvents } from "./web3/useAzuro";
import { PREDICTIONS_PROMOS } from "./lib/arenaPromos";
import { NetworkBanner } from "./components/shell/NetworkBanner";
import { GeoBlock } from "./components/shell/GeoBlock";
import { ArenaErrorBoundary } from "./components/shell/ArenaErrorBoundary";
import { useGeoCheck } from "./lib/geo";
import { CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from "@shared/chains";
import { track } from "./lib/telemetry";

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

// Recently-played games (most-recent-first), capped — feeds "Your games"
// content priority (recently played > favorites). Persisted like favorites.
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

  // Seed navigation from the URL so deep links work.
  const initialNav = parsePath(typeof window !== "undefined" ? window.location.pathname : "/");
  const [product, setProduct] = useState(initialNav.product);

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
      setProduct(nav.product);
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

  // Only one overlay owns focus/scroll-lock at a time — any dialog opening
  // closes the mobile drawer first so they never stack.
  const openFunds = () => { setMobileMenuOpen(false); if (!ensureAuth()) return; setFundsOpen(true); };
  const openHistory = () => { setMobileMenuOpen(false); if (!ensureAuth()) return; setHistoryOpen(true); };

  // Game tiles are real links (`?play=<favId>`) so middle-click / cmd-click opens
  // a new tab, like on most sites. These helpers keep that URL in sync with the
  // modal state for the in-page (left-click) path, and resolve it back to a
  // modal on load / back-forward so the link actually works when followed.
  const openGame = (game) => {
    // Full-screen games cover the whole viewport (z-50, fixed inset-0), but
    // the mobile menu (z-70) would still sit on top of and stay interactive
    // over a game otherwise — close it explicitly rather than rely on
    // stacking order alone.
    setMobileMenuOpen(false);
    if (game.kind === "onchain") {
      if (game.playable && ensureAuth()) {
        setOnchainGame(game);
        trackRecent(game);
        track("casino_game_opened", { gameId: game.favId, category: casinoCategory, walletState: wallet.isConnected ? "connected" : "disconnected" });
      }
      return;
    }
    setProviderGame(game);
    trackRecent(game);
    track("casino_game_opened", { gameId: game.favId, category: casinoCategory, walletState: wallet.isConnected ? "connected" : "disconnected" });
  };
  const launchGame = (game) => {
    window.history.pushState({}, "", gameHref(game));
    openGame(game);
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
  // Optimistic: the star fills / sidebar count updates immediately (setFavs is
  // synchronous). "Sync in background" has nothing real to sync against yet —
  // there's no favorites backend, only localStorage — so this always
  // "succeeds"; the shape (a resolved promise + a revert path) is here so a
  // real API can slot in later without changing the calling code or the
  // never-navigate/never-a-modal contract.
  const syncFavorite = () => Promise.resolve(true);
  const toggleFav = (game) => {
    const adding = !favs.has(game.favId);
    const next = new Set(favs);
    if (adding) next.add(game.favId); else next.delete(game.favId);
    setFavs(next);
    // Once connected, favorites are account-scoped — persist to that
    // account's own bucket so a different account connecting later on this
    // device never inherits this one's picks (see the merge effect below).
    if (wallet.isConnected && wallet.address) saveAccountFavs(wallet.address, next);
    syncFavorite(game, adding).then((ok) => {
      if (ok) {
        toast.success(adding ? "Added to Favorites" : "Removed from Favorites", adding ? {
          action: { label: "View favorites", onClick: () => { setCasinoCategory("Favorites"); } },
        } : undefined);
        track(adding ? "casino_favorite_added" : "casino_favorite_removed", { gameId: game.favId, category: casinoCategory });
      } else {
        const reverted = new Set(favs);
        if (adding) reverted.delete(game.favId); else reverted.add(game.favId);
        setFavs(reverted);
        if (wallet.isConnected && wallet.address) saveAccountFavs(wallet.address, reverted);
        toast.error("Couldn't update Favorites — Try again");
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
    const merged = new Set([...deviceBaselineRef.current, ...account]);
    const added = merged.size - deviceBaselineRef.current.size;
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
          ...CATEGORIES.filter((c) => c !== "Favorites").map((c) => ({ id: c, label: c, icon: CASINO_ICONS[c] })),
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
        onFunds={openFunds}
        onActivity={openHistory}
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

        <main ref={mainRef} className="min-w-0 flex-1 overflow-y-auto px-4 pb-nav pt-4 [scrollbar-gutter:stable]">
          <ArenaErrorBoundary key={product}>
            <div className="animate-fade-in-up">
              {product === "casino" && (
                <CasinoLobby
                  category={casinoCategory}
                  onLaunchOnchain={launchGame}
                  onLaunchProvider={launchGame}
                  isFav={isFav}
                  onFav={toggleFav}
                  recentIds={recentIds}
                  onBrowseGames={() => setCasinoCategory("Lobby")}
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
                />
              )}
            </div>
          </ArenaErrorBoundary>
          <Footer
            onResponsibleGambling={() => { setMobileMenuOpen(false); setRgOpen(true); }}
            onSupport={() => { setMobileMenuOpen(false); setSupportOpen(true); }}
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

      <MobileBottomNav
        product={product}
        onSelectArena={selectMobileArena}
        menuOpen={mobileMenuOpen}
        onToggleMenu={toggleMobileMenu}
      />
      <MobileFullScreenMenu
        open={mobileMenuOpen}
        title={mobileMenu.title}
        primaryItems={mobileMenu.primary}
        utilityItems={mobileMenu.utility}
        selected={sidebar.selected}
        onSelect={handleMobileMenuSelect}
        onClose={closeMobileMenu}
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

function CasinoLobby({ category, onLaunchOnchain, onLaunchProvider, isFav, onFav, recentIds, onBrowseGames }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const searchResults = q ? ALL_GAMES.filter((g) => g.title.toLowerCase().includes(q)) : [];

  const selectSearchResult = (game) => {
    (game.kind === "onchain" ? onLaunchOnchain : onLaunchProvider)(game);
    setQuery("");
  };
  const browseAll = () => { setQuery(""); onBrowseGames?.(); };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PromoStrip
        query={query}
        onQuery={setQuery}
        searchResults={searchResults}
        onSelectResult={selectSearchResult}
        onBrowseAll={browseAll}
        onZeroResults={(q) => track("casino_search_zero_results", { query: q, searchScope: "casino" })}
      />
      <CasinoCatalog
        category={category}
        query={query}
        onLaunch={onLaunchOnchain}
        onLaunchProvider={onLaunchProvider}
        isFav={isFav}
        onFav={onFav}
        recentIds={recentIds}
        onBrowseGames={browseAll}
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
