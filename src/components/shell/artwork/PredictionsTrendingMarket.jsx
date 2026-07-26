// Focal object: a rising probability line with a live value marker, plus one
// abstract faceted token (a premium symbolic nod to "crypto market" without
// using an official coin logo). Distinct from the YES/NO tile: asymmetric,
// diagonal, single-direction movement — no split, no pivot, no two-sided layout.
export function PredictionsTrendingMarket() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(65% 65% at 68% 32%, rgba(79,163,122,0.26), transparent 72%)" }}
      />
      <svg viewBox="0 0 100 100" className="relative h-[84%] w-[84%] max-h-28 max-w-28">
        {/* faint axis ticks */}
        <g stroke="var(--predictions-primary)" strokeOpacity="0.25" strokeWidth="1">
          <line x1="8" y1="86" x2="92" y2="86" />
          <line x1="8" y1="86" x2="8" y2="18" />
        </g>

        {/* rising trend line + area fill */}
        <path d="M10 74 C 26 72, 34 60, 46 52 S 66 30, 84 18 L 84 86 L 10 86 Z" fill="url(#trendFill)" />
        <path d="M10 74 C 26 72, 34 60, 46 52 S 66 30, 84 18" fill="none" stroke="var(--predictions-primary-hover)" strokeWidth="2.4" strokeLinecap="round" />
        <defs>
          <linearGradient id="trendFill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="var(--predictions-primary)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--predictions-primary)" stopOpacity="0.22" />
          </linearGradient>
        </defs>

        {/* current-value marker at the line's tip */}
        <circle cx="84" cy="18" r="3.2" fill="var(--predictions-text-accent)" />
        <circle cx="84" cy="18" r="7" fill="none" stroke="var(--predictions-text-accent)" strokeWidth="1.2" opacity="0.5" />

        {/* abstract faceted token, not a coin logo */}
        <g transform="translate(30,26)">
          <polygon points="0,-13 11,-6 11,7 0,14 -11,7 -11,-6" fill="#0E1B1F" stroke="var(--predictions-primary)" strokeWidth="1.4" />
          <polygon points="0,-13 11,-6 0,-1 -11,-6" fill="var(--predictions-primary-hover)" opacity="0.55" />
          <polygon points="0,-1 11,-6 11,7 0,14" fill="var(--predictions-primary)" opacity="0.35" />
          <line x1="0" y1="-13" x2="0" y2="14" stroke="var(--predictions-text-accent)" strokeWidth="0.8" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}
