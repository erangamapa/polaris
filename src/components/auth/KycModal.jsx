// Intentionally dormant, not dead code — do not delete without updating
// docs/architecture/10-frontend-integration.md and 13-security-compliance.md
// first. This app's testnet build has no real KYC/identity-verification
// backend and collects no PII (see 13-security-compliance.md: "Mainnet
// compliance — gaming licence, KYC/AML, geoblocking — is out of scope" /
// "No KYC/PII collected in the testnet build"), so this component is never
// imported or rendered anywhere today. 10-frontend-integration.md's own
// component-mapping table explicitly calls this out as "dormant
// (mainnet-only)" and says to "keep the component dormant for later" — a
// deliberate placeholder for a possible future mainnet phase, unlike
// AuthModal.jsx/AccountDialog.jsx/lib/session.js (the other files that used
// to live alongside this one), which that same doc explicitly marked
// "removed"/superseded and which were deleted in this cleanup pass.
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check, Upload, ShieldCheck } from "lucide-react";

const COUNTRIES = ["United States", "United Kingdom", "Canada", "Germany", "Brazil", "Japan", "Other"];

export function KycModal({ open, onClose, onVerified }) {
  const [step, setStep] = useState("form"); // form | verifying | done
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");

  const reset = () => { setStep("form"); setName(""); setDob(""); setCountry(""); setError(""); };

  const submit = () => {
    if (!name.trim() || !dob || !country) return setError("Fill in all fields to verify.");
    setStep("verifying");
    setTimeout(() => setStep("done"), 1600);
    setTimeout(() => { onVerified(); reset(); }, 2600);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), reset())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShieldCheck className="size-4 text-[var(--success)]" /> Verify your identity</DialogTitle>
          <DialogDescription>Required to use the wallet — deposits and withdrawals.</DialogDescription>
        </DialogHeader>

        {step === "form" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Full legal name</label>
              <Input value={name} onChange={(e) => { setName(e.target.value); setError(""); }} placeholder="As on your ID" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Date of birth</label>
              <Input type="date" value={dob} onChange={(e) => { setDob(e.target.value); setError(""); }} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Country</label>
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value); setError(""); }}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="" disabled>Select country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <Upload className="size-4" /> Upload ID document (demo — no file needed)
            </div>
            {error && <p className="text-[11px] text-[var(--danger)]">{error}</p>}
            <Button className="w-full font-bold" onClick={submit}>
              Submit for verification
            </Button>
            <p className="text-[10px] text-muted-foreground">Demo — no documents are stored or checked.</p>
          </div>
        )}

        {step === "verifying" && (
          <div className="grid place-items-center gap-3 py-8 text-center">
            <Loader2 className="size-8 animate-spin text-[var(--success)]" />
            <p className="text-sm text-muted-foreground">Verifying your details…</p>
          </div>
        )}

        {step === "done" && (
          <div className="grid place-items-center gap-3 py-8 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[var(--success)] text-[#06110E]"><Check className="size-6" /></span>
            <p className="text-sm font-medium">You're verified</p>
            <p className="text-xs text-muted-foreground">Opening your wallet…</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
