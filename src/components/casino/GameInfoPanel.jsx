import { useEffect, useRef } from "react";
import { AlertTriangle, ExternalLink, ShieldCheck } from "lucide-react";
import { getGameDetails, resolveFairnessSummary, formatRtp, RTP_EXPLANATION } from "@/lib/casinoGameDetails";
import { gameProviderName } from "./CasinoCatalog";
import { CATEGORY_LABEL } from "@/lib/casinoCategories";
import { MicroLabel } from "@/components/ui/micro-label";

const STATUS_LABEL = { available: null, "coming-soon": "Coming soon", unavailable: "Unavailable" };

// One shared game-information surface — desktop and mobile share this exact
// component and section order (see INFORMATION ARCHITECTURE), not two
// separate content definitions. Desktop renders it as a right-side drawer;
// mobile as a full-height sheet — both via the same responsive classes on
// the same markup, rather than branching into two components.
//
// This is a plain sibling overlay, not part of the launch state machine —
// it never dispatches a launch action, so opening/closing it can't remount
// the game, reset a round, or touch Recently Played (see GAMEPLAY
// INTEGRATION: "opening Game info should not... interrupt the embedded
// client").
export function GameInfoPanel({ game, open, notFound, onClose, onResponsibleGaming }) {
  const panelRef = useRef(null);
  const details = getGameDetails(game);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  // FINAL QA fix: kept even though the CASINO GAME EXPERIENCE pass removed
  // the game surface's own global Escape-closes-the-game listener (the
  // game page is no longer a modal — see CasinoGamePage.jsx/GameStage.jsx
  // — so Escape no longer competes with it specifically). Other `window`-
  // level Escape listeners can still exist above this panel (e.g. the
  // Developer Panel's own), and Game Info can still open while a game is
  // playing underneath it, so stopImmediatePropagation() stays: it's what
  // guarantees Escape closes only the topmost surface, the same guarantee
  // every other stacked overlay in this app already gets. Regular
  // stopPropagation() would not help here — every such listener is bound
  // to the exact same target (`window`), so only
  // stopImmediatePropagation() stops a sibling listener at that same
  // target from also firing.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const statusLabel = details ? STATUS_LABEL[details.status] : null;
  const fairness = details ? resolveFairnessSummary(details.fairness) : null;
  // Attribution stays real and consistent with every other Casino surface
  // (see CasinoCatalog.jsx's gameProviderName — the same label already shown
  // on every game card/search result) rather than inventing a different
  // customer-facing name just for this panel — but it's deliberately the
  // LAST, least prominent thing here (see GAME IDENTITY / INFORMATION
  // ARCHITECTURE: "studio or technology attribution... only when
  // meaningful", item 12 of 12).
  const attribution = game ? gameProviderName(game) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={details ? `${details.name} info` : "Game information"}
      data-test-id="game-info-panel"
      className="fixed inset-0 z-[var(--z-game-info)] flex justify-end bg-black/40 panel-backdrop-fade-in motion-reduce:animate-none"
    >
      <button
        type="button"
        aria-label="Close game info"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
        tabIndex={-1}
      />
      {/* MOTION QUALITY PASS — entrance-only slide+fade from the panel's own
          right edge (this is a right-side drawer, matching its actual
          panel direction). Exit stays an instant unmount, deliberately not
          animated: this component's focus-restore/Escape-suppression logic
          (see App.jsx) is keyed directly to its mount
          state, and delaying that for a close animation risks reopening
          the exact class of focus race this app already had to fix once. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        data-test-id="game-info-content"
        className="relative flex h-full w-full flex-col overflow-hidden bg-zinc-950 outline-none panel-enter-right motion-reduce:animate-none md:w-[420px] md:border-l md:border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <header
          className="flex shrink-0 items-center justify-between gap-2 border-b border-white/5 px-4"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)", height: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
        >
          <h1 className="min-w-0 truncate text-sm font-bold text-white">
            {details ? `${details.name} info` : "Game information"}
          </h1>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            data-test-id="game-info-close"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            ✕
          </button>
        </header>

        <div className="tribet-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {notFound || !details ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center text-white" data-test-id="game-info-unavailable">
              <AlertTriangle className="size-8 text-amber-400" aria-hidden="true" />
              <h2 className="text-base font-semibold">Game information unavailable</h2>
              <p className="text-sm text-zinc-400">We couldn't load the details for this game.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* 1. Identity + 3. status */}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* ONE micro-label component for both badges — the on-chain
                      badge uses the brand colour explicitly, same as
                      everywhere else now (no per-arena tint to assume). Reads
                      from CATEGORY_LABEL rather than a literal so it can't
                      drift from the rail heading these games sit under. */}
                  {game.kind === "onchain" && (
                    <MicroLabel className="bg-[var(--global-cta-soft-bg)] text-[var(--global-cta-hover)]">{CATEGORY_LABEL.Originals}</MicroLabel>
                  )}
                  {statusLabel && <MicroLabel>{statusLabel}</MicroLabel>}
                </div>
                <h2 className="mt-1 text-lg font-bold text-white">{details.name}</h2>
              </div>

              {/* 2. Short description */}
              {details.description && (
                <p className="text-sm text-zinc-300" data-test-id="game-info-description">{details.description}</p>
              )}

              {details.status === "coming-soon" && (
                <p className="rounded-lg border border-white/10 bg-zinc-900 p-3 text-sm text-zinc-400">
                  This game isn't available to play yet.
                </p>
              )}

              {/* 4. How to play */}
              {details.rules?.length > 0 && (
                <section aria-labelledby="game-info-rules-heading">
                  <h3 id="game-info-rules-heading" className="text-xs font-semibold uppercase tracking-wide text-zinc-500">How to play</h3>
                  <div className="mt-2 space-y-3">
                    {details.rules.map((section) => (
                      <div key={section.id}>
                        <p className="text-sm font-semibold text-white">{section.title}</p>
                        {section.steps ? (
                          <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-zinc-300">
                            {section.steps.map((step, i) => <li key={i}>{step}</li>)}
                          </ol>
                        ) : (
                          <p className="mt-1 text-sm text-zinc-300">{section.body}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Payouts */}
              {details.payoutSummary && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Payouts</h3>
                  <p className="mt-2 text-sm text-zinc-300">{details.payoutSummary}</p>
                </section>
              )}

              {/* 6. RTP — only when a real value exists */}
              {details.rtp && (
                <section data-test-id="game-info-rtp">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">RTP</h3>
                  <p className="mt-2 text-2xl font-bold tabular-nums text-white">{formatRtp(details.rtp.value)}</p>
                  <p className="mt-1 text-xs text-zinc-500">{RTP_EXPLANATION}</p>
                  {details.rtp.note && <p className="mt-1 text-xs text-zinc-500">{details.rtp.note}</p>}
                </section>
              )}

              {/* 8. Bet limits — only when real */}
              {(details.minimumBet || details.maximumBet) && (
                <section>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Bet limits</h3>
                  <p className="mt-2 text-sm text-zinc-300">
                    {details.minimumBet ?? "—"} – {details.maximumBet ?? "—"}
                  </p>
                </section>
              )}

              {/* 9-10. Fairness + verification pointer */}
              {details.status === "available" && (
                <section data-test-id="game-info-fairness">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {fairness.heading ?? "Fairness"}
                  </h3>
                  <p className="mt-2 flex items-start gap-2 text-sm text-zinc-300">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-zinc-500" aria-hidden="true" />
                    <span>{fairness.summary}</span>
                  </p>
                  {fairness.note && <p className="mt-1 text-xs text-zinc-500">{fairness.note}</p>}
                  {/* No generic "Verify" action here — this app has no
                      outer-Tribet access to a specific round's real seed/tx
                      data at panel-open time (that lives inside each game's
                      own iframe, or is only available after a specific
                      on-chain bet resolves). Building one would mean either
                      faking a calculation or reaching across a boundary
                      that isn't wired — see VERIFICATION ACTION: "if a real
                      verifier does not exist yet... omit the Verify action."
                      Pointing at where the real one already lives is honest
                      and costs nothing extra. */}
                  {details.fairness?.mechanism === "client-commit-reveal" && (
                    <p className="mt-2 text-xs text-zinc-500">Open the in-game fairness panel during play to verify a specific round.</p>
                  )}
                  {details.fairness?.mechanism === "on-chain-vrf" && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-zinc-500">
                      <ExternalLink className="size-3" aria-hidden="true" />
                      Each settled bet links to its real on-chain transaction inside the game.
                    </p>
                  )}
                </section>
              )}

              {/* 11. Responsible play */}
              <section>
                <button
                  type="button"
                  onClick={onResponsibleGaming}
                  data-test-id="game-info-responsible-gaming"
                  // RESKIN: arena color as TEXT is explicitly banned by the
                  // guide's arena-color rules — was casino-text-accent.
                  className="text-sm font-semibold text-[var(--foreground)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Responsible gaming
                </button>
              </section>

              {/* 12. Attribution — last, least prominent */}
              {attribution && (
                <p className="text-[11px] text-zinc-600" data-test-id="game-info-attribution">{attribution}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
