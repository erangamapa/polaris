import { GlowBackdrop } from "./GlowBackdrop";

// Focal object: three layered selection cards joined by a single connecting
// path into one combined node — a UI/product metaphor for "combine markets."
// Distinct from SportsLiveMatch: rectilinear, no ball, no light cones, no
// motion streaks — a tactical pitch grid sits behind it instead of floodlights.
//
// CONSISTENT ARTWORK PASS: recoloured from the old per-arena --sports-*
// tokens to the shared var(--global-cta)/--global-cta-hover + GlowBackdrop
// recipe every other promo card now uses. Size cap raised (max-h/w-28 ->
// -44) to match CARD_H's taller desktop height.
export function SportsBetBuilder() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <GlowBackdrop />
      <svg viewBox="0 0 100 100" className="relative h-[82%] w-[82%] max-h-44 max-w-44">
        {/* faint tactical pitch grid */}
        <g stroke="var(--global-cta)" strokeOpacity="0.16" strokeWidth="1">
          <rect x="6" y="10" width="88" height="80" rx="2" fill="none" />
          <line x1="6" y1="50" x2="94" y2="50" />
          <circle cx="50" cy="50" r="12" fill="none" />
        </g>

        {/* connecting path linking the three selections into one build */}
        <path
          d="M26 30 C 40 34, 40 46, 54 50 C 66 54, 66 64, 78 68"
          fill="none" stroke="var(--global-cta-hover)" strokeWidth="1.6" strokeDasharray="1 5" strokeLinecap="round"
        />

        {/* three layered selection cards */}
        <g>
          <rect x="12" y="20" width="30" height="20" rx="4" fill="#101418" stroke="color-mix(in srgb, var(--global-cta) 40%, transparent)" strokeWidth="1.3" />
          <circle cx="19" cy="27" r="2.6" fill="var(--global-cta)" />
          <rect x="25" y="24.5" width="14" height="2.4" rx="1.2" fill="var(--global-cta-hover)" opacity="0.7" />
          <rect x="25" y="29.5" width="10" height="2.4" rx="1.2" fill="var(--global-cta-hover)" opacity="0.4" />
        </g>
        <g>
          <rect x="30" y="40" width="30" height="20" rx="4" fill="#101418" stroke="color-mix(in srgb, var(--global-cta) 40%, transparent)" strokeWidth="1.3" />
          <circle cx="37" cy="47" r="2.6" fill="var(--global-cta)" />
          <rect x="43" y="44.5" width="14" height="2.4" rx="1.2" fill="var(--global-cta-hover)" opacity="0.7" />
          <rect x="43" y="49.5" width="10" height="2.4" rx="1.2" fill="var(--global-cta-hover)" opacity="0.4" />
        </g>
        <g>
          <rect x="52" y="58" width="30" height="20" rx="4" fill="#181C22" stroke="var(--global-cta-hover)" strokeWidth="1.6" />
          <circle cx="59" cy="65" r="2.8" fill="#FFD36B" />
          <rect x="65" y="62.5" width="14" height="2.4" rx="1.2" fill="#EEF1FA" opacity="0.85" />
          <rect x="65" y="67.5" width="10" height="2.4" rx="1.2" fill="#EEF1FA" opacity="0.5" />
        </g>

        {/* combined node at the end of the path — gold accent, matching WalletMark's coin */}
        <circle cx="82" cy="72" r="4.5" fill="#FFD36B" />
        <circle cx="82" cy="72" r="8" fill="none" stroke="#FFD36B" strokeWidth="1" opacity="0.4" />
      </svg>
    </div>
  );
}
