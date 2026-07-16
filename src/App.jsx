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
import { CasinoCatalog, gameHref, findGameByFavId } from "./components/casino/CasinoCatalog";
import { FundsDialog } from "./components/wallet/FundsDialog";
import { BetHistoryDialog } from "./components/activity/BetHistoryDialog";
import { ResponsibleGamblingDialog } from "./components/trust/ResponsibleGamblingDialog";
import { SupportDialog } from "./components/trust/SupportDialog";
import { useWallet } from "./web3/useWallet";
import { toast } from "./lib/toast";
import { parsePath, pathFor } from "./lib/routing";
import { PredictionsApp } from "./components/predictions/PredictionsApp";
import { AzuroMarkets } from "./components/sports/AzuroMarkets";
import { SectionHero } from "./components/shell/SectionHero";
import { CATEGORIES } from "./lib/mockData";
import { nowLabel } from "./lib/walletData";
import { PRED_CATEGORIES } from "./lib/predictionsData";
import { SPORTS, liveCountBySport } from "./lib/sportsData";

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
const PRED_ICONS = {
  Trending: Flame, Politics: Landmark, Crypto: Bitcoin, Sports: Trophy, Tech: Cpu, Economy: LineChart,
};

export default function App() {
  // Seed navigation from the URL so deep links work.
  const initialNav = parsePath(typeof window !== "undefined" ? window.location.pathname : "/");
  const [product, setProduct] = useState(initialNav.product);
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );

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
    if (wallet.wrongNetwork) { toast.warning("Switch to Base Sepolia to continue"); wallet.switchToBaseSepolia(); return false; }
    return true;
  };

  const openFunds = () => { if (!ensureAuth()) return; setFundsOpen(true); };
  const openHistory = () => { if (!ensureAuth()) return; setHistoryOpen(true); };

  // Game tiles are real links (`?play=<favId>`) so middle-click / cmd-click opens
  // a new tab, like on most sites. These helpers keep that URL in sync with the
  // modal state for the in-page (left-click) path, and resolve it back to a
  // modal on load / back-forward so the link actually works when followed.
  const openGame = (game) => {
    if (game.kind === "onchain") {
      if (game.playable && ensureAuth()) setOnchainGame(game);
      return;
    }
    setProviderGame(game);
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
  const toggleFav = (game) => {
    const adding = !favs.has(game.favId);
    setFavs((s) => {
      const n = new Set(s);
      if (adding) n.add(game.favId); else n.delete(game.favId);
      return n;
    });
    if (adding) toast.success("Added to favorites", { message: game.title });
  };

  // Build the contextual sidebar for the active product.
  const sidebar = (() => {
    if (product === "casino") {
      return {
        title: "Casino",
        selected: casinoCategory,
        onSelect: setCasinoCategory,
        items: CATEGORIES.map((c) => ({
          id: c, label: c, icon: CASINO_ICONS[c],
          count: c === "Favorites" && favs.size > 0 ? favs.size : undefined,
        })),
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
    if (typeof window !== "undefined" && window.innerWidth < 1024) setSidebarOpen(false);
  };

  return (
    <div data-product={product} className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <TopBar
        onBurger={() => setSidebarOpen((o) => !o)}
        onManageWallet={openFunds}
        onFunds={openFunds}
        onActivity={openHistory}
      />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          product={product}
          setProduct={setProduct}
          items={sidebar.items}
          selected={sidebar.selected}
          onSelect={handleSelect}
        />

        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-8 pt-4">
          <div key={product} className="animate-fade-in-up">
            {product === "casino" && (
              <CasinoLobby
                category={casinoCategory}
                onLaunchOnchain={launchGame}
                onLaunchProvider={launchGame}
                isFav={isFav}
                onFav={toggleFav}
              />
            )}
            {product === "predictions" && (
              <div className="mx-auto max-w-6xl space-y-4">
                <SectionHero
                  eyebrow="Prediction markets"
                  title="Markets move fast"
                  body="Trade Yes/No on real-world events. Live prices, cash out anytime."
                  image="/heroes/predictions-hero.png"
                  tint="radial-gradient(120% 150% at 16% 18%, rgba(79,167,184,0.22), transparent 55%), linear-gradient(135deg, #0F2025 0%, #0C1418 100%)"
                />
                <PredictionsApp section={predSection} balance={balance} setBalance={setBalance} onBet={placeBet} ensureAuth={ensureAuth} />
              </div>
            )}
            {product === "sports" && (
              <div className="mx-auto max-w-6xl space-y-4">
                <SectionHero
                  eyebrow="Live now"
                  title="Big matches, sharper odds"
                  body="Live and upcoming across the top leagues. On-chain bets, settled trustlessly."
                  image="/heroes/sports-hero.png"
                  tint="radial-gradient(120% 150% at 16% 18%, rgba(175,195,74,0.20), transparent 55%), linear-gradient(135deg, #1B2110 0%, #11150D 100%)"
                />
                <AzuroMarkets onBetPlaced={logRound} />
              </div>
            )}
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

function CasinoLobby({ category, onLaunchOnchain, onLaunchProvider, isFav, onFav }) {
  const [query, setQuery] = useState("");
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PromoStrip query={query} onQuery={setQuery} />
      <CasinoCatalog
        category={category}
        query={query}
        onLaunch={onLaunchOnchain}
        onLaunchProvider={onLaunchProvider}
        isFav={isFav}
        onFav={onFav}
      />
    </div>
  );
}
