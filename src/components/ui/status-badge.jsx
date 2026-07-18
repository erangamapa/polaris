import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock, Check, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

// One shared, semantic badge for every compact status/count in the product —
// live sports counts, betslip selections, wallet alerts, inbox, Favorites,
// rewards, everything. Colour is semantic (what it means), never arena-based
// (which product surface renders it) — see the --badge-* tokens in
// index.css. The badge owns shape/typography/spacing/animation; the PARENT
// owns positioning (absolute offsets, flex placement, tooltip wiring).
//
// variant: "neutral" | "live" | "attention" | "pending" | "success" | "muted"
// count:   number | undefined — 0 hides the badge; >99 renders "99+"
// label:   string  — a short visible string instead of a count (e.g. a
//          rich live-clock label); takes over the visible slot when count
//          isn't the right fit
// icon:    "dot" | "warning" | "clock" | "check" | "gift"
// size:    "small" | "medium"
// ariaLabel: required — the badge's only announced text; visible content is
//          aria-hidden so nothing is announced twice.

const VARIANT_TOKENS = {
  neutral: { bg: "var(--badge-neutral-bg)", border: "var(--badge-neutral-border)", text: "var(--badge-neutral-text)", accent: "var(--badge-neutral-text)" },
  live: { bg: "var(--badge-live-bg)", border: "var(--badge-live-border)", text: "var(--badge-live-text)", accent: "var(--badge-live-accent)" },
  attention: { bg: "var(--badge-attention-bg)", border: "var(--badge-attention-border)", text: "var(--badge-attention-text)", accent: "var(--badge-attention-accent)" },
  pending: { bg: "var(--badge-pending-bg)", border: "var(--badge-pending-border)", text: "var(--badge-pending-text)", accent: "var(--badge-pending-accent)" },
  success: { bg: "var(--badge-success-bg)", border: "var(--badge-success-border)", text: "var(--badge-success-text)", accent: "var(--badge-success-accent)" },
  muted: { bg: "var(--badge-muted-bg)", border: "var(--badge-muted-border)", text: "var(--badge-muted-text)", accent: "var(--badge-muted-text)" },
};

const ICON_COMPONENTS = { warning: AlertTriangle, clock: Clock, check: Check, gift: Gift };

const SIZE_TOKENS = {
  small: { box: "h-5 min-w-5", text: "text-[11px]", pad: "px-[5px]", gap: "gap-[3px]", iconPx: 9, dotPx: 6 },
  medium: { box: "h-6 min-w-6", text: "text-xs", pad: "px-2", gap: "gap-1", iconPx: 11, dotPx: 7 },
};

// A rapid run of count increases (live polling, ticking totals) pulses at
// most once per window instead of animating on every update.
const PULSE_COOLDOWN_MS = 1200;
const PULSE_DURATION_MS = 180;

export function StatusBadge({
  variant = "neutral",
  count,
  label,
  icon,
  size = "medium",
  showIcon = true,
  ariaLabel,
  className,
  ...rest
}) {
  if (import.meta.env.DEV && !ariaLabel) {
    // eslint-disable-next-line no-console
    console.warn("StatusBadge: `ariaLabel` is required so the badge has contextual meaning, not just a bare number.");
  }

  const hasCount = typeof count === "number";
  const formattedCount = hasCount ? (count > 99 ? "99+" : String(count)) : null;
  const content = label ?? formattedCount;

  // Hooks run unconditionally on every render — the two "nothing to show"
  // cases below return only *after* every hook has been called, so this
  // stays a valid conditional render rather than a conditional hook call.
  const prevCountRef = useRef(count);
  const lastPulseAtRef = useRef(0);
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (hasCount && typeof prevCountRef.current === "number" && count > prevCountRef.current) {
      const now = Date.now();
      if (now - lastPulseAtRef.current >= PULSE_COOLDOWN_MS) {
        lastPulseAtRef.current = now;
        setPulsing(true);
        const t = setTimeout(() => setPulsing(false), PULSE_DURATION_MS);
        prevCountRef.current = count;
        return () => clearTimeout(t);
      }
    }
    prevCountRef.current = count;
  }, [count, hasCount]);

  // 0 hides the badge outright. A `label` (e.g. a live-clock string) isn't a
  // count at all, so it's never gated by count being zero/undefined.
  if (hasCount && count <= 0 && label == null) return null;
  // Never render an empty shell: something visible (count/label) or a
  // semantic icon is required, or there's nothing to show.
  if (content == null && !icon) return null;

  const tone = VARIANT_TOKENS[variant] ?? VARIANT_TOKENS.neutral;
  const s = SIZE_TOKENS[size] ?? SIZE_TOKENS.medium;
  const Icon = icon && icon !== "dot" ? ICON_COMPONENTS[icon] : null;
  const hasVisibleIcon = showIcon && (icon === "dot" || !!Icon);

  return (
    <span
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full border font-semibold leading-none whitespace-nowrap [font-variant-numeric:tabular-nums]",
        s.box,
        s.text,
        content != null ? s.pad : "",
        hasVisibleIcon && content != null ? s.gap : "",
        "motion-safe:transition-transform",
        pulsing && "motion-safe:animate-[status-badge-pulse_180ms_ease-out]",
        className
      )}
      style={{ background: tone.bg, borderColor: tone.border, color: tone.text }}
      {...rest}
    >
      {hasVisibleIcon && icon === "dot" && (
        <span
          aria-hidden="true"
          className="shrink-0 rounded-full"
          style={{ width: s.dotPx, height: s.dotPx, background: tone.accent }}
        />
      )}
      {hasVisibleIcon && Icon && (
        <Icon aria-hidden="true" style={{ width: s.iconPx, height: s.iconPx, color: tone.accent }} />
      )}
      {content != null && <span aria-hidden="true">{content}</span>}
    </span>
  );
}
