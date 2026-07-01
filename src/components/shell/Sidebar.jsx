import { Dices, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const PRODUCTS = [
  { id: "casino", label: "Casino", icon: Dices },
  { id: "predictions", label: "Predictions", icon: TrendingUp },
  { id: "sports", label: "Sports", icon: Trophy },
];

// Subtle per-product accents (no left bar) — tint + tinted text only.
const ACCENTS = {
  casino: {
    tab: { background: "rgba(16,185,129,0.12)", color: "#5eead4" },
    item: { background: "rgba(16,185,129,0.10)", color: "#d7fbf0" },
  },
  predictions: {
    tab: { background: "rgba(139,124,246,0.14)", color: "#c4b5fd" },
    item: { background: "rgba(139,124,246,0.12)", color: "#e7e0ff" },
  },
  sports: {
    tab: { background: "rgba(245,158,11,0.13)", color: "#fcd34d" },
    item: { background: "rgba(245,158,11,0.11)", color: "#fde9c8" },
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
                "flex h-[54px] flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-lg px-1 text-[11px] transition-[color,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
                <Badge variant="outline" className="ml-auto gap-1 border-rose-500/40 px-1.5 text-rose-400">
                  <span className="size-1.5 rounded-full bg-rose-500" />{it.live}
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
          "hidden shrink-0 border-r bg-sidebar transition-all lg:block",
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
