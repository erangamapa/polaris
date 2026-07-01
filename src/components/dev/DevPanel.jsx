import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "@/lib/toast";

// Hidden demo tool — press ` (backtick) to toggle. Guarded so it won't fire while typing.
export function DevPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "`") return;
      const el = document.activeElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    const onToggle = () => setOpen((o) => !o); // long-press the logo (mobile)
    window.addEventListener("keydown", onKey);
    window.addEventListener("polaris:dev", onToggle);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("polaris:dev", onToggle);
    };
  }, []);

  if (!open) return null;

  const noop = () => {};
  const btns = [
    { label: "Success", cls: "text-[#49B889]", fn: () => toast.success("Bet placed", { message: "#B7F3K · $10 → $21.00" }) },
    { label: "Error", cls: "text-[#D65A70]", fn: () => toast.error("Insufficient balance", { message: "Add funds to place this bet." }) },
    { label: "Warning", cls: "text-[#D6A84A]", fn: () => toast.warning("Odds changed", { message: "Arsenal 2.10 → 2.05", action: { label: "Accept & place", onClick: noop } }) },
    { label: "Info", cls: "text-[#4FA7B8]", fn: () => toast.info("Verify to withdraw", { message: "KYC required before cashing out.", action: { label: "Verify now", onClick: noop } }) },
    { label: "Sticky", cls: "text-foreground", fn: () => toast.info("Sticky notice", { message: "Stays until you dismiss it.", sticky: true }) },
    { label: "Burst ×3", cls: "text-foreground", fn: () => { toast.success("Deposit credited"); setTimeout(() => toast.warning("Market suspended"), 150); setTimeout(() => toast.info("Welcome back"), 300); } },
  ];

  return (
    <div className="pointer-events-auto fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 z-[60] w-56 rounded-xl border border-[#3a3b42] bg-[#24252b] p-3 shadow-[0_10px_28px_rgba(0,0,0,0.55)] lg:bottom-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dev · toasts</span>
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">`</span>
        <button onClick={() => setOpen(false)} aria-label="Close" className="ml-auto text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {btns.map((b) => (
          <button
            key={b.label}
            onClick={b.fn}
            className={`rounded-lg border border-border bg-muted/30 py-1.5 text-xs font-medium transition hover:bg-muted/60 ${b.cls}`}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
