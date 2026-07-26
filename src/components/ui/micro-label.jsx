import { cn } from "@/lib/utils";

// THE one small uppercase "top badge" component in the app — WELCOME
// OFFER, LIVE NOW, PROVABLY FAIR, WALLET CONNECTED, FEATURED, NEW, HOT,
// LIMITED, VIP, "Tribet Originals", etc. all render through this, so they
// share the exact same font, weight, size, letter-spacing, height,
// radius, background, padding, vertical alignment, opacity and text
// transform. Previously each of these was a separate one-off className
// string (different radius, different background, different case,
// different font) — see the CTA/label-consistency pass.
//
// Neutral by default (--surface-2/--ink-high) — never arena-tinted unless
// the label's actual job is identifying an arena (pass `tone="accent"` for
// that rare case, e.g. a game's own accent-colored badge).
export function MicroLabel({ children, tone = "neutral", className }) {
  return (
    <span
      className={cn(
        "inline-block px-[9px] py-1 font-mono text-[10px] font-medium uppercase tracking-[.14em] whitespace-nowrap",
        tone === "neutral" && "bg-[var(--surface-2)] text-[var(--ink-high)]",
        tone === "accent" && "bg-[var(--product-soft)] text-[var(--product-accent-text)]",
        className
      )}
      style={{ borderRadius: "var(--radius-xs)", borderTop: "1px solid rgba(255,255,255,.03)", borderBottom: "1px solid rgba(0,0,0,.5)" }}
    >
      {children}
    </span>
  );
}
