import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ONE destructive-action treatment, shared by every "Disconnect
// Wallet"/"Sign out" control app-wide — red text + a subtle red-tinted
// hover/focus, never a filled button. Originates from the Wallet modal's
// own Disconnect Wallet button (FundsDialog.jsx); the mobile full-screen
// menu's Disconnect Wallet and the Account popover's Sign out (ProfileMenu)
// both reuse this exact string rather than each hand-rolling their own red
// (see DESTRUCTIVE ACTION CONSISTENCY task). Structural layout (padding,
// alignment, full-width vs inline) stays local to each host — only the
// color/hover treatment is shared here.
export const DESTRUCTIVE_ACTION_CLASS = "text-[var(--danger)] hover:bg-[var(--danger-bg)] focus:bg-[var(--danger-bg)]";
