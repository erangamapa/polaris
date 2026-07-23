import { useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { useBetSwirl } from "@/web3/useBetSwirl";
import { useWallet } from "@/web3/useWallet";
import { baseSepolia } from "@shared/chains";
import { toast } from "@/lib/toast";

const txUrl = (hash) => `${baseSepolia.blockExplorers.default.url}/tx/${hash}`;
const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0..36

// A real, on-chain BetSwirl game. Every play is a wallet transaction settled by
// Chainlink VRF; winnings pay straight to the player. Renders only its own
// inner content now (visual + controls) — the outer fixed frame, header,
// title and the one close button all live in CasinoGameplayFrame.jsx (see
// GAME CONTAINER task: "outer frame ownership should be shared" /
// "do not show multiple competing close buttons").
export function BetSwirlGame({ game, onRound, onBusyChange }) {
  const { casinoBalance } = useWallet();
  const { ready, play } = useBetSwirl();

  const [betEth, setBetEth] = useState(0.00001);
  const [cap, setCap] = useState(50); // dice win chance
  const [face, setFace] = useState("HEADS"); // coin
  const [rouletteNums, setRouletteNums] = useState([17]); // roulette
  const [balls, setBalls] = useState([1, 2, 3]); // keno
  const [phase, setPhase] = useState("idle"); // idle | confirming | rolling | done
  const [result, setResult] = useState(null);
  const [betTx, setBetTx] = useState(null);

  const busy = phase === "confirming" || phase === "rolling";
  const insufficient = betEth > casinoBalance;

  // Reports busy state up to GameLaunchSurface (see that file), which
  // disables the shared frame's one close control while a bet is
  // mid-confirmation — abandoning that has a real consequence (a pending
  // wallet tx / VRF roll), unlike the previous phases.
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  const selectionFor = () => {
    if (game.control === "dice") return { cap };
    if (game.control === "coin") return { face };
    if (game.control === "roulette") return { numbers: rouletteNums };
    if (game.control === "keno") return { balls };
    return {};
  };

  const play_ = async () => {
    if (!ready) { toast.error("Connect your wallet first"); return; }
    if (insufficient || betEth <= 0 || busy) return;
    setResult(null); setBetTx(null); setPhase("confirming");
    try {
      const { rolledBet } = await play({
        gameKey: game.key,
        betEth,
        selection: selectionFor(),
        onBetPlaced: ({ betTxnHash }) => { setBetTx(betTxnHash); setPhase("rolling"); },
      });
      setResult(rolledBet);
      setPhase("done");
      onRound?.({
        product: "casino", title: game.title, stake: betEth,
        potential: rolledBet.isWin ? Number(rolledBet.formattedPayout) : 0,
        status: rolledBet.isWin ? "won" : "lost", txnHash: rolledBet.rollTxnHash,
      });
      toast[rolledBet.isWin ? "success" : "info"](rolledBet.isWin ? `Won ${rolledBet.formattedPayout} ETH` : "No win this round");
    } catch (e) {
      setPhase("idle");
      toast.error(e.shortMessage || e.message || "Bet failed");
    }
  };

  const statusText = phase === "confirming" ? "Confirm in your wallet…"
    : phase === "rolling" ? "Rolling — Chainlink VRF…" : null;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/70">On-chain · BetSwirl</span>
        <div className="rounded-lg bg-zinc-800 px-3 py-1.5 font-mono text-sm tabular-nums text-white">{casinoBalance.toFixed(5)} ETH</div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {/* Fills whatever the shared CasinoGameplayFrame content-box already
            allotted (viewport-aware, see that file) rather than a second,
            independent fixed cap on top of it — see DESKTOP SIZING RULES:
            "do not hardcode one fixed width and height for all displays." */}
        <div
          className="relative grid h-full w-full place-items-center overflow-hidden rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: `url(${game.image})` }}
        >
          <div className="absolute inset-0 bg-black/45" />
          <div className={`relative ${busy ? "animate-pulse" : ""}`}>
            {statusText ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="size-8 animate-spin" />
                <div className="text-lg font-semibold">{statusText}</div>
                {betTx && <a href={txUrl(betTx)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-white/80 hover:underline"><ExternalLink className="size-3.5" /> bet tx</a>}
              </div>
            ) : result ? (
              <div className="text-center">
                <div className={`text-5xl font-black ${result.isWin ? "text-white" : "text-white/40"}`}>{result.isWin ? `${result.formattedPayoutMultiplier}×` : "—"}</div>
                <div className={`mt-2 text-lg font-bold ${result.isWin ? "text-white" : "text-white/70"}`}>{result.isWin ? `Won ${result.formattedPayout} ETH` : "No win"}</div>
                <a href={txUrl(result.rollTxnHash)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm text-white/80 hover:underline"><ExternalLink className="size-3.5" /> verify roll on-chain</a>
              </div>
            ) : (
              <div className="text-center text-white drop-shadow">
                <div className="text-4xl font-bold">{game.title}</div>
                <div className="mt-1 text-sm text-white/80">Provably fair · settles to your wallet</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* No extra safe-area padding here — CasinoGameplayFrame's content-box
          already reserves env(safe-area-inset-bottom) once, at the outer
          level (see that file), so this footer isn't crowded by a home
          indicator without double-padding the bottom. */}
      <div className="shrink-0 border-t border-white/5 bg-zinc-900 p-4">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <GameControls game={game} busy={busy}
            cap={cap} setCap={setCap}
            face={face} setFace={setFace}
            rouletteNums={rouletteNums} setRouletteNums={setRouletteNums}
            balls={balls} setBalls={setBalls} />

          <div className="flex items-end gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">Bet amount (ETH)</span>
              <div className="flex items-center rounded-lg border border-white/5 bg-zinc-950 px-3">
                <input type="number" value={betEth} min={0} step={0.00001} disabled={busy}
                  onFocus={(e) => e.target.select()} onChange={(e) => setBetEth(Math.max(0, +e.target.value))}
                  className="w-full bg-transparent py-2.5 px-1 font-mono tabular-nums text-white outline-none" />
                <button onClick={() => setBetEth((b) => +(b / 2).toFixed(6))} disabled={busy} className="px-2 text-xs text-zinc-400 hover:text-white">½</button>
                <button onClick={() => setBetEth((b) => +(b * 2).toFixed(6))} disabled={busy} className="px-2 text-xs text-zinc-400 hover:text-white">2×</button>
              </div>
            </label>
            <button onClick={play_} disabled={insufficient || busy || !ready} data-test-id="betswirl-play"
              className="h-[44px] rounded-lg bg-[var(--casino-primary)] px-8 font-bold text-white transition hover:bg-[var(--casino-primary-hover)] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500">
              {busy ? "…" : insufficient ? "Low balance" : "Bet"}
            </button>
          </div>
          <p className="text-center text-[11px] text-zinc-500">Each bet is an on-chain transaction (gas + Chainlink VRF fee).</p>
        </div>
      </div>
    </div>
  );
}

function GameControls({ game, busy, cap, setCap, face, setFace, rouletteNums, setRouletteNums, balls, setBalls }) {
  if (game.control === "dice") {
    return (
      <label className="block">
        <span className="mb-1 flex justify-between text-[11px] uppercase tracking-wide text-zinc-500"><span>Win chance</span><span className="text-zinc-300">{cap}%</span></span>
        <input type="range" min={2} max={95} value={cap} onChange={(e) => setCap(+e.target.value)} disabled={busy} className="w-full accent-[var(--casino-primary)]" />
      </label>
    );
  }
  if (game.control === "coin") {
    return (
      <div className="flex gap-2">
        {["HEADS", "TAILS"].map((f) => (
          <button key={f} onClick={() => setFace(f)} disabled={busy}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${face === f ? "bg-[var(--casino-primary)] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{f}</button>
        ))}
      </div>
    );
  }
  if (game.control === "roulette") {
    const toggle = (n) => setRouletteNums((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : [...cur, n]));
    return (
      <div>
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">Pick numbers ({rouletteNums.length})</span>
        <div className="grid max-h-28 grid-cols-10 gap-1 overflow-y-auto">
          {ROULETTE_NUMBERS.map((n) => (
            <button key={n} onClick={() => toggle(n)} disabled={busy}
              className={`rounded py-1 text-xs font-medium ${rouletteNums.includes(n) ? "bg-[var(--casino-primary)] text-white" : "bg-zinc-800 text-zinc-300"}`}>{n}</button>
          ))}
        </div>
      </div>
    );
  }
  if (game.control === "keno") {
    const toggle = (n) => setBalls((cur) => (cur.includes(n) ? cur.filter((x) => x !== n) : cur.length < 4 ? [...cur, n] : cur));
    return (
      <div>
        <span className="mb-1 block text-[11px] uppercase tracking-wide text-zinc-500">Pick up to 4 balls ({balls.length})</span>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button key={n} onClick={() => toggle(n)} disabled={busy}
              className={`rounded py-1 text-xs font-medium ${balls.includes(n) ? "bg-[var(--casino-primary)] text-white" : "bg-zinc-800 text-zinc-300"}`}>{n}</button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
