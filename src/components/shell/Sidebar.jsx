import { Dices, TrendingUp, Volleyball as SoccerBall } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const PRODUCTS = [
  { id: "casino", label: "Casino", icon: Dices },
  { id: "predictions", label: "Predictions", icon: TrendingUp },
  { id: "sports", label: "Sports", icon: SoccerBall },
];

// Subtle per-product accents (no left bar) — tint + tinted text only.
// Each product keeps its OWN colour even when another product is active.
const ACCENTS = {
  casino: {
    tab: { background: "rgba(184,92,142,0.12)", color: "#D99AB9", border: "1px solid rgba(184,92,142,0.42)" },
    item: { background: "rgba(184,92,142,0.16)", color: "#D99AB9" },
  },
  predictions: {
    tab: { background: "rgba(79,167,184,0.12)", color: "#92D4DF", border: "1px solid rgba(79,167,184,0.42)" },
    item: { background: "rgba(79,167,184,0.16)", color: "#92D4DF" },
  },
  sports: {
    tab: { background: "rgba(175,195,74,0.12)", color: "#D7E78A", border: "1px solid rgba(175,195,74,0.42)" },
    item: { background: "rgba(175,195,74,0.16)", color: "#D7E78A" },
  },
};

function ItemIcon({ icon }) {
  if (!icon) return <span className="size-4" />;
  if (typeof icon === "string") return <span className="grid size-4 place-items-center text-sm">{icon}</span>;
  const Icon = icon;
  return <Icon className="size-4" />;
}

function SidebarContent({ product, setProduct, items, selected, onSelect }) {
  const accent = ACCENTS[product];
  return (
    <div className="p-3">
      {/* product row */}
      <div className="mb-1 flex gap-1.5">
        {PRODUCTS.map((p) => {
          const Icon = p.icon;
          const active = product === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setProduct(p.id)}
              style={active ? ACCENTS[p.id].tab : undefined}
              className={cn(
                // Fixed height + no-wrap so the active/bold state can never change the row height (no layout jump).
                "flex h-[54px] flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg border border-transparent px-1 text-[11px] transition-[color,background-color,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "font-medium" : "bg-secondary/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="my-2 border-t" />

      {/* contextual menu (no header — the product tab is the header) */}
      <div className="space-y-0.5">
        {items.map((it) =>
          it.divider ? (
            <div key={it.id} className="my-2 border-t" />
          ) : (
            <button
              key={it.id}
              onClick={() => onSelect(it.id)}
              style={selected === it.id ? accent.item : undefined}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === it.id
                  ? "font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              <ItemIcon icon={it.icon} />
              <span className="truncate">{it.label}</span>
              {it.live > 0 && (
                <Badge variant="outline" className="ml-auto gap-1 border-[rgba(214,90,112,0.42)] px-1.5 text-[#E8758B]">
                  <span className="size-1.5 rounded-full bg-[#D65A70]" />{it.live}
                </Badge>
              )}
            </button>
          )
        )}
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, product, setProduct, items, selected, onSelect }) {
  const content = (
    <SidebarContent
      product={product} setProduct={setProduct}
      items={items} selected={selected} onSelect={onSelect}
    />
  );
  return (
    <>
      {/* desktop inline rail */}
      <aside
        className={cn(
          "hidden shrink-0 border-r bg-sidebar transition-all lg:block lg:overflow-y-auto",
          open ? "lg:w-60" : "lg:w-0 lg:overflow-hidden lg:border-r-0"
        )}
      >
        {content}
      </aside>

      {/* mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={onClose} />
          <aside className="absolute left-0 top-0 h-full w-64 overflow-y-auto border-r bg-sidebar">{content}</aside>
        </div>
      )}
    </>
  );
}
