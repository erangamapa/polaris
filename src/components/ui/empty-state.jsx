import { cn } from "@/lib/utils";

// Generic "nothing saved here yet" block — icon + title + optional
// supporting text + optional CTA, in one compact card centered within
// whatever content column it sits in. Introduced for Casino's Favorites
// empty state, but deliberately generic (no Favorites-specific copy or
// wiring baked in) so a future saved-content destination — saved bets in
// Sports, saved markets in Predictions — can reuse the exact same shape
// instead of hand-rolling another dashed-border card.
export function EmptyState({ icon, title, description, cta, className }) {
  return (
    <div className={cn("mx-auto flex max-w-sm flex-col items-center rounded-xl border border-dashed border-white/10 px-6 py-10 text-center", className)}>
      {icon && <div className="mb-3 grid size-12 shrink-0 place-items-center rounded-full bg-white/5">{icon}</div>}
      <p className="text-sm font-medium text-zinc-200">{title}</p>
      {description && <p className="mt-1 text-sm text-zinc-500">{description}</p>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
