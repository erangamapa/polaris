import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, TriangleAlert, Info, X } from "lucide-react";
import { toast, useToasts } from "@/lib/toast";

const CFG = {
  success: { Icon: CircleCheck, color: "#49B889", tint: "rgba(73,184,137,0.14)" },
  error: { Icon: CircleX, color: "#D65A70", tint: "rgba(214,90,112,0.14)" },
  warning: { Icon: TriangleAlert, color: "#D6A84A", tint: "rgba(214,168,74,0.14)" },
  info: { Icon: Info, color: "#4FA7B8", tint: "rgba(79,167,184,0.14)" },
};

function ToastCard({ t }) {
  const cfg = CFG[t.type] ?? CFG.info;
  const duration = t.duration ?? (t.type === "error" ? 6000 : 4000);
  const sticky = duration === Infinity || t.sticky;
  const remaining = useRef(duration);
  const startedAt = useRef(0);
  const timer = useRef(null);
  const [paused, setPaused] = useState(false);

  const run = () => { startedAt.current = Date.now(); timer.current = setTimeout(() => toast.dismiss(t.id), remaining.current); };
  const pause = () => { clearTimeout(timer.current); remaining.current -= Date.now() - startedAt.current; setPaused(true); };
  const resume = () => { setPaused(false); run(); };

  useEffect(() => {
    if (!sticky) run();
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Icon = cfg.Icon;
  return (
    <div
      onMouseEnter={!sticky ? pause : undefined}
      onMouseLeave={!sticky ? resume : undefined}
      data-state="open"
      className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl border border-[#3a3b42] bg-[#24252b] shadow-[0_10px_28px_rgba(0,0,0,0.55)] duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2"
    >
      <div className="flex items-start gap-3 p-3">
        <span className="grid size-6 shrink-0 place-items-center rounded-lg" style={{ background: cfg.tint }}>
          <Icon className="size-4" style={{ color: cfg.color }} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{t.title}</div>
          {t.message && <div className="mt-0.5 text-xs text-muted-foreground">{t.message}</div>}
          {t.action && (
            <button
              onClick={() => { t.action.onClick?.(); toast.dismiss(t.id); }}
              className="mt-1 text-xs font-medium"
              style={{ color: cfg.color }}
            >
              {t.action.label} →
            </button>
          )}
        </div>
        <button onClick={() => toast.dismiss(t.id)} aria-label="Dismiss" className="shrink-0 text-muted-foreground transition-colors hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>
      {!sticky && (
        <div
          className="toast-progress"
          style={{ animationDuration: `${duration}ms`, animationPlayState: paused ? "paused" : "running", background: cfg.color, opacity: 0.5 }}
        />
      )}
    </div>
  );
}

export function Toaster() {
  const list = useToasts();
  if (!list.length) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-16 z-[var(--z-critical-alert)] flex flex-col items-center gap-2 px-4"
    >
      {list.map((t) => <ToastCard key={t.id} t={t} />)}
    </div>
  );
}
