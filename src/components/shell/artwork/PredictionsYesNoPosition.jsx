// Focal object: a symmetric YES/NO split with a pivot marker sitting on the
// dividing line at a specific "entry price." Distinct from the trending-market
// tile: mirrored/symmetric composition, no line chart, no token, no single
// direction of movement — the story here is a binary choice, not momentum.
export function PredictionsYesNoPosition() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(65% 65% at 50% 50%, rgba(79,163,122,0.18), transparent 74%)" }}
      />
      <svg viewBox="0 0 100 100" className="relative h-[84%] w-[84%] max-h-28 max-w-28">
        {/* two opposing halves */}
        <rect x="6" y="10" width="41" height="80" rx="8" fill="#12262A" stroke="var(--predictions-primary)" strokeWidth="1.4" />
        <rect x="53" y="10" width="41" height="80" rx="8" fill="#17191C" stroke="#5A6168" strokeWidth="1.4" />

        {/* YES glyph, left */}
        <path d="M18 46 L25 55 L37 34" fill="none" stroke="var(--predictions-primary-hover)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <text x="26.5" y="72" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fontWeight="800" fill="var(--predictions-text-accent)">YES</text>

        {/* NO glyph, right — kept neutral/grey, not red, to stay in the arena's teal calibration */}
        <path d="M63 36 L84 57 M84 36 L63 57" stroke="#8B929A" strokeWidth="4.5" strokeLinecap="round" />
        <text x="73.5" y="72" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="10" fontWeight="800" fill="#9BA1A8">NO</text>

        {/* central divider + pivot marker at the entry price */}
        <line x1="50" y1="6" x2="50" y2="94" stroke="var(--predictions-primary)" strokeWidth="1" opacity="0.4" />
        <line x1="38" y1="50" x2="62" y2="50" stroke="#E7F2F4" strokeWidth="1.2" opacity="0.8" />
        <circle cx="50" cy="50" r="5.5" fill="#0C1618" stroke="var(--predictions-text-accent)" strokeWidth="2" />
        <circle cx="50" cy="50" r="2" fill="var(--predictions-text-accent)" />
      </svg>
    </div>
  );
}
