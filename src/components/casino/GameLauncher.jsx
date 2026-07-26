import { useState } from "react";
import { fmt } from "../../lib/format";

export function GameLauncher({ game, balance, setBalance, onRound, ensureAuth, onClose }) {
  const [bet, setBet] = useState(1);
  const [result, setResult] = useState(null);
  const [rolling, setRolling] = useState(false);
  const insufficient = bet > balance;

  const play = () => {
    if (ensureAuth && !ensureAuth()) return;
    if (insufficient || bet <= 0 || rolling) return;
    setRolling(true);
    setBalance((b) => b - bet);
    setTimeout(() => {
      const win = Math.random() > 0.5;
      const mult = win ? +(Math.random() * 2.5 + 1.1).toFixed(2) : 0;
      const payout = +(bet * mult).toFixed(2);
      if (win) setBalance((b) => b + payout);
      setResult({ win, amount: win ? payout : bet, mult });
      setRolling(false);
      onRound?.({ product: "casino", title: game.title, stake: bet, potential: win ? payout : 0, status: win ? "won" : "lost" });
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{game.title}</span>
          <span className="text-xs text-zinc-500">{game.provider}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-800 px-3 py-1.5 font-mono text-sm tabular-nums text-white">
            ${fmt(balance)}
          </div>
          <button onClick={onClose} aria-label="Close game" className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white">✕</button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className={`grid h-full max-h-[460px] w-full max-w-3xl place-items-center rounded-2xl bg-gradient-to-br ${game.hue} ${rolling ? "animate-pulse" : ""}`}>
          {result ? (
            <div className="text-center">
              <div className={`text-5xl font-black ${result.win ? "text-white" : "text-black/50"}`}>
                {result.win ? `${result.mult}×` : "—"}
              </div>
              <div className={`mt-2 text-lg font-bold ${result.win ? "text-white" : "text-black/60"}`}>
                {result.win ? `Won $${fmt(result.amount)}` : "No win"}
              </div>
            </div>
          ) : (
            <div className="text-center text-white/70">
              <div className="text-4xl">{game.title}</div>
              <div className="mt-1 text-sm">Set your stake and play</div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 bg-zinc-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex max-w-md items-end gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">Bet amount</span>
            <div className="flex items-center rounded-lg border border-white/5 bg-zinc-950 px-3">
              <span className="text-zinc-500">$</span>
              <input
                type="number"
                value={bet}
                min={0}
                onFocus={(e) => e.target.select()}
                onChange={(e) => setBet(Math.max(0, +e.target.value))}
                className="w-full bg-transparent py-2.5 px-2 font-mono tabular-nums text-white outline-none"
              />
              <button onClick={() => setBet((b) => +(b / 2).toFixed(2))} className="px-2 text-xs text-zinc-400 hover:text-white">½</button>
              <button onClick={() => setBet((b) => +(b * 2).toFixed(2))} className="px-2 text-xs text-zinc-400 hover:text-white">2×</button>
            </div>
          </label>
          {/* CTA OWNERSHIP SYSTEM: an arena action (Casino Action Purple),
              not a platform action — reverses an earlier pass's call. */}
          <button
            onClick={play}
            disabled={insufficient || rolling}
            className="h-[44px] rounded-lg bg-[var(--casino-action)] px-8 font-bold text-[var(--casino-action-text)] transition-colors hover:bg-[var(--casino-action-hover)] active:bg-[var(--casino-action-active)] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
          >
            {rolling ? "…" : insufficient ? "Low balance" : "Bet"}
          </button>
        </div>
      </div>
    </div>
  );
}
