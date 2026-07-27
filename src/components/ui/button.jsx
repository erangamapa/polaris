import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// RESKIN (CTA system + interaction polish pass): the ONE canonical Button
// — every promo card, dialog, and CTA in the app renders through this
// component rather than a hand-rolled className string.
//
// Interaction: 160ms transitions, a small hover lift + brightening, a
// slight press scale-down, 40% opacity when disabled. This deliberately
// REVERSES an earlier pass's "no scale hover, no transform" rule — that
// rule is superseded by this pass's explicit "hover: small lift (1-2px)
// / pressed: slight scale down" instruction. `transition` (not
// `transition-all`) is Tailwind's curated common-properties list, which
// already includes transform — still not literally animating every CSS
// property.
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 active:scale-[0.98] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40 disabled:hover:translate-y-0 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // ONE-BRAND UNIFICATION: the single Tribet brand colour, used for
        // every primary action app-wide — Wallet, Deposit, Withdraw,
        // Connect Wallet, Continue, Claim, Play, Bet, Trade, View Market,
        // everything. There is no separate "arena action" tone anymore:
        // Casino/Sports/Predictions no longer own a distinct CTA colour
        // (see index.css's Core Brand block) — the one Prediction Markets
        // exception (Buy Yes/Buy No) uses the `success`/`destructive`
        // variants below directly at the call site instead.
        default: "bg-[var(--global-cta)] text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        // Prediction Markets semantic exception (YES) — see index.css.
        success:
          "bg-[var(--success)] text-[var(--global-cta-text)] hover:bg-[var(--success)]/90",
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
