import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// Tribet's one Modal/Dialog convention — every popup (wallet, deposits,
// confirmations, success/error/warning states, future account/report
// dialogs) is meant to compose these instead of hand-styling its own
// DialogContent. This file owns chrome (size, close-button rule, semantic
// icon tone); feature components own content, state, and actions.
//
// The underlying surface/border/radius/backdrop/shadow are already correct
// (see dialog.jsx: --secondary surface, --overlay-modal/--overlay-blur
// backdrop, --elevation-medium shadow) — this wraps them rather than
// reimplementing, per MODAL DESIGN SYSTEM: "reuse the existing Tribet
// design system wherever possible."

// Conceptual widths, mapped onto Tailwind's EXISTING max-w scale rather
// than new pixel tokens (see TOKENS: "do not hardcode... if the project
// already has suitable tokens"):
//   sm ~448px — a single one-shot confirmation/success/warning/error, no siblings
//   md ~576px — forms / small account flows
//   lg ~672px — content-heavy / detail views (reports, account settings)
//
// `transactional` is the ODD one out and deliberately NOT content-driven:
// it's a fixed width AND height (~520x580 — compact portrait, a focused
// utility object, not a landscape dashboard panel — gutter/height-clamped
// below that on small viewports), for a multi-step STATE MACHINE where
// several screens share one mounted Dialog (wallet -> confirm -> success,
// deposit -> confirm -> success, etc.) — see WALLET MODAL FIXED-SHELL
// task: "the outer shell must remain the same width and height during the
// entire flow." This is the DEFAULT size for that kind of flow — reach for
// sm/md/lg only when a single dialog's own content genuinely needs more
// room, never because a flow's tallest step made a shared height feel
// cramped (compose that step to use the space instead of growing the
// shell).
export const MODAL_SIZE = {
  // `max-h` is repeated here (not just `h`) because it's a DIFFERENT
  // Tailwind utility group than the base DialogContent's own
  // `max-h-[86vh]` — twMerge dedupes same-group conflicts but leaves
  // `height` vs `max-height` alone, and the browser then applies
  // whichever constraint is smaller. Without this, the base 86vh cap
  // silently overrides the intended fixed height on any viewport where
  // 86vh < 580px (any window under ~674px tall) — confirmed via a real
  // measurement, not assumed.
  transactional: "w-full sm:w-[480px] sm:max-w-[calc(100vw-2rem)] h-[min(520px,calc(100dvh-2rem))] max-h-[min(520px,calc(100dvh-2rem))]",
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
};

// Icon-only semantic tone — see SEMANTIC MODAL VARIANTS: "the entire modal
// must NOT change color... meaning communicated through small controlled
// accents." Never used for backgrounds/borders on the modal itself.
// `neutral` is its own semantic tier, not a fallback — completed-but-not-
// positive system states (disconnected, signed out, session ended) use
// --neutral-300, the lightest "muted-high-emphasis" tone this app
// defines (one step brighter than --muted-foreground, still well short of
// full-emphasis --foreground) — see SEMANTIC CONVENTION: "NEUTRAL LIGHT
// GRAY: disconnected, signed out, session ended, informational system
// state." Never green (reserved for genuinely positive completed
// outcomes) and never full --foreground (that would read as emphasized,
// not neutral).
export const MODAL_VARIANT_TONE = {
  neutral: { bg: "bg-secondary", fg: "text-[var(--neutral-300)]" },
  success: { bg: "bg-[var(--success-bg)]", fg: "text-[var(--success)]" },
  warning: { bg: "bg-[var(--warning-bg)]", fg: "text-[var(--warning)]" },
  destructive: { bg: "bg-[var(--danger-bg)]", fg: "text-[var(--danger)]" },
  error: { bg: "bg-[var(--danger-bg)]", fg: "text-[var(--danger)]" },
};

export const Modal = Dialog;

// `dismissible` is the one CLOSE-BUTTON rule for the whole app (see CLOSE
// BUTTON CONVENTION): show the X only when the dialog has no explicit
// decision controls of its own. A confirmation with Cancel/Disconnect, or
// a success screen with Continue, passes `dismissible={false}` — the
// explicit action IS the exit path, never a redundant X.
//
// Height is content-driven by design (see MOST IMPORTANT FIX): no forced
// min-height here. DialogContent already caps at `max-h-[86vh]` with
// internal scrolling for content that genuinely runs long.
export function ModalContent({ size = "md", dismissible = true, className, children, ...props }) {
  return (
    <DialogContent showCloseButton={dismissible} className={cn("flex w-full flex-col", MODAL_SIZE[size], className)} {...props}>
      {children}
    </DialogContent>
  );
}

export const ModalHeader = DialogHeader;
export const ModalTitle = DialogTitle;
export const ModalDescription = DialogDescription;

// Small circular tinted icon chip — see ICON CONVENTION: "simple and flat
// ... small circular tinted surface allowed ... keep icons secondary to
// the title." Never a giant illustration.
export function ModalIcon({ variant = "neutral", icon: Icon, className }) {
  const tone = MODAL_VARIANT_TONE[variant] ?? MODAL_VARIANT_TONE.neutral;
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", tone.bg, tone.fg, className)} aria-hidden="true">
      <Icon className="size-5" />
    </span>
  );
}

// Default spacing/alignment for asymmetric footers (a single primary
// action, or a primary+secondary pair that reads right-to-left in
// importance). Two-button EQUAL-WEIGHT confirmations (see TWO-BUTTON
// CONFIRMATION RULE) override className with an equal-width row instead —
// that's a feature-level layout choice, not a shell rule (see
// ARCHITECTURE: "feature components own actions"). Plain flow, never
// `margin-top: auto` here — see BUTTON POSITIONING.
export function ModalFooter({ className, children }) {
  return (
    <div className={cn("mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}>
      {children}
    </div>
  );
}
