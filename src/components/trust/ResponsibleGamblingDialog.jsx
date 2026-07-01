import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Check } from "lucide-react";
import { toast } from "@/lib/toast";

const KEY = "polaris_rg";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* ignore */ } };

const REALITY = [15, 30, 60];
const BREAKS = [{ label: "24 hours", h: 24 }, { label: "7 days", h: 168 }, { label: "30 days", h: 720 }];

export function ResponsibleGamblingDialog({ open, onClose }) {
  const [rg, setRg] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => { if (open) { setRg(load()); setSaved(false); } }, [open]);

  const set = (k, v) => setRg((r) => ({ ...r, [k]: v }));
  const persist = (next) => { save(next); setRg(next); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const onSaveLimits = () => { persist({ ...rg }); toast.success("Limits saved"); };
  const takeBreak = (h) => { persist({ ...rg, breakUntil: Date.now() + h * 3600e3 }); toast.info("Break scheduled"); };

  const breakActive = rg.breakUntil && rg.breakUntil > Date.now();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--success)]" /> Responsible gambling</DialogTitle>
          <DialogDescription>Set limits to stay in control. Demo — not enforced.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Limits</div>
          <Field label="Daily deposit limit" value={rg.deposit} onChange={(v) => set("deposit", v)} />
          <Field label="Daily loss limit" value={rg.loss} onChange={(v) => set("loss", v)} />
          <Field label="Session time limit (min)" value={rg.session} onChange={(v) => set("session", v)} prefix="" />
          <Button size="sm" className="mt-1 w-full bg-[var(--global-cta)] font-bold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)]" onClick={onSaveLimits}>
            {saved ? <><Check className="size-4" /> Saved</> : "Save limits"}
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reality check reminder</div>
          <div className="flex gap-2">
            {REALITY.map((m) => (
              <button
                key={m}
                onClick={() => persist({ ...rg, reality: m })}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition ${rg.reality === m ? "border-[var(--global-cta-soft-border)] bg-[var(--global-cta-soft-bg)] text-[var(--global-cta)]" : "border-border bg-muted/30 text-muted-foreground hover:text-foreground"}`}
              >
                {m} min
              </button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Take a break</div>
          {breakActive ? (
            <div className="rounded-lg border border-[var(--warning)]/40 bg-[var(--warning-bg)] p-2.5 text-sm text-[var(--warning)]">
              Break active until {new Date(rg.breakUntil).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </div>
          ) : (
            <div className="flex gap-2">
              {BREAKS.map((b) => (
                <button
                  key={b.h}
                  onClick={() => takeBreak(b.h)}
                  className="flex-1 rounded-lg border border-border bg-muted/30 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {b.label}
                </button>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Need more help? Reach out via the Gambling Helpline.</p>
        </div>

        {(rg.deposit || rg.loss || rg.session || rg.reality) && (
          <div className="flex flex-wrap gap-1.5">
            {rg.deposit ? <Badge variant="outline" className="text-[var(--success)]">Deposit ${rg.deposit}/day</Badge> : null}
            {rg.loss ? <Badge variant="outline" className="text-[var(--success)]">Loss ${rg.loss}/day</Badge> : null}
            {rg.session ? <Badge variant="outline" className="text-[var(--success)]">{rg.session}m session</Badge> : null}
            {rg.reality ? <Badge variant="outline" className="text-[var(--success)]">Check every {rg.reality}m</Badge> : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onChange, prefix = "$" }) {
  return (
    <div className="flex items-center gap-2">
      <label className="flex-1 text-sm text-muted-foreground">{label}</label>
      <div className="flex w-28 items-center rounded-md border bg-background px-2">
        {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type="number" min={0} value={value ?? ""} placeholder="—"
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value ? Math.max(0, +e.target.value) : "")}
          className="h-8 border-0 bg-transparent px-1.5 font-mono tabular-nums shadow-none focus-visible:ring-0"
        />
      </div>
    </div>
  );
}
