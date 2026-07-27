import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { useBetSwirl } from "@/web3/useBetSwirl";
import { useCasinoBalance, BALANCE_STATUS } from "@/lib/casinoBalance";
import { baseSepolia } from "@shared/chains";
import { toast } from "@/lib/toast";
import { track } from "@/lib/telemetry";
import { CATEGORY_LABEL } from "@/lib/casinoCategories";
import { MicroLabel } from "@/components/ui/micro-label";

const txUrl = (hash) => `${baseSepolia.blockExplorers.default.url}/tx/${hash}`;
const ROULETTE_NUMBERS = Array.from({ length: 37 }, (_, i) => i); // 0..36

// A real, on-chain BetSwirl game. Every play is a wallet transaction settled by
// Chainlink VRF; winnings pay straight to the player. Renders only its own
// inner content (visual + controls) — the outer page chrome (header, title,
// back control) lives in GameHeader.jsx, and the box/sizing/status overlay
// live in GameStage.jsx (see GAME CONTAINER task: "outer frame ownership
// should be shared" / "do not show multiple competing close buttons").
export function BetSwirlGame({ game, onRound, onRoundPending, onBusyChange }) {
  // One shared balance source (see lib/casinoBalance.js) — replaces the
  // previous direct useWallet() read, which bypassed useDevAwareWallet()
  // entirely: Developer Panel balance presets (Loading/Error/etc) had no
  // effect in-game before this, only in the top HUD (a real, now-fixed
  // inconsistency — see BALANCE MODEL task's audit).
  const { available: casinoBalance, status: balanceStatus, refreshBalance } = useCasinoBalance();
  const { ready, play } = useBetSwirl();

  const [betEth, setBetEth] = useState(0.00001);
  const [cap, setCap] = useState(50); // dice win chance
  const [face, setFace] = useState("HEADS"); // coin
  const [rouletteNums, setRouletteNums] = useState([17]); // roulette
  const [balls, setBalls] = useState([1, 2, 3]); // keno
  // idle | confirming | rolling | done | uncertain — "uncertain" is a real,
  // distinct state (not a guess): it only fires when the bet transaction had
  // ALREADY confirmed (past onBetPlaced) before something went wrong waiting
  // for the VRF roll, so the stake genuinely may have been spent even though
  // the outcome never arrived (see UNCERTAIN SETTLEMENT). A rejection/error
  // BEFORE that point is real, verified "not charged" — never blurred
  // together with this state.
  const [phase, setPhase] = useState("idle");
  const [result, setResult] = useState(null);
  const [betTx, setBetTx] = useState(null);
  const stakeInputRef = useRef(null);

  const busy = phase === "confirming" || phase === "rolling";
  const balanceUnknown = balanceStatus === BALANCE_STATUS.LOADING || balanceStatus === BALANCE_STATUS.ERROR || balanceStatus === BALANCE_STATUS.IDLE;
  const insufficient = !balanceUnknown && betEth > casinoBalance;

  // Reports busy state up to GameStage.jsx, which forwards it to
  // CasinoGamePage — that disables the header's "Back to Casino" control
  // while a bet is mid-confirmation — abandoning that has a real
  // consequence (a pending wallet tx / VRF roll), unlike the previous
  // phases.
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);

  // Block-disabled (not eslint-disable-next-line) — oxlint anchors this
  // rule's diagnostic at the `track(...)` line itself, not the dependency
  // array below (same fix as useCasinoGameLaunch.js's identical case).
  // Deliberately keyed only on [insufficient]: firing on every betEth
  // keystroke would spam this analytics event while the player is still
  // typing, not just when they actually land on an unaffordable stake.
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    if (insufficient) track("casino_insufficient_balance_shown", { gameId: game.favId, stake: betEth });
  }, [insufficient]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const selectionFor = () => {
    if (game.control === "dice") return { cap };
    if (game.control === "coin") return { face };
    if (game.control === "roulette") return { numbers: rouletteNums };
    if (game.control === "keno") return { balls };
    return {};
  };

  // REDUCE BET ACTION: this app has no reliable way to compute "largest
  // valid stake" (gas cost isn't known ahead of the wallet's own estimate,
  // and casinoBalance is the whole wallet balance, not a spendable-after-gas
  // figure) — auto-filling the full balance could produce a stake the
  // wallet then can't actually afford to submit. Per REDUCE BET ACTION's own
  // instruction ("if the maximum valid amount cannot be calculated safely,
  // do not provide an automatic amount — focus the input instead"), this
  // only focuses/selects the input for manual editing.
  const reduceBet = () => {
    stakeInputRef.current?.focus();
    stakeInputRef.current?.select();
  };

  const play_ = async () => {
    if (!ready) { toast.error("Connect your wallet first"); return; }
    if (balanceUnknown) { toast.error("Balance still loading", { message: "Wait a moment and try again." }); return; }
    if (insufficient || betEth <= 0 || busy) return;
    setResult(null); setBetTx(null); setPhase("confirming");
    track("casino_bet_submission_started", { gameId: game.favId, stake: betEth });
    let placedThisAttempt = false;
    try {
      const { rolledBet } = await play({
        gameKey: game.key,
        betEth,
        selection: selectionFor(),
        onBetPlaced: ({ betTxnHash }) => {
          placedThisAttempt = true;
          setBetTx(betTxnHash);
          setPhase("rolling");
          track("casino_bet_accepted", { gameId: game.favId, stake: betEth });
          // Real signal, not a fabricated one: the bet transaction is
          // confirmed on-chain and the stake is genuinely locked in — only
          // the win/loss outcome is still unknown, which is exactly what
          // "pending" means (see CASINO ACTIVITY task's PENDING ROUND
          // BEHAVIOR / mergeCasinoRounds in lib/casinoRounds.js, which drops
          // this the instant the same txHash resolves below).
          onRoundPending?.({ gameKey: game.key, favId: game.favId, stake: betEth, txHash: betTxnHash, at: Date.now() });
          // The stake already left the wallet as part of this real on-chain
          // transaction — refresh from the authoritative source now rather
          // than waiting for the next 15s poll (see BALANCE REFRESH: this
          // never does the arithmetic itself, only asks the real source to
          // catch up sooner).
          refreshBalance({ reason: "bet-accepted" });
        },
      });
      setResult(rolledBet);
      setPhase("done");
      track("casino_round_settled", { gameId: game.favId, status: rolledBet.isWin ? "won" : "lost" });
      onRound?.({
        product: "casino", title: game.title, stake: betEth,
        potential: rolledBet.isWin ? Number(rolledBet.formattedPayout) : 0,
        status: rolledBet.isWin ? "won" : "lost", txnHash: rolledBet.rollTxnHash,
        // Additive fields only — existing `logRound` consumers just spread
        // `...e` into their own entries, so this doesn't change anything for
        // them (see App.jsx's logRound). Lets casinoRounds.js's
        // normalizeLiveResultRound resolve the real game identity without
        // re-deriving it from `title` (a display string, not a stable key).
        gameKey: game.key, favId: game.favId,
      });
      refreshBalance({ reason: "round-settled" });
      if (rolledBet.isWin) {
        // Profit, not payout — the two are never the same number here (see
        // WIN SETTLEMENT: "distinguish payout from profit"). Payout stays
        // visible in the result panel itself, right below this toast.
        const profit = Number(rolledBet.formattedPayout) - betEth;
        toast.success(`You won ${profit.toFixed(6)} ETH`, { message: `Payout ${rolledBet.formattedPayout} ETH` });
      } else {
        toast.info("Round lost", { message: `Loss ${betEth} ETH` });
      }
    } catch (e) {
      // Raw error logged only for diagnostics, never surfaced as customer
      // copy (see FAILED SUBMISSION: "do not show raw contract rejection").
      if (import.meta.env.DEV) console.error("BetSwirl play() failed:", e);
      if (placedThisAttempt) {
        // The bet was genuinely already accepted on-chain — this is not a
        // "not charged" failure, and retrying now risks a real duplicate
        // wager (see UNCERTAIN SETTLEMENT). Never auto-retried.
        setPhase("uncertain");
        track("casino_bet_status_uncertain", { gameId: game.favId });
      } else {
        setPhase("idle");
        track("casino_bet_submission_failed", { gameId: game.favId, failureCategory: "not-accepted" });
        toast.error("Bet not placed", { message: "We couldn't place your bet. Your balance was not charged." });
      }
    }
  };

  // FINAL QA fix: no longer names the internal RNG/oracle vendor
  // ("Chainlink VRF") in ordinary gameplay status text — real fairness/
  // verification detail belongs in Game Info's advanced section (see
  // CasinoRoundReceipt.jsx's own "Verification details" disclosure for the
  // same pattern), not a routine pending-status label.
  const statusText = phase === "confirming" ? "Confirm in your wallet…"
    : phase === "rolling" ? "Round pending…" : null;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 py-2">
        <MicroLabel>On-chain · {CATEGORY_LABEL.Originals}</MicroLabel>
        <div className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 font-mono text-sm tabular-nums text-white" data-test-id="betswirl-balance" data-balance-status={balanceStatus}>
          {balanceStatus === BALANCE_STATUS.LOADING ? (
            <span className="text-zinc-400">Loading…</span>
          ) : balanceStatus === BALANCE_STATUS.ERROR ? (
            <span className="flex items-center gap-1 text-zinc-400"><AlertTriangle className="size-3.5" aria-hidden="true" /> Unavailable</span>
          ) : (
            <>
              <span>{casinoBalance.toFixed(5)} ETH</span>
              {balanceStatus === BALANCE_STATUS.SYNCING && <RefreshCw className="size-3 animate-spin text-zinc-400 motion-reduce:animate-none" aria-hidden="true" />}
              {balanceStatus === BALANCE_STATUS.STALE && <AlertTriangle className="size-3 text-[var(--warning)]" aria-hidden="true" />}
            </>
          )}
        </div>
      </div>
      {balanceStatus === BALANCE_STATUS.STALE && (
        <div role="status" className="flex shrink-0 items-center justify-between gap-2 bg-[var(--warning)]/10 px-4 py-1.5 text-xs text-[var(--warning)]">
          <span>Balance may be out of date</span>
          <button type="button" onClick={() => refreshBalance({ reason: "manual-retry" })} className="font-semibold underline-offset-2 hover:underline">Refresh</button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 items-center justify-center p-4">
        {/* Fills whatever the shared GameStage content-box already allotted
            (viewport-aware, see that file) rather than a second,
            independent fixed cap on top of it — see DESKTOP SIZING RULES:
            "do not hardcode one fixed width and height for all displays." */}
        <div
          className="relative grid h-full w-full place-items-center overflow-hidden rounded-2xl bg-cover bg-center"
          style={{ backgroundImage: `url(${game.image})` }}
        >
          <div className="absolute inset-0 bg-black/45" />
          <div className={`relative ${busy ? "animate-pulse motion-reduce:animate-none" : ""}`}>
            {phase === "uncertain" ? (
              <div className="flex flex-col items-center gap-3 text-center text-white" role="alert">
                <AlertTriangle className="size-8 text-amber-400" aria-hidden="true" />
                <div className="text-lg font-semibold">Checking bet status</div>
                <p className="max-w-xs text-sm text-white/80">Do not place the bet again until we confirm the result.</p>
                {betTx && <a href={txUrl(betTx)} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-white/80 hover:underline"><ExternalLink className="size-3.5" /> bet tx</a>}
                <button
                  type="button"
                  onClick={() => setPhase("idle")}
                  data-test-id="betswirl-dismiss-uncertain"
                  className="mt-1 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
                >
                  Dismiss
                </button>
              </div>
            ) : statusText ? (
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="size-8 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <div className="text-lg font-semibold" role="status" aria-live="polite">{statusText}</div>
                <div className="text-sm text-white/70">Stake {betEth} ETH</div>
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

      {/* No extra safe-area padding here — GameStage.jsx already reserves
          every env(safe-area-inset-*) once, at the outer level, but only
          while actually fullscreen (the one time this box is genuinely
          edge-to-edge — see that file), so this footer isn't crowded by a
          home indicator without double-padding the bottom. */}
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
              <div className={`flex items-center rounded-lg border px-3 ${insufficient ? "border-[var(--danger)]/60 bg-[var(--danger)]/5" : "border-white/5 bg-zinc-950"}`}>
                <input
                  ref={stakeInputRef}
                  type="number" value={betEth} min={0} step={0.00001} disabled={busy}
                  aria-invalid={insufficient || undefined}
                  aria-describedby={insufficient ? "betswirl-insufficient" : undefined}
                  onFocus={(e) => e.target.select()} onChange={(e) => setBetEth(Math.max(0, +e.target.value))}
                  className="w-full bg-transparent py-2.5 px-1 font-mono tabular-nums text-white outline-none" />
                <button onClick={() => setBetEth((b) => +(b / 2).toFixed(6))} disabled={busy} className="px-2 text-xs text-zinc-400 hover:text-white">½</button>
                <button onClick={() => setBetEth((b) => +(b * 2).toFixed(6))} disabled={busy} className="px-2 text-xs text-zinc-400 hover:text-white">2×</button>
              </div>
            </label>
            {/* CTA OWNERSHIP SYSTEM: placing a bet is an ARENA action (it
                belongs to the Casino game experience, not the platform),
                so this is Casino Action Purple, not Mint — reverses an
                earlier pass's call before this system existed. */}
            <button onClick={play_} disabled={insufficient || busy || !ready || balanceUnknown || phase === "uncertain"} data-test-id="betswirl-play"
              className="h-[44px] rounded-lg bg-[var(--global-cta)] px-8 font-bold text-[var(--global-cta-text)] transition-colors hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)] disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-500">
              {busy ? "…" : insufficient ? "Low balance" : "Bet"}
            </button>
          </div>
          {insufficient && (
            <div id="betswirl-insufficient" role="alert" className="flex items-center justify-between gap-2 rounded-lg bg-[var(--danger)]/10 px-3 py-2 text-xs text-[var(--danger)]">
              <span><strong className="font-semibold">Insufficient balance.</strong> Reduce your bet or add funds to continue.</span>
              <button type="button" onClick={reduceBet} data-test-id="betswirl-reduce-bet" className="shrink-0 font-semibold underline-offset-2 hover:underline">Reduce bet</button>
            </div>
          )}
          <p className="text-center text-[11px] text-zinc-500">Each bet is an on-chain transaction (gas + randomness fee).</p>
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
        <input type="range" min={2} max={95} value={cap} onChange={(e) => setCap(+e.target.value)} disabled={busy} className="w-full accent-[var(--global-cta)]" />
      </label>
    );
  }
  if (game.control === "coin") {
    return (
      <div className="flex gap-2">
        {["HEADS", "TAILS"].map((f) => (
          <button key={f} onClick={() => setFace(f)} disabled={busy}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${face === f ? "bg-[var(--global-cta)] text-white" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"}`}>{f}</button>
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
              className={`rounded py-1 text-xs font-medium ${rouletteNums.includes(n) ? "bg-[var(--global-cta)] text-white" : "bg-zinc-800 text-zinc-300"}`}>{n}</button>
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
              className={`rounded py-1 text-xs font-medium ${balls.includes(n) ? "bg-[var(--global-cta)] text-white" : "bg-zinc-800 text-zinc-300"}`}>{n}</button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
