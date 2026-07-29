import { GlowBackdrop } from "./GlowBackdrop";

// Focal object: a rising probability line with a live value marker, plus one
// abstract faceted token (a premium symbolic nod to "crypto market" without
// using an official coin logo). Distinct from the YES/NO tile: asymmetric,
// diagonal, single-direction movement — no split, no pivot, no two-sided layout.
//
// CONSISTENT ARTWORK PASS: recoloured from the old per-arena --predictions-*
// tokens (a teal/green left over from before the One-Brand Unification —
// Sports/Predictions used to own separate accent colours, Casino's promo
// artwork never did) to the same var(--global-cta)/--global-cta-hover +
// shared GlowBackdrop recipe Casino's WalletMark/WelcomeArtwork/RaceArtwork
// use, plus the same #FFD36B gold accent touch — so every promo card across
// all three arenas now reads as one system. Size cap raised (max-h/w-28 ->
// -44) to match CARD_H's taller desktop height, same reason as Casino's.
export function PredictionsTrendingMarket() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <GlowBackdrop />
      <svg viewBox="0 0 100 100" className="relative h-[82%] w-[82%] max-h-44 max-w-44">
        {/* faint axis ticks */}
        <g stroke="color-mix(in srgb, var(--global-cta) 30%, transparent)" strokeWidth="1">
          <line x1="8" y1="86" x2="92" y2="86" />
          <line x1="8" y1="86" x2="8" y2="18" />
        </g>

        {/* rising trend line + area fill */}
        <path d="M10 74 C 26 72, 34 60, 46 52 S 66 30, 84 18 L 84 86 L 10 86 Z" fill="url(#trendFill)" />
        <path d="M10 74 C 26 72, 34 60, 46 52 S 66 30, 84 18" fill="none" stroke="var(--global-cta-hover)" strokeWidth="2.4" strokeLinecap="round" />
        <defs>
          <linearGradient id="trendFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="var(--global-cta)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--global-cta)" stopOpacity="0.24" />
          </linearGradient>
        </defs>

        {/* current-value marker at the line's tip — gold, matching WalletMark's coin */}
        <circle cx="84" cy="18" r="3.2" fill="#FFD36B" />
        <circle cx="84" cy="18" r="7" fill="none" stroke="#FFD36B" strokeWidth="1.2" opacity="0.5" />

        {/* abstract faceted token, not a coin logo */}
        <g transform="translate(30,26)">
          <polygon points="0,-13 11,-6 11,7 0,14 -11,7 -11,-6" fill="#101418" stroke="color-mix(in srgb, var(--global-cta) 35%, transparent)" strokeWidth="1.4" />
          <polygon points="0,-13 11,-6 0,-1 -11,-6" fill="var(--global-cta-hover)" opacity="0.5" />
          <polygon points="0,-1 11,-6 11,7 0,14" fill="var(--global-cta)" opacity="0.35" />
          <line x1="0" y1="-13" x2="0" y2="14" stroke="var(--global-cta-hover)" strokeWidth="0.8" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}
