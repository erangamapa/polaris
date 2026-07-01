import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useBriefLoad } from "@/lib/useBriefLoad";
import {
  SPORTS, eventsBySport, liveCountBySport, groupByCompetition, getEvent, outcomeResult,
} from "@/lib/sportsData";
import { fmt } from "@/lib/format";
import { OddsFormatToggle } from "@/lib/odds";
import { EventRow } from "./EventRow";
import { EventDetail } from "./EventDetail";
import { BetSlip } from "./BetSlip";

export function SportsApp({ sport, balance, setBalance, onBet, ensureAuth, onViewBets }) {
  const ready = useBriefLoad();
  const [view, setView] = useState("upcoming");
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [selections, setSelections] = useState([]);
  const [mode, setMode] = useState("single");
  const [multiStake, setMultiStake] = useState(0);
  const [slipOpen, setSlipOpen] = useState(false);
  const [receipt, setReceipt] = useState(null); // { ref, count, stake, ret }
  const [live, setLive] = useState({}); // eventId -> { clock, min, suspended, odds:{marketKey:{pick:{odds,dir}}} }
  const [acceptChanges, setAcceptChanges] = useState(false);

  useEffect(() => { setDetailId(null); }, [sport, view]);
  useEffect(() => {
    if (!receipt) return;
    const t = setTimeout(() => setReceipt(null), 5000);
    return () => clearTimeout(t);
  }, [receipt]);

  // Live engine: drift odds, tick clock, occasionally suspend — for this sport's live events.
  useEffect(() => {
    const liveEvents = eventsBySport(sport, true);
    const seed = {};
    liveEvents.forEach((e) => {
      seed[e.id] = { clock: e.clock, min: /^\d+/.test(e.clock || "") ? parseInt(e.clock, 10) : null, suspended: false, odds: {} };
      e.markets.forEach((m) => {
        seed[e.id].odds[m.key] = {};
        m.outcomes.forEach((o) => { seed[e.id].odds[m.key][o.pick] = { odds: o.odds, dir: null }; });
      });
    });
    setLive(seed);
    if (liveEvents.length === 0) return;
    const drift = setInterval(() => {
      setLive((prev) => {
        const next = structuredClone(prev);
        liveEvents.forEach((e) => {
          const L = next[e.id];
          if (!L) return;
          if (Math.random() < 0.12) L.suspended = !L.suspended;
          if (L.min != null) { L.min = Math.min(90, L.min + 1); L.clock = `${L.min}'`; }
          if (!L.suspended) {
            e.markets.forEach((m) => m.outcomes.forEach((o) => {
              const c = L.odds[m.key][o.pick];
              const nv = +Math.max(1.05, c.odds + (Math.random() - 0.5) * 0.08).toFixed(2);
              c.dir = nv > c.odds ? "up" : nv < c.odds ? "down" : null;
              c.odds = nv;
            }));
          }
        });
        return next;
      });
      setTimeout(() => setLive((prev) => {
        const n = structuredClone(prev);
        Object.values(n).forEach((L) => Object.values(L.odds).forEach((mk) => Object.values(mk).forEach((o) => { o.dir = null; })));
        return n;
      }), 1300);
    }, 3000);
    return () => clearInterval(drift);
  }, [sport]);

  // Reconcile selections against live odds: auto-accept, or flag for re-accept.
  useEffect(() => {
    setSelections((sel) => {
      let changed = false;
      const next = sel.map((s) => {
        const cur = live[s.eventId]?.odds?.[s.marketKey]?.[s.resolver.pick]?.odds;
        if (cur == null) return s;
        if (cur === s.odds) {
          if (s.pendingOdds != null) { changed = true; return { ...s, pendingOdds: null }; }
          return s;
        }
        changed = true;
        return acceptChanges ? { ...s, odds: cur, pendingOdds: null } : { ...s, pendingOdds: cur };
      });
      return changed ? next : sel;
    });
  }, [live, acceptChanges]);

  const withLive = (event) => {
    const L = live[event.id];
    if (!L) return { ...event, suspended: false };
    return {
      ...event,
      suspended: L.suspended,
      clock: L.clock ?? event.clock,
      markets: event.markets.map((m) => ({
        ...m,
        outcomes: m.outcomes.map((o) => {
          const lo = L.odds?.[m.key]?.[o.pick];
          return lo ? { ...o, odds: lo.odds, dir: lo.dir } : o;
        }),
      })),
    };
  };

  const acceptAll = () =>
    setSelections((sel) => sel.map((s) => (s.pendingOdds != null ? { ...s, odds: s.pendingOdds, pendingOdds: null } : s)));

  const sportLabel = SPORTS.find((s) => s.id === sport)?.label ?? "Sport";
  const q = query.trim().toLowerCase();
  const filtered = eventsBySport(sport, view === "live").filter(
    (e) => !q || `${e.home} ${e.away} ${e.league} ${e.region}`.toLowerCase().includes(q)
  );
  const groups = groupByCompetition(filtered);
  const detailEvent = detailId ? getEvent(detailId) : null;
  const selectionFor = (id) => selections.find((s) => s.key === id);

  const pick = (event, market, outcome) => {
    setSelections((sel) => {
      const existing = sel.find((s) => s.key === event.id);
      if (existing && existing.marketKey === market.key && existing.outcomeLabel === outcome.label) {
        return sel.filter((s) => s.key !== event.id);
      }
      const next = {
        key: event.id, eventId: event.id,
        eventLabel: `${event.home} v ${event.away}`,
        marketKey: market.key, marketName: market.name,
        outcomeLabel: outcome.label, odds: outcome.odds,
        stake: existing?.stake ?? 0,
        resolver: { type: market.type, line: market.line, pick: outcome.pick, finalScore: event.finalScore },
      };
      return existing ? sel.map((s) => (s.key === event.id ? next : s)) : [...sel, next];
    });
  };

  const updateStake = (key, val) =>
    setSelections((sel) => sel.map((s) => (s.key === key ? { ...s, stake: val } : s)));
  const removeSelection = (key) => setSelections((sel) => sel.filter((s) => s.key !== key));
  const clear = () => { setSelections([]); setMultiStake(0); };

  const singleStake = selections.reduce((a, s) => a + (s.stake || 0), 0);
  const totalStake = mode === "multi" ? (multiStake || 0) : singleStake;

  const place = () => {
    if (ensureAuth && !ensureAuth()) return;
    if (totalStake <= 0 || totalStake > balance) return;
    setBalance((b) => b - totalStake);
    const results = selections.map((s) => outcomeResult(s.resolver, s.resolver.pick, s.resolver.finalScore));

    let count = 0, ret = 0;
    if (mode === "multi") {
      const combined = selections.reduce((a, s) => a * s.odds, 1);
      let result, potential;
      if (results.includes("lost")) { result = "lost"; potential = +(totalStake * combined).toFixed(2); }
      else {
        const nonVoid = selections.filter((_, i) => results[i] !== "void");
        if (nonVoid.length === 0) { result = "void"; potential = totalStake; }
        else { result = "won"; potential = +(totalStake * nonVoid.reduce((a, s) => a * s.odds, 1)).toFixed(2); }
      }
      onBet?.({ product: "sports", title: `Multi · ${selections.length} legs`, stake: totalStake, potential, result });
      count = 1; ret = +(totalStake * combined).toFixed(2);
    } else {
      selections.forEach((s, i) => {
        if (s.stake > 0) {
          onBet?.({ product: "sports", title: `${s.outcomeLabel} — ${s.eventLabel}`, stake: s.stake, potential: +(s.stake * s.odds).toFixed(2), result: results[i] });
          count += 1; ret += s.stake * s.odds;
        }
      });
    }
    setReceipt({ ref: "#" + Math.random().toString(36).slice(2, 7).toUpperCase(), count, stake: totalStake, ret: +ret.toFixed(2) });
    clear(); setSlipOpen(false);
  };

  const slip = (
    <BetSlip
      selections={selections} mode={mode} setMode={setMode}
      multiStake={multiStake} setMultiStake={setMultiStake}
      updateStake={updateStake} removeSelection={removeSelection}
      clear={clear} balance={balance} onPlace={place}
      acceptChanges={acceptChanges} setAcceptChanges={setAcceptChanges} onAcceptChanges={acceptAll}
    />
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <h1 className="text-xl font-bold">{sportLabel}</h1>
        <p className="text-sm text-muted-foreground">Live and upcoming matches.</p>
      </div>

      {receipt && (
        <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
          <span className="font-medium text-emerald-400">Bet placed ✓</span>
          <span className="font-mono text-xs text-muted-foreground">{receipt.ref}</span>
          <span className="text-xs text-muted-foreground">
            {receipt.count} bet{receipt.count !== 1 ? "s" : ""} · ${fmt(receipt.stake)} → ${fmt(receipt.ret)}
          </span>
          {onViewBets && (
            <button onClick={onViewBets} className="ml-auto text-xs font-medium text-emerald-400 hover:underline">
              View my bets →
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          {detailEvent ? (
            <EventDetail event={withLive(detailEvent)} selection={selectionFor(detailEvent.id)} onBack={() => setDetailId(null)} onPick={pick} />
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Tabs value={view} onValueChange={setView}>
                  <TabsList>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="live">
                      Live
                      {liveCountBySport(sport) > 0 && <span className="ml-1.5 size-1.5 rounded-full bg-rose-500" />}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search ${sportLabel.toLowerCase()}`}
                  aria-label="Search events"
                  className="h-9 sm:ml-auto sm:max-w-48"
                />
                <OddsFormatToggle />
              </div>

              {!ready ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-40" />
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
                </div>
              ) : groups.length === 0 ? (
                <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                  {q ? `No events match “${query}”.` : `No ${view === "live" ? "live" : "upcoming"} events for ${sportLabel}.`}
                </div>
              ) : (
                groups.map((g) => (
                  <section key={g.label}>
                    <h2 className="mb-2 text-sm font-bold text-muted-foreground">{g.label}</h2>
                    <div className="space-y-3">
                      {g.events.map((e) => (
                        <EventRow key={e.id} event={withLive(e)} selection={selectionFor(e.id)} onPick={pick} onOpen={(ev) => setDetailId(ev.id)} />
                      ))}
                    </div>
                  </section>
                ))
              )}
            </>
          )}
        </div>

        <aside className="hidden lg:block">
          <Card className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-hidden py-0">{slip}</Card>
        </aside>
      </div>

      {selections.length > 0 && (
        <div className="fixed inset-x-0 z-40 px-4 lg:hidden bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))]">
          <Button className="w-full bg-emerald-500 font-bold text-zinc-950 hover:bg-emerald-400" onClick={() => setSlipOpen(true)}>
            <span className="mr-2 grid size-5 place-items-center rounded-full bg-zinc-950/20 text-xs">{selections.length}</span>
            Bet Slip · ${fmt(totalStake)}
          </Button>
        </div>
      )}
      <Dialog open={slipOpen} onOpenChange={setSlipOpen}>
        <DialogContent className="max-w-sm gap-0 p-0">
          <DialogTitle className="sr-only">Bet Slip</DialogTitle>
          <div className="max-h-[80vh] overflow-hidden">{slip}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
