import { useEffect, useRef, useState } from "react";
import { CircleCheck, CircleX, TriangleAlert, Info, X } from "lucide-react";
import { toast, useToasts } from "@/lib/toast";
import { cn } from "@/lib/utils";

// THEME READINESS: these used to hardcode the same hex the shared
// --success/--warning/--danger/--info status tokens (index.css) already
// define — including "info" duplicating the CURRENT Predictions branch
// accent's exact value, an accidental coupling that would have silently
// recolored every info toast the day Predictions' branch color changes.
// Referencing the tokens by name breaks that coupling.
const CFG = {
  success: { Icon: CircleCheck, color: "var(--success)", tint: "var(--success-bg)" },
  error: { Icon: CircleX, color: "var(--danger)", tint: "var(--danger-bg)" },
  warning: { Icon: TriangleAlert, color: "var(--warning)", tint: "var(--warning-bg)" },
  info: { Icon: Info, color: "var(--info)", tint: "var(--info-bg)" },
};

function ToastCard({ t, leaving }) {
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
      onMouseEnter={!sticky && !leaving ? pause : undefined}
      onMouseLeave={!sticky && !leaving ? resume : undefined}
      data-state="open"
      aria-hidden={leaving || undefined}
      // RESKIN v2: was hardcoded #3a3b42/#24252b (a stale literal that
      // predates the token pass, never picked up the surface-3/border-
      // interactive tokens) plus a private shadow value — toast is one of
      // the guide's own two named shadow exceptions (§4), so it now shares
      // --elevation-high with Dev Panel instead of duplicating the number.
      className={cn(
        "w-full max-w-sm overflow-hidden rounded-xl border border-[var(--border-interactive)] bg-[var(--surface-interactive)] duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
        leaving ? "toast-leaving pointer-events-none" : "pointer-events-auto"
      )}
      style={{ boxShadow: "var(--elevation-high)" }}
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

// MOTION QUALITY PASS — the store (lib/toast.jsx) removes a dismissed toast
// from `list` immediately; rendering that removal as an instant list-splice
// made every toast below the dismissed one snap up into the gap in the same
// frame. This keeps a locally-rendered superset of `list` (`rendered`):
// items still in `list` render normally, and an id that just DROPPED OUT of
// `list` is kept mounted one extra beat with `.toast-leaving` (fade + small
// upward settle, see index.css) before finally being dropped from local
// state — the store itself needs no change, this is purely a render-timing
// buffer around it.
const TOAST_LEAVE_MS = 130;

export function Toaster() {
  const list = useToasts();
  const [rendered, setRendered] = useState(list);
  const leavingRef = useRef(new Set());
  const timersRef = useRef(new Map());

  useEffect(() => {
    const currentIds = new Set(list.map((t) => t.id));
    const stillRendered = rendered.filter((t) => currentIds.has(t.id) || leavingRef.current.has(t.id));
    // New items from the store that aren't rendered yet.
    const incoming = list.filter((t) => !stillRendered.some((r) => r.id === t.id));
    // Items present a moment ago but now gone from the store: mark leaving
    // (once) and schedule their real removal.
    for (const t of stillRendered) {
      if (!currentIds.has(t.id) && !leavingRef.current.has(t.id)) {
        leavingRef.current.add(t.id);
        const timer = setTimeout(() => {
          leavingRef.current.delete(t.id);
          timersRef.current.delete(t.id);
          setRendered((prev) => prev.filter((r) => r.id !== t.id));
        }, TOAST_LEAVE_MS);
        timersRef.current.set(t.id, timer);
      }
    }
    setRendered([...incoming, ...stillRendered]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]);

  useEffect(() => () => { for (const timer of timersRef.current.values()) clearTimeout(timer); }, []);

  if (!rendered.length) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-16 z-[var(--z-critical-alert)] flex flex-col items-center gap-2 px-4"
    >
      {rendered.map((t) => <ToastCard key={t.id} t={t} leaving={leavingRef.current.has(t.id)} />)}
    </div>
  );
}
