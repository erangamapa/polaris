import { useState } from "react";
import { MarketCard } from "./MarketCard";
import { MarketDetail } from "./MarketDetail";
import { PositionTicket } from "./PositionTicket";
import { PositionsTable } from "./PositionsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useBriefLoad } from "@/lib/useBriefLoad";
import { marketsByCategory, POSITIONS } from "@/lib/predictionsData";

// `section` is a category name (Trending, Politics, ...) or "My Positions".
export function PredictionsApp({ section, balance, setBalance, onBet, ensureAuth }) {
  const ready = useBriefLoad();
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState(null);
  const [positions, setPositions] = useState(POSITIONS);
  const [ticket, setTicket] = useState({ open: false, market: null, side: "Yes" });

  const openTicket = (market, side) => setTicket({ open: true, market, side });
  const setSide = (side) => setTicket((t) => ({ ...t, side }));

  const confirm = ({ market, side, amount, shares, price }) => {
    if (ensureAuth && !ensureAuth()) return;
    setBalance((b) => b - amount);
    onBet?.({ product: "predictions", title: `${side} — ${market.question}`, stake: amount, potential: +shares.toFixed(2), winProb: price });
    setPositions((ps) => [
      { id: `n${Date.now()}`, marketId: market.id, question: market.question, side, shares, avgPrice: price, status: "open" },
      ...ps,
    ]);
    setTicket((t) => ({ ...t, open: false }));
  };

  const isPositions = section === "My Positions";
  const q = query.trim().toLowerCase();
  const markets = isPositions
    ? []
    : marketsByCategory(section).filter((m) => !q || m.question.toLowerCase().includes(q));

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {detail ? (
        <MarketDetail market={detail} onBack={() => setDetail(null)} onBuy={openTicket} />
      ) : isPositions ? (
        <>
          <div>
            <h1 className="text-xl font-bold">My Positions</h1>
            <p className="text-sm text-muted-foreground">Your open and settled prediction positions.</p>
          </div>
          <PositionsTable positions={positions} />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-xl font-bold">{section}</h1>
              <p className="text-sm text-muted-foreground">Take a Yes/No position on real-world events.</p>
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search markets"
              aria-label="Search markets"
              className="h-9 sm:max-w-56"
            />
          </div>
          {!ready ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[132px] w-full rounded-xl" />
              ))}
            </div>
          ) : markets.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              {q ? `No markets match “${query}”.` : "No markets in this category yet."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((m) => (
                <MarketCard key={m.id} market={m} onOpen={setDetail} onQuickBuy={openTicket} />
              ))}
            </div>
          )}
        </>
      )}

      <PositionTicket
        market={ticket.market}
        side={ticket.side}
        setSide={setSide}
        open={ticket.open}
        onOpenChange={(open) => setTicket((t) => ({ ...t, open }))}
        balance={balance}
        onConfirm={confirm}
      />
    </div>
  );
}
