import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, ExternalLink, RefreshCw, Blocks, AlertTriangle, Gamepad2 } from "lucide-react";
import { useWallet } from "@/web3/useWallet";
import { polygonAmoy } from "@shared/chains";
import { PROFILE_VARIANT } from "@/lib/profileState";
import {
  normalizeChainHistoryRound, mergeCasinoRounds, resolveRoundStatusConfig, formatEthAmount, ROUND_STATUS,
} from "@/lib/casinoRounds";
import { CasinoRoundReceipt } from "./CasinoRoundReceipt";
import { track } from "@/lib/telemetry";

const SPORTS = { name: "Polygon Amoy", explorer: polygonAmoy.blockExplorers.default.url, dot: "#8247e5", unit: "USDT" };

const fmtTime = (ms) => (ms ? new Date(ms).toLocaleString() : "");

// On-chain "My Bets". Casino (this file's own rebuilt tab — see CASINO
// ACTIVITY task) reads real BetSwirl Roll events via /api/casino-history,
// merged with any just-happened in-tab result/pending round (see
// lib/casinoRounds.js — one shared model, not a second store). Sports (the
// untouched BetChain rendering below) keeps its own existing receipt model
// per that task's explicit "do not redesign Sports' receipt model."
export function BetHistoryDialog({
  open, onClose, casinoPendingRounds = [], casinoLiveResults = [], onPlayAgain, onViewGameInfo, profileVariant, onLogin, onCloseAutoFocus,
}) {
  const { address, isConnected } = useWallet();
  const [casinoBets, setCasinoBets] = useState([]);
  const [sports, setSports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRoundId, setSelectedRoundId] = useState(null);

  const load = useCallback(async () => {
    if (!isConnected || !address) return;
    setLoading(true);
    setLoadError(false);
    try {
      const [c, s] = await Promise.all([
        fetch(`/api/casino-history?address=${address}`).then((r) => { if (!r.ok) throw new Error("bad status"); return r.json(); }),
        fetch(`/api/history?address=${address}`).then((r) => r.json()).catch(() => ({ bets: [] })),
      ]);
      setCasinoBets(c.bets ?? []);
      setSports(s.bets ?? []);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (open) { load(); track("casino_activity_viewed", {}); }
  }, [open, load]);

  const rounds = useMemo(
    () => mergeCasinoRounds({
      chainHistory: casinoBets.map(normalizeChainHistoryRound),
      liveResults: casinoLiveResults,
      pending: casinoPendingRounds,
    }),
    [casinoBets, casinoLiveResults, casinoPendingRounds]
  );

  const filteredRounds = useMemo(() => {
    if (statusFilter === "all") return rounds;
    if (statusFilter === "pending") return rounds.filter((r) => r.status === ROUND_STATUS.PENDING);
    return rounds.filter((r) => r.status === ROUND_STATUS.WON || r.status === ROUND_STATUS.LOST);
  }, [rounds, statusFilter]);

  const selectedRound = selectedRoundId ? rounds.find((r) => r.id === selectedRoundId) ?? null : null;

  const selectFilter = (next) => {
    setStatusFilter(next);
    track("casino_activity_filtered", { filter: next });
  };

  const openReceipt = (round) => {
    setSelectedRoundId(round.id);
    track("casino_round_receipt_opened", { roundId: round.id, gameId: round.gameId, status: round.status, source: "activity-list" });
  };
  const closeReceipt = () => {
    if (selectedRound) track("casino_round_receipt_closed", { roundId: selectedRound.id });
    setSelectedRoundId(null);
  };

  const authGate = profileVariant === PROFILE_VARIANT.LOGGED_OUT ? "logged-out"
    : profileVariant === PROFILE_VARIANT.SESSION_EXPIRED ? "session-expired"
    : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2"><Blocks className="size-4" /> My Bets</DialogTitle>
            <button onClick={load} disabled={loading} aria-label="Refresh" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-50">
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <DialogDescription>Read live from chain for {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "your wallet"} — nothing is stored by us.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="casino">
          <TabsList className="w-full">
            <TabsTrigger value="casino" className="flex-1">Casino ({rounds.length})</TabsTrigger>
            <TabsTrigger value="sports" className="flex-1">Sports ({sports.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="casino" className="mt-3">
            {authGate ? (
              <AuthGateEmpty kind={authGate} onLogin={onLogin} />
            ) : (
              <>
                <div className="mb-2 flex gap-1.5" role="group" aria-label="Filter Casino bets">
                  {[["all", "All"], ["pending", "Pending"], ["settled", "Won/Lost"]].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => selectFilter(id)}
                      aria-pressed={statusFilter === id}
                      data-test-id={`casino-activity-filter-${id}`}
                      // Active filter chip is neutral, not arena-tinted —
                      // same "retire the maroon active state" rule already
                      // applied to Casino's category chips.
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${statusFilter === id ? "border-[var(--border)] bg-[var(--secondary)] text-[var(--foreground)]" : "border-white/10 text-zinc-400 hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="max-h-[52vh] space-y-2 overflow-y-auto" data-test-id="casino-activity-list">
                  {loadError ? (
                    <ListError onRetry={load} onBrowseGames={onClose} />
                  ) : loading && rounds.length === 0 ? (
                    <ListSkeleton />
                  ) : filteredRounds.length === 0 ? (
                    <CasinoEmpty onBrowseGames={onClose} filtered={statusFilter !== "all"} />
                  ) : (
                    filteredRounds.map((round) => <CasinoRoundRow key={round.id} round={round} onSelect={() => openReceipt(round)} />)
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="sports" className="mt-3 max-h-[58vh] overflow-y-auto">
            <BetChain loading={loading} bets={sports} chain={SPORTS}
              empty="No on-chain sports bets for this wallet yet."
              render={(b) => ({
                title: `Bet #${b.betId}`,
                sub: `odds ${Number(b.odds).toFixed(2)}${b.result ? ` · ${b.result}` : ""}`,
                stake: `${trim(b.stake)} USDT`,
                win: b.status === "Won" || b.result === "Won",
                result: b.status ?? "—",
                tx: b.txHash, block: b.blockNumber, at: b.placedAt,
              })} />
          </TabsContent>
        </Tabs>
      </DialogContent>

      <CasinoRoundReceipt
        round={selectedRound}
        open={!!selectedRoundId}
        notFound={Boolean(selectedRoundId) && !selectedRound}
        onClose={closeReceipt}
        onPlayAgain={selectedRound ? () => { track("casino_round_play_again_selected", { roundId: selectedRound.id, gameId: selectedRound.gameId }); closeReceipt(); onClose(); onPlayAgain?.(selectedRound.gameId); } : undefined}
        onViewGameInfo={selectedRound?.gameId ? () => { track("casino_round_game_info_selected", { roundId: selectedRound.id, gameId: selectedRound.gameId }); onViewGameInfo?.(selectedRound.gameId); } : undefined}
      />
    </Dialog>
  );
}

function CasinoRoundRow({ round, onSelect }) {
  const config = resolveRoundStatusConfig(round.status);
  const isPending = round.status === ROUND_STATUS.PENDING;
  const isWin = round.status === ROUND_STATUS.WON;
  return (
    <button
      type="button"
      onClick={onSelect}
      data-test-id={`casino-activity-row-${round.id}`}
      className="flex w-full items-start justify-between gap-3 rounded-lg border bg-card p-2.5 text-left hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${isPending ? "text-zinc-400" : isWin ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {isPending && <Loader2 className="size-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
            {config.label}
          </span>
          <span className="truncate text-[11px] text-muted-foreground">{fmtTime(round.startedAt)}</span>
        </div>
        <div className="truncate text-sm font-medium">{round.gameName}</div>
        {round.resultSummary && !isPending && <div className="truncate text-xs text-muted-foreground">{round.resultSummary}</div>}
      </div>
      <div className="shrink-0 text-right">
        <div className="font-mono text-sm tabular-nums">{formatEthAmount(round.stake)} {round.currency}</div>
        {isPending ? (
          <div className="text-[11px] text-muted-foreground">Waiting for result</div>
        ) : round.profitLoss !== null && round.profitLoss !== undefined ? (
          <div className={`font-mono text-[11px] font-medium ${round.profitLoss > 0 ? "text-[var(--success)]" : round.profitLoss < 0 ? "text-[var(--danger)]" : "text-muted-foreground"}`}>
            {round.profitLoss > 0 ? "+" : ""}{formatEthAmount(round.profitLoss)}
          </div>
        ) : null}
      </div>
    </button>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-lg border bg-card motion-reduce:animate-none" />
      ))}
    </div>
  );
}

function ListError({ onRetry, onBrowseGames }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center" data-test-id="casino-activity-error">
      <AlertTriangle className="size-6 text-amber-400" aria-hidden="true" />
      <p className="text-sm font-semibold">Unable to load your bets</p>
      <p className="text-xs text-muted-foreground">Try again in a moment.</p>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onRetry} className="rounded-lg bg-[var(--global-cta)] px-3 py-1.5 text-xs font-bold text-white">Try again</button>
        <button type="button" onClick={onBrowseGames} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-zinc-300">Browse games</button>
      </div>
    </div>
  );
}

function CasinoEmpty({ onBrowseGames, filtered }) {
  if (filtered) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">No bets match this filter.</div>;
  }
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center" data-test-id="casino-activity-empty">
      <Gamepad2 className="size-6 text-zinc-500" aria-hidden="true" />
      <p className="text-sm font-semibold">No Casino bets yet</p>
      <p className="text-xs text-muted-foreground">Your completed and pending game rounds will appear here.</p>
      <button type="button" onClick={onBrowseGames} className="mt-1 rounded-lg bg-[var(--global-cta)] px-3 py-1.5 text-xs font-bold text-white">Browse games</button>
    </div>
  );
}

function AuthGateEmpty({ kind, onLogin }) {
  const title = kind === "session-expired" ? "Session expired" : "Sign in to view your bets";
  const actionLabel = kind === "session-expired" ? "Sign in again" : "Sign in";
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-8 text-center" data-test-id={`casino-activity-${kind}`}>
      <p className="text-sm font-semibold">{title}</p>
      <button type="button" onClick={onLogin} className="mt-1 rounded-lg bg-[var(--global-cta)] px-3 py-1.5 text-xs font-bold text-white">{actionLabel}</button>
    </div>
  );
}

// Renders SPORTS bets as a vertical chain of linked blocks — unchanged from
// before this task (see CASINO-ONLY ACTIVITY SCOPE: "do not redesign
// [Sports'] receipt models").
function BetChain({ loading, bets, chain, render, empty }) {
  if (loading && bets.length === 0) {
    return <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Reading chain…</div>;
  }
  if (bets.length === 0) {
    return <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">{empty}</div>;
  }
  return (
    <div className="relative space-y-2 pl-6">
      <div className="absolute bottom-3 left-[9px] top-3 w-px bg-border" aria-hidden />
      {bets.map((raw, i) => {
        const b = render(raw);
        return (
          <div key={b.tx ?? i} className="relative">
            <span className="absolute -left-[1.35rem] top-4 size-3 rounded-full ring-4 ring-background" style={{ background: chain.dot }} aria-hidden />
            <div className="rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{b.title}</div>
                  {b.sub && <div className="truncate text-xs text-muted-foreground">{b.sub}</div>}
                </div>
                <div className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${b.win ? "bg-[var(--success-bg,rgba(73,184,137,0.16))] text-[var(--success)]" : "bg-secondary text-muted-foreground"}`}>
                  {b.result}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block size-1.5 rounded-full" style={{ background: chain.dot }} /> {chain.name}
                </span>
                <span className="font-mono">stake {b.stake}</span>
                {b.block ? <span className="font-mono">block #{b.block}</span> : null}
                {b.at ? <span>{fmtTime(b.at)}</span> : null}
                {b.tx && (
                  <a href={`${chain.explorer}/tx/${b.tx}`} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[var(--global-cta)] hover:underline">
                    <ExternalLink className="size-3" /> {b.tx.slice(0, 8)}…{b.tx.slice(-4)}
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Trim a decimal string to at most 6 significant fractional places, no trailing zeros.
function trim(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n.toFixed(6).replace(/\.?0+$/, "");
}
