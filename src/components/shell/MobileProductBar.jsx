import { useEffect, useState } from "react";
import { Dices, TrendingUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const PRODUCTS = [
  { id: "casino", label: "Casino", icon: Dices, color: "#5eead4" },
  { id: "predictions", label: "Predictions", icon: TrendingUp, color: "#c4b5fd" },
  { id: "sports", label: "Sports", icon: Trophy, color: "#fcd34d" },
];

// Tags that bring up the iOS keyboard — hide the bar while one is focused.
const TYPING = new Set(["INPUT", "TEXTAREA", "SELECT"]);

export function MobileProductBar({ product, setProduct }) {
  const [keyboard, setKeyboard] = useState(false);

  useEffect(() => {
    const onFocusIn = (e) => { if (TYPING.has(e.target?.tagName)) setKeyboard(true); };
    const onFocusOut = () => setKeyboard(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 flex border-t bg-background pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-200 lg:hidden",
        keyboard && "translate-y-full"
      )}
    >
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
