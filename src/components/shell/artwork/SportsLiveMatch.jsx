// Focal object: a match ball, mid-motion, lit by stadium floodlights.
// Distinct from SportsBetBuilder: round silhouette, motion streaks, light
// cones — no cards, no grid, no straight/tactical lines.
export function SportsLiveMatch() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(60% 60% at 60% 30%, rgba(175,195,74,0.24), transparent 70%)" }}
      />
      <svg viewBox="0 0 100 100" className="relative h-[84%] w-[84%] max-h-28 max-w-28">
        {/* floodlight cones from top corners */}
        <path d="M6 4 L46 40 L2 46 Z" fill="var(--sports-primary)" opacity="0.10" />
        <path d="M94 2 L58 38 L96 44 Z" fill="var(--sports-primary)" opacity="0.14" />
        {/* motion streaks trailing the ball */}
        <g stroke="var(--sports-primary)" strokeLinecap="round" opacity="0.5">
          <path d="M4 66 L34 60" strokeWidth="2" />
          <path d="M0 76 L28 71" strokeWidth="2" opacity="0.7" />
          <path d="M8 86 L32 82" strokeWidth="1.6" opacity="0.5" />
        </g>
        {/* ball */}
        <g transform="translate(62,58)">
          <circle r="26" fill="#0E1408" stroke="var(--sports-text-accent)" strokeWidth="1.4" />
          <circle r="26" fill="none" stroke="var(--sports-primary)" strokeWidth="1" opacity="0.35" />
          {/* pentagon seam pattern (simplified) */}
          <g stroke="var(--sports-text-accent)" strokeWidth="1.1" fill="#1B2410" opacity="0.9">
            <polygon points="0,-11 10,-4 6,8 -6,8 -10,-4" />
            <path d="M0,-11 L0,-26" />
            <path d="M10,-4 L23,-9" />
            <path d="M6,8 L15,20" />
            <path d="M-6,8 L-15,20" />
            <path d="M-10,-4 L-23,-9" />
          </g>
          <circle r="26" fill="url(#ballGloss)" opacity="0.5" />
          <defs>
            <radialGradient id="ballGloss" cx="0.35" cy="0.3" r="0.7">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
        </g>
        {/* subtle scoreboard corner, bottom-left */}
        <g transform="translate(4,80)" opacity="0.55">
          <rect width="20" height="12" rx="1.5" fill="#0E1408" stroke="var(--sports-primary)" strokeWidth="1" />
          <rect x="2.5" y="3" width="6" height="6" fill="var(--sports-primary)" opacity="0.7" />
          <rect x="11.5" y="3" width="6" height="6" fill="var(--sports-text-accent)" opacity="0.5" />
        </g>
      </svg>
    </div>
  );
}
