import { createContext, useCallback, useContext, useMemo } from "react";
import { ODDS_FORMATS } from "@shared/playerSettings";
import { cn } from "@/lib/utils";
import { usePlayerSettings } from "@/lib/usePlayerSettings.jsx";

const OddsCtx = createContext(null);

function gcd(a, b) { return b ? gcd(b, a % b) : a; }

function decimalToFraction(dec) {
  const x = dec - 1;
  let best = { p: 1, q: 1, err: Infinity };
  for (let q = 1; q <= 50; q++) {
    const p = Math.round(x * q);
    if (p <= 0) continue;
    const err = Math.abs(x - p / q);
    if (err < best.err - 1e-9) best = { p, q, err };
    if (err < 1e-9) break;
  }
  const g = gcd(best.p, best.q) || 1;
  return `${best.p / g}/${best.q / g}`;
}

export function formatOdds(dec, format) {
  if (format === "american") {
    return dec >= 2 ? `+${Math.round((dec - 1) * 100)}` : `−${Math.round(100 / (dec - 1))}`;
  }
  if (format === "fractional") return decimalToFraction(dec);
  return dec.toFixed(2);
}

// Odds format is a stored player setting now, not a local-only key — it follows
// the wallet across devices (see lib/usePlayerSettings.jsx). No state of its
// own: this is a view over one field of the settings store, which already
// validates the value against ODDS_FORMATS on the way in and out.
export function OddsFormatProvider({ children }) {
  const { settings, updateGroup } = usePlayerSettings();
  const format = settings.preferences.oddsFormat;

  const setFormat = useCallback((next) => {
    if (!ODDS_FORMATS.includes(next)) return;
    updateGroup("preferences", { oddsFormat: next });
  }, [updateGroup]);

  const value = useMemo(() => ({ format, setFormat, fmtOdds: (d) => formatOdds(d, format) }), [format, setFormat]);
  return <OddsCtx.Provider value={value}>{children}</OddsCtx.Provider>;
}

export function useOddsFormat() {
  return useContext(OddsCtx) ?? { format: "decimal", setFormat: () => {}, fmtOdds: (d) => d.toFixed(2) };
}

const OPTIONS = [
  { id: "decimal", label: "Dec" },
  { id: "fractional", label: "Frac" },
  { id: "american", label: "US" },
];

export function OddsFormatToggle({ className }) {
  const { format, setFormat } = useOddsFormat();
  return (
    <div className={cn("flex shrink-0 items-center gap-0.5 rounded-lg bg-secondary/60 p-0.5", className)}>
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          onClick={() => setFormat(o.id)}
          aria-label={`Show odds as ${o.label}`}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-medium transition-[color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            format === o.id ? "bg-background text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
