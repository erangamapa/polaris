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
export const CARD_H = "h-40"; // 160px — inside the 150-170px desktop target

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
          {metadata && <p className="mt-1 hidden truncate text-xs text-[var(--ink-dim)] sm:block">{metadata}</p>}
        </div>
        {/* ONE-BRAND UNIFICATION: every primary action uses the single
            Tribet brand colour now — no arena-owned "action" tone. */}
        <Button variant="default" size="sm" onClick={onCtaClick} className="w-fit">
          {cta}
        </Button>
      </div>
      {Artwork && (
        <div className="hidden w-[38%] shrink-0 sm:block lg:w-[42%]">
          <Artwork />
        </div>
      )}
    </Wrapper>
  );
}
