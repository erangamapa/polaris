import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LifeBuoy, ChevronRight } from "lucide-react";

const TOPICS = [
  { label: "Understanding game credits", href: "/help.html#game-modes" },
  { label: "Wallets, coins and networks", href: "/help.html#wallets" },
  { label: "Responsible play and account limits", href: "/help.html#responsible-play" },
];

export function SupportDialog({ open, onClose, onCloseAutoFocus }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LifeBuoy className="size-4 text-[var(--global-cta-hover)]" /> Help &amp; support</DialogTitle>
          <DialogDescription>Read our game and wallet guide. Live support and monitored tickets are not available yet.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Popular topics</div>
          {TOPICS.map((t) => (
            <a key={t.href} href={t.href} className="flex w-full items-center gap-2 rounded-lg border bg-card p-2.5 text-left text-sm transition hover:border-ring/40">
              {t.label}
              <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>

      </DialogContent>
    </Dialog>
  );
}
