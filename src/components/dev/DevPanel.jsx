import { useEffect, useRef, useState } from "react";
import { X, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { useDevMockState, setDevMockState, resetDevMockState, closeDevPanel } from "@/lib/devMock";
import { useDevPanelShortcut } from "@/lib/useDevPanelShortcut";

// Internal Developer Panel — Shift+D toggles it (see useDevPanelShortcut),
// dev-only end to end: this whole module is only ever imported by App.jsx
// behind the same guard the component itself checks below, and every
// mutator in lib/devMock.js no-ops outside dev — so even a stray import
// path could never make this visible or active in a production build (see
// DEV-ONLY REQUIREMENT).
//
// A non-modal complementary region, not a Dialog — the whole point is to
// keep testing the app *while* the panel is open (see PANEL DEV
// INTERACTION: "panel can remain open while testing the app where
// practical"), so it deliberately does NOT trap focus or make the
// background inert. Focus management is handled by hand instead (see the
// effect below) since there's no Radix Dialog doing it for us this time.
export function DevPanel() {
  useDevPanelShortcut();
  const mock = useDevMockState();
  const open = import.meta.env.DEV && mock.panelOpen;

  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (open) {
      lastFocusedRef.current = document.activeElement;
      // One frame so the panel has actually mounted/painted before we try
      // to focus into it.
      requestAnimationFrame(() => closeButtonRef.current?.focus());
    } else if (lastFocusedRef.current && document.contains(lastFocusedRef.current)) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [open]);

  if (!import.meta.env.DEV) return null;
  if (!open) return null;

  const set = (patch) => setDevMockState(patch);

  const noop = () => {};
  const toastButtons = [
    { label: "Success", cls: "text-[#49B889]", fn: () => toast.success("Bet placed", { message: "#B7F3K · $10 → $21.00" }) },
    { label: "Error", cls: "text-[#D65A70]", fn: () => toast.error("Insufficient balance", { message: "Add funds to place this bet." }) },
    { label: "Warning", cls: "text-[#D6A84A]", fn: () => toast.warning("Odds changed", { message: "Arsenal 2.10 → 2.05", action: { label: "Accept & place", onClick: noop } }) },
    { label: "Info", cls: "text-[#4FA7B8]", fn: () => toast.info("Verify to withdraw", { message: "KYC required before cashing out.", action: { label: "Verify now", onClick: noop } }) },
  ];

  return (
    <aside
      ref={panelRef}
      role="complementary"
      aria-label="Developer Panel"
      className="tribet-scrollbar fixed inset-y-0 right-0 z-[var(--z-critical-alert)] flex w-[340px] max-w-[92vw] flex-col overflow-y-auto border-l border-[#3a3b42] bg-[#1a1b1f] text-foreground shadow-[-8px_0_28px_rgba(0,0,0,0.45)]"
    >
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-[#3a3b42] bg-[#1a1b1f] px-3 py-3">
        <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Dev</span>
        <h2 className="text-sm font-bold">Developer Panel</h2>
        <button
          ref={closeButtonRef}
          onClick={closeDevPanel}
          aria-label="Close Developer Panel"
          className="ms-auto grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 space-y-5 px-3 py-3">
        <Section title="User">
          <Segmented
            value={mock.authStatus}
            onChange={(v) => set({ authStatus: v })}
            options={[
              { value: "default", label: "Default" },
              { value: "logged-out", label: "Logged out" },
              { value: "logged-in", label: "Logged in" },
              { value: "session-expired", label: "Expired" },
            ]}
            groupLabel="User auth status"
          />
        </Section>

        <Section title="Wallet">
          <Segmented
            value={mock.walletStatus}
            onChange={(v) => set({ walletStatus: v })}
            options={[
              { value: "default", label: "Default" },
              { value: "disconnected", label: "Disconnected" },
              { value: "connecting", label: "Connecting" },
              { value: "connected", label: "Connected" },
              { value: "wrong-network", label: "Wrong network" },
            ]}
            groupLabel="Wallet connection status"
          />
        </Section>

        <Section title="Balance">
          <Segmented
            value={mock.balancePreset}
            onChange={(v) => set({ balancePreset: v })}
            options={[
              { value: "default", label: "Default" },
              { value: "zero", label: "Zero" },
              { value: "normal", label: "Normal" },
              { value: "large", label: "Large" },
              { value: "tiny", label: "Tiny decimal" },
              { value: "loading", label: "Loading" },
              { value: "syncing", label: "Syncing" },
              { value: "stale", label: "Stale" },
              { value: "error", label: "Error" },
            ]}
            groupLabel="Balance preset"
          />
        </Section>

        <Section title="Platform Scope">
          <Segmented
            value={mock.platformScope}
            onChange={(v) => set({ platformScope: v })}
            options={[
              { value: "mvp", label: "MVP" },
              { value: "full", label: "Full" },
            ]}
            groupLabel="Platform scope"
          />
          <p className="text-xs text-muted-foreground">
            {mock.platformScope === "mvp"
              ? "Casino only. Sports and Predictions are marked Coming soon."
              : "Casino, Predictions and Sports are available."}
          </p>
        </Section>

        <Section title="Casino">
          <Field label="Favorites">
            <Segmented
              value={mock.favoritesPreset}
              onChange={(v) => set({ favoritesPreset: v })}
              options={[
                { value: "default", label: "Default" },
                { value: "empty", label: "Empty" },
                { value: "populated", label: "Populated" },
              ]}
              groupLabel="Favorites preset"
            />
          </Field>
          <Field label="Recently played">
            <Segmented
              value={mock.recentlyPlayedPreset}
              onChange={(v) => set({ recentlyPlayedPreset: v })}
              options={[
                { value: "default", label: "Default" },
                { value: "empty", label: "Empty" },
                { value: "populated", label: "Populated" },
              ]}
              groupLabel="Recently played preset"
            />
          </Field>
          <Field label="Game state" htmlFor="dev-game-state">
            <select
              id="dev-game-state"
              value={mock.gameStatus}
              onChange={(e) => set({ gameStatus: e.target.value })}
              className="w-full rounded-lg border border-[#3a3b42] bg-[#24252b] px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="default">Default</option>
              <option value="loading">Loading</option>
              <option value="provider-error">Provider error</option>
              <option value="maintenance">Maintenance</option>
              <option value="region-restricted">Region restricted</option>
              <option value="insufficient-balance">Insufficient balance</option>
            </select>
          </Field>
        </Section>

        <Section title="Transactions">
          <Field label="Latest activity entry" htmlFor="dev-transaction-status">
            <select
              id="dev-transaction-status"
              value={mock.transactionStatus}
              onChange={(e) => set({ transactionStatus: e.target.value })}
              className="w-full rounded-lg border border-[#3a3b42] bg-[#24252b] px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="none">None</option>
              <option value="deposit-pending">Deposit pending</option>
              <option value="deposit-confirmed">Deposit confirmed</option>
              <option value="withdrawal-pending">Withdrawal pending</option>
              <option value="withdrawal-failed">Withdrawal failed</option>
              <option value="bet-won">Bet won</option>
              <option value="bet-lost">Bet lost</option>
            </select>
          </Field>
        </Section>

        <Section title="System">
          <Checkbox
            label="Slow network (BetHistoryDialog API calls)"
            checked={mock.slowNetwork}
            onChange={(v) => set({ slowNetwork: v })}
          />
          <Checkbox
            label="Force API error (BetHistoryDialog API calls)"
            checked={mock.forceApiError}
            onChange={(v) => set({ forceApiError: v })}
          />
        </Section>

        <Section title="Toasts">
          <div className="grid grid-cols-2 gap-1.5">
            {toastButtons.map((b) => (
              <button
                key={b.label}
                onClick={b.fn}
                className={cn("rounded-lg border border-[#3a3b42] bg-[#24252b] py-1.5 text-xs font-medium transition hover:bg-[#2c2d33]", b.cls)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-[#3a3b42] bg-[#1a1b1f] p-3">
        <button
          onClick={resetDevMockState}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#3a3b42] bg-[#24252b] py-2 text-sm font-medium text-muted-foreground transition hover:bg-[#2c2d33] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RotateCcw className="size-4" aria-hidden="true" /> Reset all
        </button>
      </div>
    </aside>
  );
}

function Section({ title, children }) {
  return (
    <section aria-labelledby={`dev-section-${title}`} className="space-y-2">
      <h3 id={`dev-section-${title}`} className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="space-y-1">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="block text-xs text-muted-foreground">{label}</label>
      ) : (
        <span className="block text-xs text-muted-foreground">{label}</span>
      )}
      {children}
    </div>
  );
}

function Segmented({ value, onChange, options, groupLabel }) {
  return (
    <div role="radiogroup" aria-label={groupLabel} className="flex flex-wrap gap-1">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "border-[var(--global-cta)] bg-[var(--global-cta)]/15 text-[var(--global-cta)]"
                : "border-[#3a3b42] bg-[#24252b] text-muted-foreground hover:bg-[#2c2d33] hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 rounded border-[#3a3b42] accent-[var(--global-cta)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {label}
    </label>
  );
}
