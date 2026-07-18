// Focal object: three layered selection cards joined by a single connecting
// path into one combined node — a UI/product metaphor for "combine markets."
// Distinct from SportsLiveMatch: rectilinear, no ball, no light cones, no
// motion streaks — a tactical pitch grid sits behind it instead of floodlights.
export function SportsBetBuilder() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(60% 60% at 50% 50%, rgba(175,195,74,0.16), transparent 72%)" }}
      />
      <svg viewBox="0 0 100 100" className="relative h-[84%] w-[84%] max-h-28 max-w-28">
        {/* faint tactical pitch grid */}
        <g stroke="#AFC34A" strokeOpacity="0.14" strokeWidth="1">
          <rect x="6" y="10" width="88" height="80" rx="2" fill="none" />
          <line x1="6" y1="50" x2="94" y2="50" />
          <circle cx="50" cy="50" r="12" fill="none" />
        </g>

        {/* connecting path linking the three selections into one build */}
        <path
          d="M26 30 C 40 34, 40 46, 54 50 C 66 54, 66 64, 78 68"
          fill="none" stroke="#D7E78A" strokeWidth="1.6" strokeDasharray="1 5" strokeLinecap="round"
        />

        {/* three layered selection cards */}
        <g>
          <rect x="12" y="20" width="30" height="20" rx="4" fill="#141C0C" stroke="#AFC34A" strokeWidth="1.3" />
          <circle cx="19" cy="27" r="2.6" fill="#AFC34A" />
          <rect x="25" y="24.5" width="14" height="2.4" rx="1.2" fill="#D7E78A" opacity="0.7" />
          <rect x="25" y="29.5" width="10" height="2.4" rx="1.2" fill="#D7E78A" opacity="0.4" />
        </g>
        <g>
          <rect x="30" y="40" width="30" height="20" rx="4" fill="#141C0C" stroke="#AFC34A" strokeWidth="1.3" />
          <circle cx="37" cy="47" r="2.6" fill="#AFC34A" />
          <rect x="43" y="44.5" width="14" height="2.4" rx="1.2" fill="#D7E78A" opacity="0.7" />
          <rect x="43" y="49.5" width="10" height="2.4" rx="1.2" fill="#D7E78A" opacity="0.4" />
        </g>
        <g>
          <rect x="52" y="58" width="30" height="20" rx="4" fill="#182008" stroke="#D7E78A" strokeWidth="1.6" />
          <circle cx="59" cy="65" r="2.8" fill="#D7E78A" />
          <rect x="65" y="62.5" width="14" height="2.4" rx="1.2" fill="#EFF6C8" opacity="0.85" />
          <rect x="65" y="67.5" width="10" height="2.4" rx="1.2" fill="#EFF6C8" opacity="0.5" />
        </g>

        {/* combined node at the end of the path */}
        <circle cx="82" cy="72" r="4.5" fill="#AFC34A" />
        <circle cx="82" cy="72" r="8" fill="none" stroke="#AFC34A" strokeWidth="1" opacity="0.4" />
      </svg>
    </div>
  );
}
