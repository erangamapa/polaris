import { PlayerTile, ScopedSearch } from "@/components/casino/PromoStrip";
import { ArenaPromoTile } from "./ArenaPromoTile";

// The one shared top-section system for Casino, Sports and Predictions:
// [ wallet tile ] [ arena promo 1 ] [ arena promo 2 ] + scoped search below,
// sharing one wrapper so the row's edges always line up with the search
// control's edges. Casino's own PromoStrip.jsx renders the same layout
// directly rather than through this component (it needs the richer
// combobox search panel Sports/Predictions don't use) but both call sites
// render promo content through the same shared PromoCard (see
// ArenaPromoTile.jsx/PromoCard.jsx) — this is what Sports and Predictions
// render instead of their old single oversized SectionHero.
//
// `promos` is a 2-item array shaped like the entries in src/lib/arenaPromos.js
// ({ id, label, title, metadata?, ctaLabel, href, artwork, ariaLabel? }).
// Sports/Predictions get the plain ScopedSearch input only — no `panel`, so
// no dropdown/combobox semantics — that rich behaviour is Casino-only (see
// PromoStrip.jsx's own CasinoLobby usage and CasinoSearch.jsx).
export function ArenaTileRow({ arena, promos, query, onQuery }) {
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
      <ScopedSearch query={query} onQuery={onQuery} defaultScope={arena} />
    </div>
  );
}
