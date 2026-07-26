import { PromoCard } from "./PromoCard";
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

// Sports/Predictions' own promo content rendered through the ONE shared
// PromoCard (see PromoCard.jsx) — this file previously had its own parallel
// implementation (arena-tinted border/background/CTA/focus ring, distinct
// from Casino's promo tile) which is exactly the "different promo-card
// implementations per arena" inconsistency the product-language
// unification pass removes. Only the content (title/eyebrow/cta/href/
// artwork) is arena-specific now; the shell is identical to Casino's.
export function ArenaPromoTile({ promo }) {
  const Art = ARTWORK[promo.artwork];
  return (
    <PromoCard
      href={promo.href}
      ariaLabel={promo.ariaLabel}
      eyebrow={promo.label}
      title={promo.title}
      metadata={promo.metadata}
      cta={promo.ctaLabel}
      artwork={Art}
    />
  );
}
