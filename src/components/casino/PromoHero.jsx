import { useState, useEffect } from "react";
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
    <div className="relative overflow-hidden rounded-2xl border border-[var(--casino-primary-border)]">
      <div
        className="relative p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(120% 150% at 16% 18%, rgba(184,92,142,0.24), transparent 55%), linear-gradient(135deg, #1B1017 0%, #120D12 100%)",
        }}
      >
        <div className="relative max-w-md">
          <span className="inline-block rounded-full bg-[var(--casino-primary-soft)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--casino-text-accent)]">
            {promo.eyebrow}
          </span>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{promo.title}</h2>
          <p className="mt-1.5 text-sm text-white/85">{promo.body}</p>
          <button className="mt-4 rounded-lg bg-[var(--casino-primary)] px-5 py-2 text-sm font-bold text-white transition hover:bg-[var(--casino-primary-hover)]">
            {promo.cta}
          </button>
        </div>
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
