import { GlowBackdrop } from "./GlowBackdrop";

// Focal object: a symmetric YES/NO split with a pivot marker sitting on the
// dividing line at a specific "entry price." Distinct from the trending-market
// tile: mirrored/symmetric composition, no line chart, no token, no single
// direction of movement — the story here is a binary choice, not momentum.
//
// CONSISTENT ARTWORK PASS: recoloured from the old per-arena --predictions-*
// tokens to the shared var(--global-cta)/--global-cta-hover + GlowBackdrop
// recipe every other promo card now uses. YES stays the "on-brand" side
// (blue, matching every other affirmative CTA in the app); NO stays neutral
// grey — never red, still the arena's original "no colour-only signalling
// of yes/no" calibration, just recalibrated off blue instead of teal. Size
// cap raised (max-h/w-28 -> -44) to match CARD_H's taller desktop height.
export function PredictionsYesNoPosition() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <GlowBackdrop />
      <svg viewBox="0 0 100 100" className="relative h-[82%] w-[82%] max-h-44 max-w-44">
        {/* two opposing halves */}
        <rect x="6" y="10" width="41" height="80" rx="8" fill="#101418" stroke="color-mix(in srgb, var(--global-cta) 35%, transparent)" strokeWidth="1.4" />
        <rect x="53" y="10" width="41" height="80" rx="8" fill="#181C22" stroke="#3A4152" strokeWidth="1.4" />

        {/* YES glyph, left */}
        <path d="M18 46 L25 55 L37 34" fill="none" stroke="var(--global-cta-hover)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="26.5" y="72" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fontWeight="800" fill="var(--global-cta-hover)">YES</text>

        {/* NO glyph, right — kept neutral/grey, not red */}
        <path d="M63 36 L84 57 M84 36 L63 57" stroke="#8B929A" strokeWidth="4.5" strokeLinecap="round" />
        <text x="73.5" y="72" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fontWeight="800" fill="#9BA1A8">NO</text>

        {/* central divider + pivot marker at the entry price — gold, matching WalletMark's coin */}
        <line x1="50" y1="6" x2="50" y2="94" stroke="color-mix(in srgb, var(--global-cta) 30%, transparent)" strokeWidth="1" />
        <line x1="38" y1="50" x2="62" y2="50" stroke="#E7F2F4" strokeWidth="1.2" opacity="0.8" />
        <circle cx="50" cy="50" r="5.5" fill="#0C0F16" stroke="#FFD36B" strokeWidth="2" />
        <circle cx="50" cy="50" r="2" fill="#FFD36B" />
      </svg>
    </div>
  );
}
