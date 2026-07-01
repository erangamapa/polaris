import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useBetSwirl } from "@/web3/useBetSwirl";
import { useWallet } from "@/web3/useWallet";
import { baseSepolia } from "@shared/chains";
import { toast } from "@/lib/toast";

const txUrl = (hash) => `${baseSepolia.blockExplorers.default.url}/tx/${hash}`;

// A real, on-chain BetSwirl game (Dice or Coin Toss). Every play is a wallet
// transaction settled by Chainlink VRF; winnings pay straight to the player.
export function BetSwirlGame({ game, onClose, onRound }) {
  const { nativeBalance } = useWallet();
  const { ready, playDice, playCoinToss } = useBetSwirl();

  const [betEth, setBetEth] = useState(0.00001);
  const [cap, setCap] = useState(50); // dice win chance
  const [face, setFace] = useState("HEADS");
  const [phase, setPhase] = useState("idle"); // idle | confirming | rolling | done
  const [result, setResult] = useState(null);
  const [betTx, setBetTx] = useState(null);

  const isDice = game.key === "dice";
  const busy = phase === "confirming" || phase === "rolling";
  const insufficient = betEth > nativeBalance;
  const winChance = isDice ? cap : 50;

  const play = async () => {
    if (!ready) { toast.error("Connect your wallet first"); return; }
    if (insufficient || betEth <= 0 || busy) return;
    setResult(null);
    setBetTx(null);
    setPhase("confirming");
    try {
      const onBetPlaced = ({ betTxnHash }) => { setBetTx(betTxnHash); setPhase("rolling"); };
      const run = isDice
        ? playDice({ betEth, cap, onBetPlaced })
        : playCoinToss({ betEth, face, onBetPlaced });
      const { rolledBet } = await run;
      setResult(rolledBet);
      setPhase("done");
      onRound?.({
        product: "casino",
        title: game.title,
        stake: betEth,
        potential: rolledBet.isWin ? Number(rolledBet.formattedPayout) : 0,
        status: rolledBet.isWin ? "won" : "lost",
        txnHash: rolledBet.rollTxnHash,
      });
      toast[rolledBet.isWin ? "success" : "info"](
        rolledBet.isWin ? `Won ${rolledBet.formattedPayout} ETH` : "No win this round",
      );
    } catch (e) {
      setPhase("idle");
      // User rejection or revert — surface a short message.
      toast.error(e.shortMessage || e.message || "Bet failed");
    }
  };

  const statusText = phase === "confirming" ? "Confirm in your wallet…"
    : phase === "rolling" ? "Rolling — Chainlink VRF…"
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-white">{game.title}</span>
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">On-chain · BetSwirl</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-zinc-800 px-3 py-1.5 font-mono text-sm tabular-nums text-white">
            {nativeBalance.toFixed(5)} ETH
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close game" className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white disabled:opacity-40">✕</button>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className={`grid h-full max-h-[460px] w-full max-w-3xl place-items-center rounded-2xl bg-gradient-to-br ${game.hue} ${busy ? "animate-pulse" : ""}`}>
          {statusText ? (
            <div className="flex flex-col items-center gap-3 text-white">
              <Loader2 className="size-8 animate-spin" />
              <div className="text-lg font-semibold">{statusText}</div>
              {betTx && <a href={txUrl(betTx)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-white/80 hover:underline"><ExternalLink className="size-3.5" /> bet tx</a>}
            </div>
          ) : result ? (
            <div className="text-center">
              <div className={`text-5xl font-black ${result.isWin ? "text-white" : "text-black/50"}`}>
                {result.isWin ? `${result.formattedPayoutMultiplier}×` : "—"}
              </div>
              <div className={`mt-2 text-lg font-bold ${result.isWin ? "text-white" : "text-black/60"}`}>
                {result.isWin ? `Won ${result.formattedPayout} ETH` : "No win"}
              </div>
              <a href={txUrl(result.rollTxnHash)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-white/80 hover:underline">
                <ExternalLink className="size-3.5" /> verify roll on-chain
              </a>
            </div>
          ) : (
            <div className="text-center text-white/80">
              <div className="text-4xl font-bold">{game.title}</div>
              <div className="mt-1 text-sm">Provably fair · settles to your wallet</div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-white/5 bg-zinc-900 p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          {isDice ? (
            <label className="block">
              <span className="mb-1 flex justify-between text-[11px] uppercase tracking-wide text-zinc-500">
                <span>Win chance</span><span className="text-zinc-300">{winChance}%</span>
              </span>
              <input type="range" min={2} max={95} value={cap} onChange={(e) => setCap(+e.target.value)} disabled={busy} className="w-full accent-[var(--casino-primary)]" />
            </label>
          ) : (
            <div className="flex gap-2">
              {["HEADS", "TAILS"].map((f) => (
                <button key={f} onClick={() => setFace(f)} disabled={busy}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${face === f ? "bg-[var(--casino-primary)] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>
                  {f}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">Bet amount (ETH)</span>
              <div className="flex items-center rounded-lg border border-white/5 bg-zinc-950 px-3">
                <input
                  type="number" value={betEth} min={0} step={0.00001} disabled={busy}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setBetEth(Math.max(0, +e.target.value))}
                  className="w-full bg-transparent py-2.5 px-1 font-mono tabular-nums text-white outline-none"
                />
                <button onClick={() => setBetEth((b) => +(b / 2).toFixed(6))} disabled={busy} className="px-2 text-xs text-zinc-400 hover:text-white">½</button>
                <button onClick={() => setBetEth((b) => +(b * 2).toFixed(6))} disabled={busy} className="px-2 text-xs text-zinc-400 hover:text-white">2×</button>
              </div>
            </label>
            <button
              onClick={play}
              disabled={insufficient || busy || !ready}
              data-test-id="betswirl-play"
              className="h-[44px] rounded-lg bg-[var(--casino-primary)] px-8 font-bold text-white transition hover:bg-[var(--casino-primary-hover)] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500"
            >
              {busy ? "…" : insufficient ? "Low balance" : "Bet"}
            </button>
          </div>
          <p className="text-center text-[11px] text-zinc-500">Each bet is an on-chain transaction (gas + Chainlink VRF fee).</p>
        </div>
      </div>
    </div>
  );
}
