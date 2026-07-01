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
    <div className="relative overflow-hidden rounded-2xl">
      <div className={`relative bg-gradient-to-br ${promo.hue} p-6 sm:p-8`}>
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative max-w-md">
          <span className="inline-block rounded-full bg-black/25 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/90">
            {promo.eyebrow}
          </span>
          <h2 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{promo.title}</h2>
          <p className="mt-1.5 text-sm text-white/85">{promo.body}</p>
          <button className="mt-4 rounded-lg bg-white px-5 py-2 text-sm font-bold text-zinc-950 transition hover:bg-white/90">
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
