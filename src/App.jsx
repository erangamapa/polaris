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
import { PromoHero } from "./components/casino/PromoHero";
import { BetSwirlGame } from "./components/casino/BetSwirlGame";
import { CasinoCatalog } from "./components/casino/CasinoCatalog";
import { FundsDialog } from "./components/wallet/FundsDialog";
import { BetHistoryDialog } from "./components/activity/BetHistoryDialog";
import { ResponsibleGamblingDialog } from "./components/trust/ResponsibleGamblingDialog";
import { SupportDialog } from "./components/trust/SupportDialog";
import { useWallet } from "./web3/useWallet";
import { toast } from "./lib/toast";
import { parsePath, pathFor } from "./lib/routing";
import { PredictionsApp } from "./components/predictions/PredictionsApp";
import { AzuroMarkets } from "./components/sports/AzuroMarkets";
import { CATEGORIES } from "./lib/mockData";
import { nowLabel } from "./lib/walletData";
import { PRED_CATEGORIES } from "./lib/predictionsData";
import { SPORTS, liveCountBySport } from "./lib/sportsData";

const CASINO_ICONS = {
  Lobby: LayoutGrid, Popular: Gem, Slots: Cherry, "Live Casino": Radio,
  "Game Shows": Tv, New: Sparkles, Favorites: Star,
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
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const [balance, setBalance] = useState(250);
  const [activity, setActivity] = useState([]);
  const [onchainGame, setOnchainGame] = useState(null);
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

  // Build the contextual sidebar for the active product.
  const sidebar = (() => {
    if (product === "casino") {
      return {
        title: "Casino",
        selected: casinoCategory,
        onSelect: setCasinoCategory,
        items: CATEGORIES.map((c) => ({ id: c, label: c, icon: CASINO_ICONS[c] })),
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
              <CasinoLobby onLaunchOnchain={(g) => { if (ensureAuth()) setOnchainGame(g); }} />
            )}
            {product === "predictions" && (
              <PredictionsApp section={predSection} balance={balance} setBalance={setBalance} onBet={placeBet} ensureAuth={ensureAuth} />
            )}
            {product === "sports" && (
              <div className="mx-auto max-w-6xl space-y-4">
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
        <BetSwirlGame game={onchainGame} onRound={logRound} onClose={() => setOnchainGame(null)} />
      )}
      <BetHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} casinoRounds={activity} />
      <ResponsibleGamblingDialog open={rgOpen} onClose={() => setRgOpen(false)} />
      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
      <FundsDialog open={fundsOpen} onClose={() => setFundsOpen(false)} />
    </div>
  );
}

function CasinoLobby({ onLaunchOnchain }) {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PromoHero />
      <CasinoCatalog onLaunch={onLaunchOnchain} />
    </div>
  );
}
