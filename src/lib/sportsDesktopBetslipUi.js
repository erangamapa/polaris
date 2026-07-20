// Desktop betslip panel presentation state — open/collapsed only. This is
// deliberately the ONLY state this hook owns; selections/stake/validation
// all continue to live in useSportsBetslip() (see sportsBetslip.js). Lifted
// into App.jsx alongside useSportsBetslip() for the same reason: SportsArena
// remounts on every arena switch, so panel open/collapsed state must live
// above that boundary to survive leaving Sports and coming back.
//
// Rules (documented per the task spec, since each was a choice among
// several acceptable options):
// - Empty betslip: panel is fully hidden (isOpen=false), not merely
//   collapsed-with-empty-message — simplest MVP choice, avoids building an
//   empty state no one needs to see.
// - First selection (0 -> 1): isOpen becomes true automatically.
// - A NEW selection added while the panel was manually collapsed: reopens
//   (isCollapsed reset to false) — the "preferred" behavior called out in
//   the spec, so a user who collapsed the panel still sees what they just
//   added.
// - Removing a selection (but not the last): does not change isOpen/
//   isCollapsed — no surprise resizing on every individual remove.
// - Removing the last selection (or Clear all): isOpen becomes false (panel
//   hides), matching the "hide when empty" rule above.
import { useEffect, useRef, useState } from "react";

// Matches the desktop shell breakpoint (Tailwind's `lg`, 1024px) already
// recommended for this panel. A JS gate (not just a CSS `hidden lg:flex`)
// so the mobile Dialog and the desktop panel are never BOTH mounted at
// once — mounting both would run two independent AzuroBetSlip/DemoBetSlip
// hook instances (wallet state, submit phase) side by side, which is a real
// duplication risk, not just a visual one. Same matchMedia pattern already
// used in App.jsx for the sidebar/mobile-menu breakpoints.
const DESKTOP_BETSLIP_QUERY = "(min-width: 1024px)";

export function useIsDesktopBetslipLayout() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(DESKTOP_BETSLIP_QUERY).matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_BETSLIP_QUERY);
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDesktop;
}

// Pure decision function for the count-driven transitions above — kept
// separate from the hook (same split as sportsBetslipReducer vs
// useSportsBetslip in sportsBetslip.js) specifically so these rules are
// unit-testable without rendering anything. Manual collapse()/expand() are
// simple, count-independent setState calls and stay inline in the hook.
export function nextDesktopBetslipUiState({ prevCount, nextCount, isOpen, isCollapsed }) {
  if (nextCount > prevCount) return { isOpen: true, isCollapsed: false };
  if (nextCount === 0) return { isOpen: false, isCollapsed };
  return { isOpen, isCollapsed };
}

export function useSportsDesktopBetslipUi(selectionCount) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 1200 : false));

  const prevCountRef = useRef(selectionCount);
  useEffect(() => {
    const prev = prevCountRef.current;
    const next = nextDesktopBetslipUiState({ prevCount: prev, nextCount: selectionCount, isOpen, isCollapsed });
    setIsOpen(next.isOpen);
    setIsCollapsed(next.isCollapsed);
    prevCountRef.current = selectionCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally
    // count-only: isOpen/isCollapsed are read as current values here, not
    // reactive triggers (collapse()/expand() set them independently below).
  }, [selectionCount]);

  const collapse = () => setIsCollapsed(true);
  const expand = () => setIsCollapsed(false);

  return { isOpen, isCollapsed, collapse, expand };
}
