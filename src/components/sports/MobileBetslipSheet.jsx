import { ArrowLeft, Ticket } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { StatusBadge } from "@/components/ui/status-badge";
import { AzuroBetSlip } from "./AzuroBetSlip";
import { DemoBetSlip } from "./DemoBetSlip";

// Full-screen mobile Sports betslip — the familiar sportsbook "dedicated
// transactional surface" pattern (select odds -> open full-screen betslip
// -> review -> stake -> place -> confirm), replacing the old small centered
// Dialog on mobile (still used at >=1024px was never true; that presentation
// was itself replaced by DesktopBetslipPanel — this is the mobile half of
// that same Phase 1 plan).
//
// Built on Radix Dialog exactly like MobileFullScreenMenu (see that file for
// the precedent this mirrors): focus trap, Escape-to-close, and background
// inert/aria-hidden come from the primitive for free.
// --z-transaction-overlay sits ABOVE --z-fullscreen-menu (unlike the
// full-screen Menu, whose own internal bottom-nav copy is just a normal
// descendant of its own layer, not independently elevated) so this sheet's
// CTA is never covered by anything else in the mobile shell. Reuses the
// exact mobile-menu-content-in/out keyframes (already 220-240ms/180-200ms,
// opacity+translateY, premium ease-out — precisely this task's own motion
// spec) rather than inventing near-duplicate ones.
//
// Owns ONLY full-screen chrome (header, empty state, safe-area, focus
// management). All selection/stake/validation state and the real submit
// flow stay in useSportsBetslip() and AzuroBetSlip/DemoBetSlip themselves
// (rendered here with presentation="sheet") — never duplicated.
export function MobileBetslipSheet({
  open, betslip, onClose, onBrowseSports,
  onBetPlaced, onDemoBetPlaced, onContinueBetting, onViewMyBets,
  restoreFocusRef,
}) {
  const { selections, selectionCount, clearSelections } = betslip;
  const source = selections[0]?.source;
  const label = `${selectionCount} selection${selectionCount === 1 ? "" : "s"}`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-x-0 top-0 z-[var(--z-transaction-overlay)] h-dvh bg-background data-[state=open]:animate-[mobile-menu-backdrop-in_180ms_ease-out] data-[state=closed]:animate-[mobile-menu-backdrop-out_190ms_ease-in] motion-reduce:animate-none"
        />
        <DialogPrimitive.Content
          id="mobile-betslip-sheet"
          className="fixed inset-x-0 top-0 z-[var(--z-transaction-overlay)] flex h-dvh flex-col bg-background outline-none data-[state=open]:animate-[mobile-menu-content-in_230ms_cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:animate-[mobile-menu-content-out_190ms_cubic-bezier(0.4,0,1,1)] motion-reduce:animate-none"
          onOpenAutoFocus={(e) => {
            // First logical control gets focus (see ACCESSIBILITY: "close/
            // back button is first logical control"), not Radix's default
            // (the content container itself).
            e.preventDefault();
            document.getElementById("mobile-betslip-back")?.focus();
          }}
          onCloseAutoFocus={(e) => {
            // Opened programmatically from an odds tap, not a
            // <DialogTrigger>, so Radix has nothing to auto-return to —
            // restore focus to whatever SportsArena captured at open time
            // (see ACCESSIBILITY: "closing restores focus to the betslip
            // trigger or selected odds control").
            e.preventDefault();
            const el = restoreFocusRef?.current;
            if (el && document.contains(el)) el.focus();
          }}
        >
          <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
            <DialogPrimitive.Close
              id="mobile-betslip-back"
              aria-label="Back to Sports"
              className="-ms-2 grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-5" aria-hidden="true" />
            </DialogPrimitive.Close>
            <DialogPrimitive.Title className="shrink-0 text-base font-bold leading-none">Betslip</DialogPrimitive.Title>
            <span className="shrink-0"><StatusBadge variant="neutral" size="small" count={selectionCount} ariaLabel={label} /></span>
            <DialogPrimitive.Description className="sr-only">
              Review your selections, enter a stake, and place your bet.
            </DialogPrimitive.Description>
            {selectionCount > 0 && (
              <button
                onClick={clearSelections}
                aria-label="Clear all selections"
                className="ms-auto shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear all
              </button>
            )}
          </div>

          {selectionCount === 0 ? (
            <EmptyBetslip onBrowseSports={onBrowseSports} />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col px-4 pt-3.5 pb-[calc(14px+env(safe-area-inset-bottom,0px))]">
              {source === "provider" && (
                <AzuroBetSlip
                  presentation="sheet"
                  selections={betslip.selections}
                  stake={betslip.stake}
                  setStake={betslip.setStake}
                  removeSelection={betslip.removeSelection}
                  combinedOdds={betslip.combinedOdds}
                  potentialReturn={betslip.potentialReturn}
                  validation={betslip.validation}
                  onBetPlaced={onBetPlaced}
                  onContinueBetting={onContinueBetting}
                  onViewMyBets={onViewMyBets}
                />
              )}
              {source === "mock" && (
                <DemoBetSlip
                  presentation="sheet"
                  selections={betslip.selections}
                  stake={betslip.stake}
                  setStake={betslip.setStake}
                  removeSelection={betslip.removeSelection}
                  combinedOdds={betslip.combinedOdds}
                  potentialReturn={betslip.potentialReturn}
                  validation={betslip.validation}
                  onBetPlaced={onDemoBetPlaced}
                  onContinueBetting={onContinueBetting}
                  onViewMyBets={onViewMyBets}
                />
              )}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function EmptyBetslip({ onBrowseSports }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 pb-[calc(14px+env(safe-area-inset-bottom,0px))] text-center">
      <Ticket className="size-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">Your betslip is empty. Tap any odds to add a selection.</p>
      <button
        onClick={onBrowseSports}
        className="flex min-h-11 w-full max-w-xs items-center justify-center rounded-lg bg-secondary text-sm font-medium hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Browse Sports
      </button>
    </div>
  );
}
