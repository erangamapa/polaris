import { cn } from "@/lib/utils";

// Single static hero (no carousel) for Sports / Predictions.
// Themes to the active product via --product-* tokens. Shows a section-tinted
// gradient until `image` is provided, then swaps to full-bleed artwork.
export function SectionHero({ eyebrow, title, body, cta, onCta, image, tint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--product-border)] bg-[#0C080C]">
      <div
        className={cn("hero-bg absolute inset-0", image && "hero-bg--img")}
        style={image ? { backgroundImage: `url(${image})` } : { background: tint }}
      />
      <div className="hero-overlay pointer-events-none absolute inset-0" />

      <div className="relative flex min-h-[300px] flex-col justify-between gap-6 p-6 sm:p-8 lg:min-h-[340px]">
        <div className="max-w-[min(92%,26rem)] sm:max-w-md">
          <span className="inline-block rounded-full bg-[var(--product-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--product-accent-text)]">
            {eyebrow}
          </span>
          <h2 className="mt-3 text-2xl font-black leading-tight text-[#F2F3F5] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-3xl">{title}</h2>
          <p className="mt-1.5 text-sm text-[#D6D9DF]">{body}</p>
        </div>
        {cta && (
          <button
            onClick={onCta}
            className="w-fit rounded-lg bg-[var(--product-primary)] px-5 py-2 text-sm font-bold text-[var(--product-cta-text)] transition hover:bg-[var(--product-primary-hover)] active:bg-[var(--product-primary-active)]"
          >
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}
