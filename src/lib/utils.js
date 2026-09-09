import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ONE destructive-action treatment, shared by every "Disconnect
// Wallet"/"Sign out" control app-wide — red text + a subtle red-tinted
// hover/focus/press, never a filled button. Originates from the Wallet
// modal's own Disconnect Wallet button (FundsDialog.jsx); the mobile
// full-screen menu's Disconnect Wallet row and the Account popover's Sign
// out (ProfileMenu) both reuse this exact string rather than each
// hand-rolling their own red (see DESTRUCTIVE ACTION CONSISTENCY task).
// `active:` (touch-press) is included alongside hover/focus specifically
// for the mobile menu row, which has no real `:hover` on touch — without
// it, tapping the row showed no press feedback at all, unlike every other
// row in that same list (see MobileFullScreenMenu.jsx's MenuRow, which
// already gives its neutral rows their own `active:bg-secondary/40`).
// Harmless on desktop (ProfileMenu's mouse-driven item), just an unused
// extra state there. Structural layout (padding, alignment, full-width vs
// inline) stays local to each host — only the color/hover/press treatment
// is shared here.
export const DESTRUCTIVE_ACTION_CLASS = "text-[var(--danger)] hover:bg-[var(--danger-bg)] focus:bg-[var(--danger-bg)] active:bg-[var(--danger-bg)]";
