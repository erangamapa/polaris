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
//   sm ~448px — confirmation / success / warning / error
//   md ~576px — forms / small account flows
//   lg ~672px — content-heavy / detail views (e.g. the Wallet screen)
export const MODAL_SIZE = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
};

// Icon-only semantic tone — see SEMANTIC MODAL VARIANTS: "the entire modal
// must NOT change color... meaning communicated through small controlled
// accents." Never used for backgrounds/borders on the modal itself.
export const MODAL_VARIANT_TONE = {
  neutral: { bg: "bg-secondary", fg: "text-foreground" },
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
