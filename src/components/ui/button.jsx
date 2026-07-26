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
        // Primary — the platform's Mint action color. CTA OWNERSHIP
        // SYSTEM: use this ONLY for actions that belong to Tribet itself,
        // not the current arena — Wallet, Deposit, Withdraw, Connect
        // Wallet, Continue, Confirm, Profile, Settings, KYC, Support,
        // Transaction History, Copy Address, Network Selection. These
        // stay Mint on every arena page, never the local arena color.
        default: "bg-[var(--global-cta)] text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] active:bg-[var(--global-cta-active)]",
        // Arena action — CTA OWNERSHIP SYSTEM: use this for actions that
        // belong to the CURRENT arena experience (Claim Bonus, Play Now,
        // Spin, Bet Now, Cash Out, Buy YES/NO, Trade, View Market, etc.).
        // Reads --product-action-*, which [data-product="casino|sports|
        // predictions"] on the page root resolves automatically — no
        // per-arena variant needed, no special-casing at the call site.
        action: "bg-[var(--product-action)] text-[var(--product-action-text)] hover:bg-[var(--product-action-hover)] active:bg-[var(--product-action-active)]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
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
