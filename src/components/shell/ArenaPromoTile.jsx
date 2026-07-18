import { CARD_H, PROMO_CTA_BASE } from "@/components/casino/PromoStrip";
import { SportsLiveMatch } from "./artwork/SportsLiveMatch";
import { SportsBetBuilder } from "./artwork/SportsBetBuilder";
import { PredictionsTrendingMarket } from "./artwork/PredictionsTrendingMarket";
import { PredictionsYesNoPosition } from "./artwork/PredictionsYesNoPosition";

const ARTWORK = {
  "sports-live-match": SportsLiveMatch,
  "sports-bet-builder": SportsBetBuilder,
  "predictions-trending-market": PredictionsTrendingMarket,
  "predictions-yes-no-position": PredictionsYesNoPosition,
};

// An arena's own promo tile — same CARD_H/grid column/CTA shape as Casino's
// PromoTile and the wallet tile, but tinted via --product-* (already resolved
// per arena by the page root's [data-product] attribute, same mechanism
// SectionHero used to use) instead of Casino's hardcoded pink. The whole card
// is a real <a href> — not just the CTA — so it's a single focus stop and
// works with keyboard, middle-click and cmd/ctrl-click like the game tiles.
export function ArenaPromoTile({ promo }) {
  const Art = ARTWORK[promo.artwork];
  return (
    <a
      href={promo.href}
      aria-label={promo.ariaLabel || promo.title}
      className={`${CARD_H} group relative flex w-full min-w-0 items-stretch gap-3 overflow-hidden rounded-xl border border-[var(--product-border)] bg-[#0C080C] p-4 text-left transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--product-primary)]`}
    >
      <div className="flex h-full min-w-0 flex-1 flex-col justify-between">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-[var(--product-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--product-accent-text)]">
            {promo.label}
          </span>
          <h3
            className="mt-0.5 text-base font-bold leading-tight text-[#F2F3F5] sm:mt-1.5 sm:leading-snug"
            style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {promo.title}
          </h3>
          {promo.metadata && <p className="mt-1 hidden truncate text-xs text-zinc-400 sm:block">{promo.metadata}</p>}
        </div>
        <span className={`${PROMO_CTA_BASE} bg-[var(--product-primary)] text-[var(--product-cta-text)] group-hover:bg-[var(--product-primary-hover)]`}>
          {promo.ctaLabel}
        </span>
      </div>
      {Art && (
        <div className="hidden w-[38%] shrink-0 sm:block lg:w-[42%]">
          <Art />
        </div>
      )}
    </a>
  );
}
