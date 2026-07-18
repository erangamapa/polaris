import { PlayerTile, ScopedSearch } from "@/components/casino/PromoStrip";
import { ArenaPromoTile } from "./ArenaPromoTile";

// The one shared top-section system for Casino, Sports and Predictions:
// [ wallet tile ] [ arena promo 1 ] [ arena promo 2 ] + scoped search below,
// sharing one wrapper so the row's edges always line up with the search
// control's edges. Casino keeps its own bespoke PromoStrip (full-bleed photo
// promo cards, untouched) — this is what Sports and Predictions render
// instead of their old single oversized SectionHero.
//
// `promos` is a 2-item array shaped like the entries in src/lib/arenaPromos.js
// ({ id, label, title, metadata?, ctaLabel, href, artwork, ariaLabel? }).
export function ArenaTileRow({ arena, promos, query, onQuery }) {
  const [promo1, promo2] = promos;
  return (
    <div className="w-full space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <PlayerTile />
        <ArenaPromoTile promo={promo1} />
        <ArenaPromoTile promo={promo2} />
      </div>
      <ScopedSearch query={query} onQuery={onQuery} defaultScope={arena} />
    </div>
  );
}
