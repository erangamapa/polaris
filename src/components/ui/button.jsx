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
        //
        // TRIBET LOGO GRADIENT PASS: flat --global-cta fill replaced with
        // the --global-cta-gradient family (index.css) — the same
        // purple->blue->cyan gradient sampled from the TRIBET wordmark.
        // background-image (not background-color) so text/icon color is
        // never touched by this — `text-[var(--global-cta-text)]` below is
        // unchanged. disabled: explicitly resets to the flat, pre-gradient
        // --global-cta fill (background-image:none) rather than a dimmed
        // gradient — "keep the existing disabled styling" per spec; the
        // shared base classlist's `disabled:opacity-40` still does the
        // actual dimming on top of that flat color, exactly as before this
        // pass. focus-visible ring is the shared base classlist's own
        // ring, untouched here.
        default:
          "[background-image:var(--global-cta-gradient)] text-[var(--global-cta-text)] hover:[background-image:var(--global-cta-gradient-hover)] active:[background-image:var(--global-cta-gradient-active)] disabled:bg-[var(--global-cta)] disabled:[background-image:none]",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        // Prediction Markets semantic exception (YES) — see index.css.
        // Deliberately its OWN literal text color, not --global-cta-text:
        // that token is on-brand white (correct against the blue brand
        // fill) but white-on-#46C98C only computes to ~2.1:1 (fails AA) —
        // this semantic success green is untouched by any brand recolor,
        // so its button text must stay decoupled from the brand token.
        success:
          "bg-[var(--success)] text-[#06131A] hover:bg-[var(--success)]/90",
        outline:
          "border bg-background hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        // PROMO CARD SECONDARY CTA: a quieter, transparent-fill outline
        // specifically for the three Casino promo cards' main actions
        // (View wallet/Claim bonus/View race), now that the header's own
        // filled brand button is the app's one true "primary" CTA — these
        // needed to read as secondary without becoming the generic
        // `outline` variant above (that one's bg-background/neutral tone
        // doesn't carry the blue-tinted, illustration-matching feel these
        // three specifically need). Literal recipe as given, not derived
        // from --global-cta via color-mix — this blue is deliberately a
        // bit lighter/more periwinkle than the brand token, tuned to read
        // clearly against these cards' own dark navy/indigo backgrounds.
        // disabled:cursor-not-allowed is scoped to only this variant since
        // the shared base classlist doesn't set an explicit disabled
        // cursor for any other variant and changing that shared behavior
        // wasn't asked for.
        "promo-outline":
          "border border-[rgba(79,115,255,0.55)] bg-transparent text-[#7c98ff] hover:border-[#5e82ff] hover:bg-[rgba(79,115,255,0.08)] hover:text-white active:bg-[rgba(79,115,255,0.14)] disabled:cursor-not-allowed",
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
