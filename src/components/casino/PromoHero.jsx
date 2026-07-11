import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PROMOS } from "../../lib/mockData";

export function PromoHero() {
  const [i, setI] = useState(0);
  const count = PROMOS.length;

  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % count), 5000);
    return () => clearInterval(t);
  }, [count]);

  const promo = PROMOS[i];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[var(--casino-primary-border)] bg-[#0C080C]">
      {/* Background layer: per-slide artwork (scaled to fit, right-anchored) or berry fallback. */}
      <div
        key={promo.id}
        className={cn("hero-bg absolute inset-0", promo.image ? "hero-bg--img" : "hero-bg--fallback")}
        style={promo.image ? { backgroundImage: `url(${promo.image})` } : undefined}
      />
      {/* Left→right dark gradient so text stays readable over the artwork. */}
      <div className="hero-overlay pointer-events-none absolute inset-0" />

      {/* Content — kept inside the left ~40%, vertically centred in the taller hero. */}
      <div className="relative flex min-h-[300px] flex-col justify-between gap-6 p-6 sm:p-8 lg:min-h-[340px]">
        <div className="max-w-[min(92%,26rem)] sm:max-w-md">
          <span className="inline-block rounded-full bg-[var(--casino-primary-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--casino-text-accent)]">
            {promo.eyebrow}
          </span>
          <h2 className="mt-3 text-2xl font-black leading-tight text-[#F2F3F5] drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-3xl">{promo.title}</h2>
          <p className="mt-1.5 text-sm text-[#D6D9DF]">{promo.body}</p>
        </div>
        <button className="w-fit rounded-lg bg-[var(--casino-primary)] px-5 py-2 text-sm font-bold text-white transition hover:bg-[var(--casino-primary-hover)] active:bg-[var(--casino-primary-active)]">
          {promo.cta}
        </button>
      </div>

      <div className="absolute bottom-3 right-4 flex gap-1.5">
        {PROMOS.map((p, idx) => (
          <button
            key={p.id}
            onClick={() => setI(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-1.5 rounded-full transition-all ${
              idx === i ? "w-5 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
