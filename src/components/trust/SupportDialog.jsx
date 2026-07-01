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

export function SupportDialog({ open, onClose }) {
  const [caseId, setCaseId] = useState(null);

  const contact = () => setCaseId("#SUP-" + Math.random().toString(36).slice(2, 7).toUpperCase());

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (onClose(), setCaseId(null))}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LifeBuoy className="size-4 text-emerald-400" /> Help &amp; support</DialogTitle>
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
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
            <Check className="size-4 text-emerald-400" />
            <span>Case <span className="font-mono font-medium text-emerald-400">{caseId}</span> opened — we'll reply by email.</span>
          </div>
        ) : (
          <Button className="w-full bg-emerald-500 font-bold text-zinc-950 hover:bg-emerald-400" onClick={contact}>
            Contact support
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
