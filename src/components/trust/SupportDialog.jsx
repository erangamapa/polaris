import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LifeBuoy, Check, ChevronRight } from "lucide-react";

const TOPICS = [
  "How do deposits and withdrawals work?",
  "Why is my withdrawal pending?",
  "How do I complete verification (KYC)?",
  "Understanding bet settlement & cash-out",
  "Responsible gambling & account limits",
];

export function SupportDialog({ open, onClose, onCloseAutoFocus }) {
  const [caseId, setCaseId] = useState(null);

  const contact = () => setCaseId("#SUP-" + Math.random().toString(36).slice(2, 7).toUpperCase());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), setCaseId(null))}>
      <DialogContent className="max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LifeBuoy className="size-4 text-[var(--global-cta)]" /> Help &amp; support</DialogTitle>
          <DialogDescription>Find an answer or contact our team. Demo — no live agents.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Popular topics</div>
          {TOPICS.map((t) => (
            <button key={t} className="flex w-full items-center gap-2 rounded-lg border bg-card p-2.5 text-left text-sm transition hover:border-ring/40">
              {t}
              <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>

        {caseId ? (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--success)]/40 bg-[var(--success-bg)] p-3 text-sm">
            <Check className="size-4 text-[var(--success)]" />
            <span>Case <span className="font-mono font-medium text-[var(--success)]">{caseId}</span> opened — we'll reply by email.</span>
          </div>
        ) : (
          <Button className="w-full bg-[var(--global-cta)] font-bold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)]" onClick={contact}>
            Contact support
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
