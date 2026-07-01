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
import { GameRail } from "./components/casino/GameRail";
import { GameTile } from "./components/casino/GameTile";
import { CategoryGrid } from "./components/casino/CategoryGrid";
import { LiveFeed } from "./components/casino/LiveFeed";
import { GameLauncher } from "./components/casino/GameLauncher";
import { WalletDialog } from "./components/wallet/WalletDialog";
import { ActivityDialog } from "./components/activity/ActivityDialog";
import { AuthModal } from "./components/auth/AuthModal";
import { KycModal } from "./components/auth/KycModal";
import { AccountDialog } from "./components/auth/AccountDialog";
import { ResponsibleGamblingDialog } from "./components/trust/ResponsibleGamblingDialog";
import { SupportDialog } from "./components/trust/SupportDialog";
import { loadSession, saveSession } from "./lib/session";
import { parsePath, pathFor } from "./lib/routing";
import { PredictionsApp } from "./components/predictions/PredictionsApp";
import { SportsApp } from "./components/sports/SportsApp";
import { Skeleton } from "./components/ui/skeleton";
import { useBriefLoad } from "./lib/useBriefLoad";
import { RAILS, ALL_GAMES, getGamesByCategory, CATEGORIES } from "./lib/mockData";
import { INITIAL_TXNS, nowLabel } from "./lib/walletData";
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

  const [query, setQuery] = useState("");
  const [balance, setBalance] = useState(250);
  const [pending, setPending] = useState(0);
  const [txns, setTxns] = useState(INITIAL_TXNS);
  const [activity, setActivity] = useState([]);
  const [launched, setLaunched] = useState(null);
  const [walletOpen, setWalletOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [favs, setFavs] = useState(() => new Set());

  // Mock session: null | { method, label, verified }
  const [user, setUser] = useState(() => loadSession());
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [kycOpen, setKycOpen] = useState(false);
  const [kycIntent, setKycIntent] = useState(null); // "wallet" | null
  const [accountOpen, setAccountOpen] = useState(false);
  const [pendingWallet, setPendingWallet] = useState(false);
  const [rgOpen, setRgOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => { saveSession(user); }, [user]);

  const openAuth = (tab = "login") => { setAuthTab(tab); setAuthOpen(true); };
  const ensureAuth = () => { if (user) return true; setPendingWallet(false); openAuth("login"); return false; };

  const onAuthed = (u) => {
    setUser(u);
    setAuthOpen(false);
    if (pendingWallet) {
      setPendingWallet(false);
      if (!u.verified) { setKycIntent("wallet"); setKycOpen(true); }
      else setWalletOpen(true);
    }
  };

  const openWallet = () => {
    if (!user) { setPendingWallet(true); openAuth("login"); return; }
    if (!user.verified) { setKycIntent("wallet"); setKycOpen(true); return; }
    setWalletOpen(true);
  };

  const onVerified = () => {
    setUser((u) => ({ ...u, verified: true }));
    setKycOpen(false);
    if (kycIntent === "wallet") setWalletOpen(true);
    setKycIntent(null);
  };

  const openActivity = () => { if (!ensureAuth()) return; setActivityOpen(true); };
  const logout = () => { setUser(null); setAccountOpen(false); };

  // In-play = sum of stakes on still-open bets/positions.
  const inPlay = activity.reduce((s, a) => (a.status === "open" ? s + a.stake : s), 0);

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

  // Mock cash-out value for an open bet: midway between stake and potential, minus a small margin.
  const cashoutValue = (a) => +(((a.stake + a.potential) / 2) * 0.9).toFixed(2);

  const cashOut = (id, fraction = 1) => {
    const a = activityRef.current.find((x) => x.id === id);
    if (!a || a.status !== "open" || a.product !== "sports") return;
    const amount = +(cashoutValue(a) * fraction).toFixed(2);
    setBalance((b) => +(b + amount).toFixed(2));
    if (fraction >= 1) {
      setActivity((list) => list.map((x) => (x.id === id ? { ...x, status: "cashedout", cashout: amount } : x)));
    } else {
      // Partial: bank the fraction, leave the rest of the bet live.
      setActivity((list) =>
        list.map((x) =>
          x.id === id
            ? { ...x, stake: +(x.stake * (1 - fraction)).toFixed(2), potential: +(x.potential * (1 - fraction)).toFixed(2) }
            : x
        )
      );
    }
  };

  const pushTxn = (t) => setTxns((x) => [t, ...x]);
  const toggleFav = (g) =>
    setFavs((s) => {
      const n = new Set(s);
      const k = `${g.title}-${g.provider}`;
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

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
        balance={balance}
        user={user}
        onLogin={() => openAuth("login")}
        onRegister={() => openAuth("register")}
        onAccount={() => setAccountOpen(true)}
        onDeposit={openWallet}
        onActivity={openActivity}
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
                query={query}
                setQuery={setQuery}
                onLaunch={setLaunched}
                favs={favs}
                onFav={toggleFav}
              />
            )}
            {product === "predictions" && (
              <PredictionsApp section={predSection} balance={balance} setBalance={setBalance} onBet={placeBet} ensureAuth={ensureAuth} />
            )}
            {product === "sports" && (
              <SportsApp sport={sportId} balance={balance} setBalance={setBalance} onBet={placeBet} ensureAuth={ensureAuth} onViewBets={openActivity} />
            )}
          </div>
          <Footer onResponsibleGambling={() => setRgOpen(true)} onSupport={() => setSupportOpen(true)} />
        </main>
      </div>

      <MobileProductBar product={product} setProduct={setProduct} />
      <Toaster />
      <DevPanel />

      {launched && (
        <GameLauncher game={launched} balance={balance} setBalance={setBalance} onRound={logRound} ensureAuth={ensureAuth} onClose={() => setLaunched(null)} />
      )}
      <ActivityDialog open={activityOpen} onClose={() => setActivityOpen(false)} activity={activity} onCashOut={cashOut} cashoutValue={cashoutValue} />
      <AuthModal open={authOpen} initialTab={authTab} onClose={() => setAuthOpen(false)} onAuthed={onAuthed} />
      <KycModal open={kycOpen} onClose={() => { setKycOpen(false); setKycIntent(null); }} onVerified={onVerified} />
      <AccountDialog open={accountOpen} onClose={() => setAccountOpen(false)} user={user} onVerify={() => { setAccountOpen(false); setKycIntent(null); setKycOpen(true); }} onResponsibleGambling={() => { setAccountOpen(false); setRgOpen(true); }} onLogout={logout} />
      <ResponsibleGamblingDialog open={rgOpen} onClose={() => setRgOpen(false)} />
      <SupportDialog open={supportOpen} onClose={() => setSupportOpen(false)} />
      <WalletDialog
        open={walletOpen}
        onClose={() => setWalletOpen(false)}
        balance={balance}
        inPlay={inPlay}
        pending={pending}
        txns={txns}
        setBalance={setBalance}
        setPending={setPending}
        pushTxn={pushTxn}
      />
    </div>
  );
}

function TileSkeletons({ count = 6 }) {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-[180px] w-[136px] shrink-0 rounded-xl" />
      ))}
    </div>
  );
}

function CasinoLobby({ category, query, setQuery, onLaunch, favs, onFav }) {
  const ready = useBriefLoad();
  const isFav = (g) => favs.has(`${g.title}-${g.provider}`);
  const searching = query.trim().length > 0;
  const results = ALL_GAMES.filter((g) => g.title.toLowerCase().includes(query.toLowerCase()));
  const categoryGames =
    category === "Favorites" ? ALL_GAMES.filter(isFav) : getGamesByCategory(category); // null === Lobby

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {category === "Lobby" && !searching && <PromoHero />}

      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search games"
          aria-label="Search games"
          className="w-full rounded-lg border bg-card py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring/50"
        />
      </div>

      {searching ? (
        <section>
          <h2 className="mb-3 text-sm font-bold">
            {results.length} result{results.length !== 1 ? "s" : ""} for “{query}”
          </h2>
          {results.length ? (
            <div className="flex flex-wrap gap-3">
              {results.map((g) => (
                <GameTile key={`${g.title}-${g.provider}`} game={g} onLaunch={onLaunch} faved={isFav(g)} onFav={onFav} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              No games match. Try another title.
            </div>
          )}
        </section>
      ) : !ready ? (
        <div className="space-y-6">
          <Skeleton className="h-5 w-40" />
          <TileSkeletons />
          <Skeleton className="h-5 w-32" />
          <TileSkeletons />
        </div>
      ) : categoryGames === null ? (
        <>
          {RAILS.map((rail) => (
            <GameRail key={rail.id} rail={rail} onLaunch={onLaunch} isFav={isFav} onFav={onFav} />
          ))}
          <LiveFeed />
        </>
      ) : (
        <>
          <CategoryGrid category={category} games={categoryGames} onLaunch={onLaunch} isFav={isFav} onFav={onFav} />
          <LiveFeed />
        </>
      )}
    </div>
  );
}
