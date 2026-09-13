import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, CheckCircle, Clock, ExternalLink, HelpCircle, RotateCcw, Slash, X } from "lucide-react";
import { resolveRoundStatusConfig, formatEthAmount, ROUND_STATUS } from "@/lib/casinoRounds";
import { resolveFairnessSummary, FAIRNESS_TYPE } from "@/lib/casinoGameDetails";
import { CASINO_EXPLORER } from "@shared/chains";
import { track } from "@/lib/telemetry";

const STATUS_ICON = { clock: Clock, check: Check, x: X, "check-circle": CheckCircle, "rotate-ccw": RotateCcw, slash: Slash, "alert-triangle": AlertTriangle, "help-circle": HelpCircle };
const TONE_CLASS = { success: "text-[var(--success)]", danger: "text-[var(--danger)]", neutral: "text-zinc-300" };

// One shared round-receipt surface — desktop and mobile share this exact
// component (right-side drawer vs. full-height sheet via responsive
// classes only), matching GameInfoPanel.jsx's established pattern rather
// than defining the content twice (see RECEIPT PRESENTATION: "do not create
// separate receipt definitions for desktop and mobile").
export function CasinoRoundReceipt({ round, open, notFound, onClose, onPlayAgain, onViewGameInfo }) {
  const panelRef = useRef(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (open) panelRef.current?.focus();
    setCopied(false);
    setShowAdvanced(false);
  }, [open, round?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const statusConfig = round ? resolveRoundStatusConfig(round.status) : null;
  const StatusIcon = statusConfig ? STATUS_ICON[statusConfig.icon] ?? HelpCircle : null;
  const isPending = round?.status === ROUND_STATUS.PENDING;
  // Every playable BetSwirl game uses real Chainlink VRF (see
  // useBetSwirl.js) — the same honest on-chain-vrf fairness copy the Game
  // info panel already uses for these games, reused here rather than a
  // second fairness implementation (see VIEW GAME INFO: "do not create a
  // second rules/fairness implementation").
  const fairness = round ? resolveFairnessSummary({ type: FAIRNESS_TYPE.PROVABLY_FAIR, mechanism: "on-chain-vrf" }) : null;

  const copyRoundId = async () => {
    if (!round) return;
    try {
      await navigator.clipboard.writeText(round.id);
      setCopied(true);
      track("casino_round_id_copied", { roundId: round.id, gameId: round.gameId });
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — no-op, nothing else to fall back to safely */ }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={round ? `${round.gameName} round receipt` : "Round details"} data-test-id="round-receipt" className="fixed inset-0 z-[var(--z-game-info)] flex justify-end bg-black/40">
      <button type="button" aria-label="Close receipt" onClick={onClose} className="absolute inset-0 h-full w-full cursor-default" tabIndex={-1} />
      <div
        ref={panelRef}
        tabIndex={-1}
        data-test-id="round-receipt-content"
        className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 outline-none md:w-[420px] md:border-l md:border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-4" style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}>
          <h1 className="min-w-0 truncate text-sm font-bold text-white">{round ? `${round.gameName} round` : "Round details"}</h1>
          <button type="button" onClick={onClose} aria-label="Close" data-test-id="round-receipt-close" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">✕</button>
        </header>

        <div className="tribet-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {notFound || !round ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-white" data-test-id="round-receipt-unavailable">
              <AlertTriangle className="size-8 text-amber-400" aria-hidden="true" />
              <h2 className="text-base font-semibold">Round details unavailable</h2>
              <p className="text-sm text-zinc-400">We couldn't load the details for this round.</p>
              <button type="button" onClick={onClose} className="mt-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Close</button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 1. Status */}
              <div className={`flex items-center gap-2 text-sm font-semibold ${TONE_CLASS[statusConfig.tone]}`} data-test-id="round-receipt-status">
                <StatusIcon className="size-4" aria-hidden="true" />
                {statusConfig.label}
              </div>

              {/* 2. Game identity */}
              <h2 className="text-lg font-bold text-white">{round.gameName}</h2>

              {/* 3. Result summary — only when real */}
              {round.resultSummary && <p className="text-sm text-zinc-300">{round.resultSummary}</p>}
              {isPending && <p className="text-sm text-zinc-400">Waiting for the result</p>}

              {/* 4-6. Stake / Payout / P&L */}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-zinc-500">Stake</dt>
                  <dd className="mt-0.5 font-mono tabular-nums text-white">{formatEthAmount(round.stake)} {round.currency}</dd>
                </div>
                {round.payout !== undefined && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">Payout</dt>
                    <dd className="mt-0.5 font-mono tabular-nums text-white">{formatEthAmount(round.payout)} {round.currency}</dd>
                  </div>
                )}
                {round.profitLoss !== undefined && round.profitLoss !== null && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-zinc-500">Profit/Loss</dt>
                    <dd className={`mt-0.5 font-mono tabular-nums ${round.profitLoss > 0 ? "text-[var(--success)]" : round.profitLoss < 0 ? "text-[var(--danger)]" : "text-white"}`}>
                      {round.profitLoss > 0 ? "+" : ""}{formatEthAmount(round.profitLoss)} {round.currency}
                    </dd>
                  </div>
                )}
              </dl>

              {/* 8. Started time */}
              {round.startedAt && (
                <p className="text-xs text-zinc-500">{new Date(round.startedAt).toLocaleString()}</p>
              )}

              {/* 10. Round ID */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Round ID</h3>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-300" data-test-id="round-receipt-id">{round.id}</code>
                  <button type="button" onClick={copyRoundId} data-test-id="round-receipt-copy-id" className="shrink-0 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="sr-only" role="status" aria-live="polite">{copied ? "Round ID copied" : ""}</p>
              </section>

              {/* 11. Fairness */}
              {!isPending && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{fairness.heading}</h3>
                  <p className="mt-2 text-sm text-zinc-300">{fairness.summary}</p>
                </section>
              )}

              {/* 12. Technical references — behind advanced disclosure */}
              {round.txHash && (
                <section>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((v) => !v)}
                    aria-expanded={showAdvanced}
                    data-test-id="round-receipt-advanced-toggle"
                    className="text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
                  >
                    Verification details {showAdvanced ? "▲" : "▼"}
                  </button>
                  {showAdvanced && (
                    <div className="mt-2 space-y-2 rounded-lg border border-white/10 bg-zinc-900 p-3 text-xs text-zinc-400">
                      <p>Base Sepolia testnet — prototype, not real funds.</p>
                      <div className="flex items-center gap-2">
                        <span className="shrink-0">Transaction</span>
                        <code className="min-w-0 flex-1 truncate">{round.txHash.slice(0, 10)}…{round.txHash.slice(-6)}</code>
                      </div>
                      <a
                        href={`${CASINO_EXPLORER}/tx/${round.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        data-test-id="round-receipt-explorer-link"
                        className="inline-flex items-center gap-1 text-[var(--foreground)] hover:underline"
                      >
                        <ExternalLink className="size-3" aria-hidden="true" /> View on block explorer
                      </a>
                    </div>
                  )}
                </section>
              )}

              {/* 13. Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                {onPlayAgain && (
                  <button type="button" onClick={onPlayAgain} data-test-id="round-receipt-play-again" className="rounded-lg [background-image:var(--global-cta-gradient)] px-4 py-2 text-sm font-bold text-white hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Play again
                  </button>
                )}
                {onViewGameInfo && (
                  <button type="button" onClick={onViewGameInfo} data-test-id="round-receipt-game-info" className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    View game info
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
