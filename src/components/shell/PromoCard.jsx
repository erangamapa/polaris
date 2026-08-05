import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MicroLabel } from "@/components/ui/micro-label";

// THE one promo-card implementation for all three arenas (Casino, Sports,
// Predictions previously each rendered their own: casino/PromoStrip.jsx's
// local PromoTile and shell/ArenaPromoTile.jsx were two separate
// components with different borders, backgrounds, CTA colors and focus
// rings — see the product-language unification pass). Only CONTENT
// changes per caller (eyebrow/title/metadata/cta/artwork/href); layout,
// padding, radius, typography, CTA styling, hover and focus are identical
// everywhere this renders.
//
// Neutral chrome only — no arena-tinted border, background, focus ring, or
// colored rail (see the removed 2px --casino rail on the old "Welcome
// offer" card: a promo card is not a selected/active/focus state, and a
// colored edge read as exactly that).
//
// CASINO PARITY PASS: brought in line with the Casino promo cards
// (PromoStrip.jsx's WalletCard/WelcomeOfferCard/WeeklyRaceCard), which had
// drifted onto their own bespoke, shorter, more compact system (corrected
// height, responsive text, outlined secondary CTA) while this shared
// component — still Sports/Predictions' only promo-card implementation —
// kept the older, taller one. Rather than give Sports/Predictions their
// own third copy, this component now reuses the exact same building
// blocks Casino's cards use: `CARD_H` (below) matches Casino's own
// constant value, `.promo-card`/`.promo-card__content`/`.promo-card__title`/
// `.promo-card__body` are the same shared classes (index.css) Casino's
// cards apply directly, and the CTA uses the same `promo-outline` variant
// — one system, not three that happen to agree.
export const CARD_H = "h-36 lg:h-44"; // 144px mobile/tablet, 176px desktop — matches Casino's own promo cards exactly

export function PromoCard({ href, ariaLabel, eyebrow, title, metadata, cta, onCtaClick, artwork: Artwork }) {
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href, "aria-label": ariaLabel || title } : {})}
      // CARD POLISH: same subtle resting elevation as every other card in
      // the app (--elevation-low) instead of perfectly flat. `promo-card`
      // (index.css) is Casino's own shared hover/press treatment — a
      // border brighten + small lift, plus (via its descendant selector)
      // bringing the promo-outline CTA below into its own hover state
      // when the card itself is hovered. Replaces this component's
      // previous bespoke `hover:bg-[var(--secondary)]` treatment, which
      // was a second, different-feeling hover effect Casino's cards never
      // had — one shared hover feel now, not two.
      className={cn(
        CARD_H,
        "promo-card group relative flex w-full min-w-0 items-stretch gap-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-[var(--elevation-low)]",
        href && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      {/* `promo-card__content` (index.css) is the same shared content-safe
          zone Casino's cards use: container-relative width tiers plus
          `container-type: inline-size`, which is what lets the title/body
          classes below scale off THIS column's own rendered width rather
          than the viewport. */}
      <div className="promo-card__content flex h-full min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          {/* -ml-[9px] cancels the pill's own left padding (px-[9px]) so
              its text starts at the same x as the title/CTA below it. */}
          <MicroLabel className="-ml-[9px]">{eyebrow}</MicroLabel>
          {/* `promo-card__title`/`promo-card__body` (index.css) are
              Casino's own responsive title/body classes — cqw-scaled font
              size (so 13"-class laptop widths shrink text instead of
              forcing awkward wraps or ellipsis-truncating it), a 2-line
              cap as a safety net, and `text-wrap: balance` on the title
              for readable line breaks. Same rules everywhere now, not a
              second arena-specific font-size scheme. */}
          <h3 className="promo-card__title mt-1.5 font-bold text-[var(--foreground)]">
            {title}
          </h3>
          {metadata && (
            <p className="promo-card__body mt-1 text-[var(--ink-dim)]">
              {metadata}
            </p>
          )}
        </div>
        {/* PROMO CARD SECONDARY CTA: the same `promo-outline` variant
            Casino's Welcome Offer/Weekly Race cards use for their main
            action — transparent fill, blue border/text — now that the
            header's own filled brand button is the app's one true
            primary CTA and the Wallet tile (PlayerTile, shared byte-for-
            byte across all three arenas) is the only promo-row CTA that
            stays filled. The trailing arrow matches Casino's own two
            outlined CTAs exactly, not a one-off addition here. */}
        <Button variant="promo-outline" size="sm" onClick={onCtaClick} className="w-fit">
          {cta}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
      {Artwork && (
        // MOCKUP ALIGNMENT CORRECTION: a soft left-edge mask so artwork
        // fades into the card's dark surface instead of showing a hard
        // rectangular seam where it meets the text column — "no visible
        // rectangular image boundary, no thumbnail-card-inside-card
        // effect". Applied once here so every current/future artwork
        // (SVG or raster) gets the same treatment automatically, rather
        // than each artwork component re-implementing its own fade.
        // Width tiers now match Casino's own artwork zone (40/44/46%)
        // exactly, not a close-but-different 38/42% — the artwork itself
        // is untouched (each SVG sizes itself as a percentage of this
        // wrapper, so it scales down cleanly with the shorter CARD_H
        // above with no separate change needed there).
        <div
          className="hidden w-[40%] shrink-0 sm:block lg:w-[44%] xl:w-[46%]"
          style={{
            maskImage: "linear-gradient(to right, transparent, black 30%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, black 30%)",
          }}
        >
          <Artwork />
        </div>
      )}
    </Wrapper>
  );
}
