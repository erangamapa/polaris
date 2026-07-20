import { useEffect, useRef, useState } from "react";
import { ChevronsRight, ChevronsLeft, Ticket } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { AzuroBetSlip } from "./AzuroBetSlip";
import { DemoBetSlip } from "./DemoBetSlip";
import { track } from "@/lib/telemetry";

// Stake-style persistent right-side desktop betslip panel — replaces the
// centered modal at >=1024px (see SportsArena.jsx, which renders this
// INSTEAD of the Dialog-based AzuroBetSlip/DemoBetSlip at that breakpoint;
// below it, the modal presentation is unchanged). A real layout column (flex
// sibling of <Sidebar>/<main> in App.jsx), not an overlay — it resizes the
// Sports content instead of covering it.
//
// Owns ONLY presentation chrome (header, collapse strip, scroll regions).
// All selection/stake/validation state and the real submit flow stay in
// useSportsBetslip() and AzuroBetSlip/DemoBetSlip themselves (rendered here
// with presentation="panel") — this component never duplicates them.
export function DesktopBetslipPanel({ betslip, uiState, onBetPlaced, onDemoBetPlaced, onDone }) {
  const { isOpen, isCollapsed, collapse, expand } = uiState;
  const asideRef = useRef(null);

  // Mixed source is prevented at add-time (see useSportsBetslip), so
  // `selections` is guaranteed single-source whenever non-empty — exactly
  // one of these two ever renders, never both, never a merged list.
  const source = betslip.selections[0]?.source;
  const width = !isOpen ? "0px" : isCollapsed ? "var(--sports-betslip-collapsed-width)" : "var(--sports-betslip-width)";
  const label = `${betslip.selectionCount} selection${betslip.selectionCount === 1 ? "" : "s"}`;

  // Focus predictability: if a row was removed via a control inside the
  // panel and focus would otherwise fall back to <body>, land it on the
  // panel container instead (see ACCESSIBILITY: "focus remains predictable
  // when rows are removed").
  const removeSelection = (id) => {
    const hadFocusInPanel = !!asideRef.current && asideRef.current.contains(document.activeElement);
    betslip.removeSelection(id);
    if (hadFocusInPanel) {
      requestAnimationFrame(() => {
        if (!asideRef.current) return;
        if (document.activeElement === document.body || !asideRef.current.contains(document.activeElement)) {
          asideRef.current.focus();
        }
      });
    }
  };

  const handleCollapse = () => {
    collapse();
    track("sports_betslip_panel_collapsed", { selectionCount: betslip.selectionCount });
  };
  const handleExpand = () => {
    expand();
    track("sports_betslip_panel_expanded", { selectionCount: betslip.selectionCount });
  };

  // Polite, non-forceful status announcement for the one transition that
  // happens without any direct user action on the panel itself: the first
  // selection auto-opening it (see ACCESSIBILITY: "optionally announce that
  // the selection was added and betslip opened" — focus is never moved).
  const [announcement, setAnnouncement] = useState("");
  const wasOpenRef = useRef(isOpen);
  useEffect(() => {
    if (!wasOpenRef.current && isOpen) setAnnouncement(`Selection added. Betslip opened, ${label}.`);
    wasOpenRef.current = isOpen;
  }, [isOpen, label]);

  return (
    <>
      <div role="status" aria-live="polite" className="sr-only">{announcement}</div>
      <aside
        ref={asideRef}
        tabIndex={-1}
        aria-label="Sports betslip"
        aria-hidden={!isOpen}
        className="flex shrink-0 flex-col overflow-hidden border-s bg-sidebar transition-[width] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none focus:outline-none"
        style={{ width }}
      >
        {isOpen && isCollapsed && (
          <button
            onClick={handleExpand}
            aria-label={`Expand betslip, ${label}`}
            className="flex h-full w-full flex-col items-center gap-2 pt-4 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Ticket className="size-5" aria-hidden="true" />
            <StatusBadge variant="neutral" size="small" count={betslip.selectionCount} ariaLabel={label} />
            <ChevronsLeft className="mt-auto mb-4 size-4" aria-hidden="true" />
          </button>
        )}

        {isOpen && !isCollapsed && (
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b px-4 py-3.5">
              <h2 className="shrink-0 text-sm font-semibold leading-none">Betslip</h2>
              <span className="shrink-0"><StatusBadge variant="neutral" size="small" count={betslip.selectionCount} ariaLabel={label} /></span>
              {betslip.selectionCount > 0 && (
                <button onClick={betslip.clearSelections} aria-label="Clear all selections" className="ms-auto shrink-0 whitespace-nowrap text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Clear all
                </button>
              )}
              <button onClick={handleCollapse} aria-label="Collapse betslip" className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ChevronsRight className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 py-3.5">
              {source === "provider" && (
                <AzuroBetSlip
                  presentation="panel"
                  selections={betslip.selections}
                  stake={betslip.stake}
                  setStake={betslip.setStake}
                  removeSelection={removeSelection}
                  combinedOdds={betslip.combinedOdds}
                  potentialReturn={betslip.potentialReturn}
                  validation={betslip.validation}
                  onDone={onDone}
                  onBetPlaced={onBetPlaced}
                />
              )}
              {source === "mock" && (
                <DemoBetSlip
                  presentation="panel"
                  selections={betslip.selections}
                  stake={betslip.stake}
                  setStake={betslip.setStake}
                  removeSelection={removeSelection}
                  combinedOdds={betslip.combinedOdds}
                  potentialReturn={betslip.potentialReturn}
                  validation={betslip.validation}
                  onDone={onDone}
                  onBetPlaced={onDemoBetPlaced}
                />
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
