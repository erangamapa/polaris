import { cn } from "@/lib/utils";
import { BRAND_NAME } from "@/lib/brand";

// THE one Tribet brand mark — a solid rounded-square tile filled with the
// single Tribet brand colour (--brand-logo), a centered white glyph, no
// split colors, no gradient, no glow, no shadow. Use this everywhere the
// app needs the brand icon rather than re-implementing the tile — same
// dimensions/radius/typography wherever it appears, so the mark reads
// identically in the header, the collapsed sidebar, or anywhere else.
export function LogoMark({ className }) {
  return (
    <div
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-logo)] font-black text-[var(--brand-logo-text)] transition-colors duration-150 hover:bg-[var(--brand-logo-hover)]",
        className
      )}
      aria-hidden="true"
    >
      {BRAND_NAME[0]}
    </div>
  );
}
