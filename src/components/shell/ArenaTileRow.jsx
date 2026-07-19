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
// `results`/`onSelectResult`/`onBrowseAll`/`onZeroResults` are optional
// passthroughs to ScopedSearch's rich results dropdown — omitted entirely
// by Predictions (unaffected), used by Sports for real result navigation.
export function ArenaTileRow({ arena, promos, query, onQuery, results, onSelectResult, onBrowseAll, onZeroResults }) {
  const [promo1, promo2] = promos;
  return (
    <div className="w-full space-y-3">
      {/* Mobile: real snap-scroll carousel, matching Casino's PromoStrip
          (see that component for the full rationale) — three equal grid
          columns at mobile widths is what produced clipped/truncated promo
          copy. Desktop/tablet (sm+): unchanged 3-column grid. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <div className="w-[82%] shrink-0 snap-start sm:w-auto sm:shrink"><PlayerTile /></div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto sm:shrink"><ArenaPromoTile promo={promo1} /></div>
        <div className="w-[82%] shrink-0 snap-start sm:w-auto sm:shrink"><ArenaPromoTile promo={promo2} /></div>
      </div>
      <ScopedSearch
        query={query}
        onQuery={onQuery}
        defaultScope={arena}
        results={results}
        onSelectResult={onSelectResult}
        onBrowseAll={onBrowseAll}
        onZeroResults={onZeroResults}
      />
    </div>
  );
}
