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
// colored edge read as exactly that). The CTA is the one exception, per
// the CTA OWNERSHIP SYSTEM: every promo card rendered through this
// component is an ARENA action (Claim Bonus, View Race, Bet Now, Build a
// bet, View market, Explore markets — never a platform action like
// Deposit/Wallet), so its button uses the "action" variant, which
// resolves to the current page's arena color automatically.
// MOCKUP ALIGNMENT CORRECTION: 160px flat read as too short for the
// approved mockup's richer, more premium card — artwork in particular had
// no real room to create emotional impact. Mobile/tablet (below lg:) keep
// the original, already-tuned 160px; only the desktop tier (where the
// approved mockup applies and all three cards now share one grid row)
// grows to 208px.
export const CARD_H = "h-40 lg:h-52"; // 160px mobile/tablet, 208px desktop

export function PromoCard({ href, ariaLabel, eyebrow, title, metadata, cta, onCtaClick, artwork: Artwork }) {
  const Wrapper = href ? "a" : "div";
  return (
    <Wrapper
      {...(href ? { href, "aria-label": ariaLabel || title } : {})}
      // CARD POLISH: same subtle resting elevation as every other card in
      // the app (--elevation-low) instead of perfectly flat.
      className={cn(
        CARD_H,
        "group relative flex w-full min-w-0 items-stretch gap-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 text-left shadow-[var(--elevation-low)] transition duration-150",
        href && "hover:bg-[var(--secondary)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          {/* -ml-[9px] cancels the pill's own left padding (px-[9px]) so
              its text starts at the same x as the title/CTA below it. */}
          <MicroLabel className="-ml-[9px]">{eyebrow}</MicroLabel>
          {/* ONE typography system: the same text-lg font-bold recipe
              every page/card/dialog title in the app uses. */}
          <h3
            className="mt-1.5 text-lg font-bold text-[var(--foreground)]"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {title}
          </h3>
          {/* MOCKUP ALIGNMENT CORRECTION: `truncate` produced visible
              mid-sentence ellipsis clipping ("Match on your first
              deposit. Ins…") — unacceptable per the approved direction.
              line-clamp-2 lets the actual configured copy (short enough
              to fit two lines at this card's text-column width) wrap
              naturally instead; it only silently clips if a future copy
              string is much longer than today's, and never mid-word with
              a visible ellipsis in the normal case. Shown at every
              breakpoint now (was hidden below sm:) — the mobile carousel
              card is already ~82% of the viewport, plenty of room. */}
          {metadata && (
            <p
              className="mt-1 text-xs leading-snug text-[var(--ink-dim)]"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {metadata}
            </p>
          )}
        </div>
        {/* ONE-BRAND UNIFICATION: every primary action uses the single
            Tribet brand colour now — no arena-owned "action" tone. */}
        <Button variant="default" size="sm" onClick={onCtaClick} className="w-fit">
          {cta}
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
        <div
          className="hidden w-[38%] shrink-0 sm:block lg:w-[42%]"
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
