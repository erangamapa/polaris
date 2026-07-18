import { useState, useRef, useEffect } from "react";
import {
  LayoutGrid, Gem, Cherry, Radio, Tv, Sparkles, Star,
  Flame, Landmark, Bitcoin, Trophy, Cpu, LineChart, Wallet,
} from "lucide-react";
import { TopBar } from "./components/shell/TopBar";
import { Sidebar } from "./components/shell/Sidebar";
import { MobileProductBar } from "./components/shell/MobileProductBar";
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
import { parsePath, pathFor } from "./lib/routing";
import { PredictionsApp } from "./components/predictions/PredictionsApp";
import { AzuroMarkets } from "./components/sports/AzuroMarkets";
import { ArenaTileRow } from "./components/shell/ArenaTileRow";
import { CATEGORIES } from "./lib/mockData";
import { nowLabel } from "./lib/walletData";
import { PRED_CATEGORIES } from "./lib/predictionsData";
import { SPORTS, liveCountBySport } from "./lib/sportsData";
import { SPORTS_PROMOS, PREDICTIONS_PROMOS } from "./lib/arenaPromos";
import { NetworkBanner } from "./components/shell/NetworkBanner";
import { GeoBlock } from "./components/shell/GeoBlock";
import { useGeoCheck } from "./lib/geo";
import { CASINO_CHAIN_ID, SPORTS_CHAIN_ID } from "@shared/chains";
import { track } from "./lib/analytics";

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
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
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
  // fully hidden. Mobile (<768px): the original full-screen drawer overlay —
  // separate, ephemeral state, never persisted. Defaults (no stored
  // preference): expanded ≥1280px, collapsed 768-1279px.
  const [railMode, setRailMode] = useState(() => {
    const stored = loadSidebarMode();
    if (stored === "expanded" || stored === "collapsed") return stored;
    if (typeof window === "undefined") return "expanded";
    return window.innerWidth >= 1280 ? "expanded" : "collapsed";
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      const opening = !mobileDrawerOpen;
      setMobileDrawerOpen(opening);
      if (opening) track("casino_nav_opened", { sidebarState: "mobile-drawer" });
      return;
    }
    setRailMode((m) => {
      const next = m === "expanded" ? "collapsed" : "expanded";
      saveSidebarMode(next);
      track(next === "expanded" ? "casino_nav_expanded" : "casino_nav_collapsed", { sidebarState: next });
      return next;
    });
  };
  const sidebarLabel = typeof window !== "undefined" && window.innerWidth < 768
    ? (mobileDrawerOpen ? "Close menu" : "Open menu")
    : (railMode === "expanded" ? "Collapse menu" : "Expand menu");

  const [casinoCategory, setCasinoCategory] = useState(initialNav.casinoCategory);
  const [predSection, setPredSection] = useState(initialNav.predSection);
  const [sportId, setSportId] = useState(initialNav.sportId);

  // Keep the URL in sync with navigation, and restore state on back/forward.
  useEffect(() => {
    const path = pathFor({ product, casinoCategory, predSection, sportId });
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
  }, [product, casinoCategory, predSection, sportId]);
  useEffect(() => {
    const onPop = () => {
      const nav = parsePath(window.location.pathname);
      setProduct(nav.product);
      setCasinoCategory(nav.casinoCategory);
      setPredSection(nav.predSection);
      setSportId(nav.sportId);
      syncGameFromUrl();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [balance, setBalance] = useState(250);
  const [activity, setActivity] = useState([]);
  const [favs, setFavs] = useState(loadFavs);
  useEffect(() => { saveFavs(favs); }, [favs]);
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

  // Wallet connection replaces password login. Connecting (on the right network)
  // is the gate for placing bets; the Reown modal handles the connect flow.
  const wallet = useWallet();

  // Gate: require a connected wallet on Base Sepolia before betting.
  const ensureAuth = () => {
    if (!wallet.isConnected) { wallet.connect(); return false; }
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

  const openFunds = () => { if (!ensureAuth()) return; setFundsOpen(true); };
  const openHistory = () => { if (!ensureAuth()) return; setHistoryOpen(true); };

  // Game tiles are real links (`?play=<favId>`) so middle-click / cmd-click opens
  // a new tab, like on most sites. These helpers keep that URL in sync with the
  // modal state for the in-page (left-click) path, and resolve it back to a
  // modal on load / back-forward so the link actually works when followed.
  const openGame = (game) => {
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
    const bare = pathFor({ product, casinoCategory, predSection, sportId });
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
    setFavs((s) => {
      const n = new Set(s);
      if (adding) n.add(game.favId); else n.delete(game.favId);
      return n;
    });
    syncFavorite(game, adding).then((ok) => {
      if (ok) {
        toast.success(adding ? "Added to Favorites" : "Removed from Favorites", adding ? {
          action: { label: "View favorites", onClick: () => { setCasinoCategory("Favorites"); } },
        } : undefined);
        track(adding ? "casino_favorite_added" : "casino_favorite_removed", { gameId: game.favId, category: casinoCategory });
      } else {
        setFavs((s) => {
          const n = new Set(s);
          if (adding) n.delete(game.favId); else n.add(game.favId);
          return n;
        });
        toast.error("Couldn't update Favorites — Try again");
      }
    });
  };

  // Favorites work fully offline (local-first). On wallet connect, merge in
  // that address's own favorites as a union, deduped by game id — silently if
  // either set is empty, confirmation toast only (never a modal, never a
  // navigation). Mock account-favorites store (see loadAccountFavs above)
  // stands in for a real API; this effect is the only thing that would need
  // to change to point at one.
  const mergedForAddress = useRef(null);
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) { mergedForAddress.current = null; return; }
    if (mergedForAddress.current === wallet.address) return;
    mergedForAddress.current = wallet.address;
    track("wallet_connected", { walletState: "connected" });
    const account = loadAccountFavs(wallet.address);
    const merged = new Set([...favs, ...account]);
    const added = merged.size - favs.size;
    if (added > 0) {
      setFavs(merged);
      toast.success(`Synced ${added} favorite${added === 1 ? "" : "s"} from your wallet`);
    }
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
    return {
      title: "Sports",
      selected: sportId,
      onSelect: setSportId,
      items: SPORTS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, live: liveCountBySport(s.id) })),
    };
  })();

  const handleSelect = (id) => {
    sidebar.onSelect(id);
    track("casino_nav_item_selected", { category: id, sidebarState: railMode });
    if (typeof window !== "undefined" && window.innerWidth < 768) setMobileDrawerOpen(false);
  };

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
          mobileOpen={mobileDrawerOpen}
          onCloseMobile={() => setMobileDrawerOpen(false)}
          product={product}
          setProduct={setProduct}
          items={sidebar.items}
          selected={sidebar.selected}
          onSelect={handleSelect}
        />

        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-4 [scrollbar-gutter:stable]">
          <div key={product} className="animate-fade-in-up">
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
            {product === "sports" && <SportsSection onBetPlaced={logRound} />}
          </div>
          <Footer onResponsibleGambling={() => setRgOpen(true)} onSupport={() => setSupportOpen(true)} />
        </main>
      </div>

      <MobileProductBar product={product} setProduct={setProduct} />
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

function SportsSection({ onBetPlaced }) {
  const [query, setQuery] = useState("");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ArenaTileRow arena="sports" promos={SPORTS_PROMOS} query={query} onQuery={setQuery} />
      <AzuroMarkets onBetPlaced={onBetPlaced} query={query} />
    </div>
  );
}
