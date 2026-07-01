import { Dices, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const PRODUCTS = [
  { id: "casino", label: "Casino", icon: Dices, color: "#D99AB9" },
  { id: "predictions", label: "Predictions", icon: TrendingUp, color: "#92D4DF" },
  { id: "sports", label: "Sports", icon: Trophy, color: "#D7E78A" },
];

// Static bar (last item in the app's flex column) — never `fixed`, so iOS Safari's
// collapsing toolbar can't make it float. Only shown on mobile.
export function MobileProductBar({ product, setProduct }) {
  return (
    <nav className="flex shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
      {PRODUCTS.map((p) => {
        const Icon = p.icon;
        const active = product === p.id;
        return (
          <button
            key={p.id}
            onClick={() => setProduct(p.id)}
            style={active ? { color: p.color } : undefined}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              active ? "font-medium" : "text-muted-foreground"
            )}
          >
            <Icon className="size-5" />
            {p.label}
          </button>
        );
      })}
    </nav>
  );
}
