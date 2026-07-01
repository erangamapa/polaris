import { useState, useEffect } from "react";
import { fmt } from "../../lib/format";
import { TICKER_NAMES, FEED_GAMES } from "../../lib/mockData";

const TABS = ["Bets", "High Rollers", "Races"];

function makeRow(highRoller = false) {
  const bet = highRoller
    ? Math.random() * 9000 + 1000
    : Math.random() * 400 + 2;
  const win = Math.random() > 0.45;
  const mult = win ? +(Math.random() * 8 + 1.1).toFixed(2) : 0;
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: TICKER_NAMES[Math.floor(Math.random() * TICKER_NAMES.length)],
    game: FEED_GAMES[Math.floor(Math.random() * FEED_GAMES.length)],
    bet: +bet.toFixed(2),
    mult,
    payout: +(bet * mult).toFixed(2),
    win,
  };
}

export function LiveFeed() {
  const [tab, setTab] = useState("Bets");
  const [rows, setRows] = useState(() =>
    Array.from({ length: 8 }, () => makeRow())
  );

  const highRoller = tab === "High Rollers";

  // Reset feed when switching between Bets / High Rollers.
  useEffect(() => {
    setRows(Array.from({ length: 8 }, () => makeRow(highRoller)));
  }, [highRoller]);

  useEffect(() => {
    if (tab === "Races") return; // races tab is static for now
    const t = setInterval(() => {
      setRows((r) => [makeRow(highRoller), ...r].slice(0, 8));
    }, 1600);
    return () => clearInterval(t);
  }, [tab, highRoller]);

  return (
    <section className="rounded-2xl border border-white/5 bg-zinc-900/50">
      <div className="flex items-center gap-1 border-b border-white/5 p-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto mr-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--success)]" /> Live
        </span>
      </div>

      {tab === "Races" ? (
        <div className="grid place-items-center p-10 text-center text-sm text-zinc-500">
          $50,000 Weekly Race leaderboard — wager to enter. (Coming soon)
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2 font-medium">Game</th>
                <th className="px-4 py-2 font-medium">Player</th>
                <th className="px-4 py-2 text-right font-medium">Bet</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Multiplier</th>
                <th className="px-4 py-2 text-right font-medium">Payout</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="px-4 py-2 text-zinc-300">{r.game}</td>
                  <td className="px-4 py-2 text-zinc-400">{r.name}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-zinc-300">${fmt(r.bet)}</td>
                  <td className="hidden px-4 py-2 text-right font-mono tabular-nums text-zinc-400 sm:table-cell">
                    {r.win ? `${r.mult.toFixed(2)}×` : "—"}
                  </td>
                  <td className={`px-4 py-2 text-right font-mono tabular-nums ${r.win ? "text-[var(--success)]" : "text-zinc-500"}`}>
                    {r.win ? `+$${fmt(r.payout)}` : `−$${fmt(r.bet)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
