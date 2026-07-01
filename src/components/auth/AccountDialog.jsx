import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, LogOut } from "lucide-react";

export function AccountDialog({ open, onClose, user, onVerify, onResponsibleGambling, onLogout }) {
  if (!user) return null;
  const verified = user.verified;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Account</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
          <div className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 font-bold text-zinc-950">
            {user.label?.[0]?.toUpperCase() ?? "U"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{user.label}</div>
            <div className="text-xs capitalize text-muted-foreground">{user.method} account</div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-card p-3">
          <div className="flex items-center gap-2 text-sm">
            {verified ? (
              <><ShieldCheck className="size-4 text-emerald-400" /> Verified</>
            ) : (
              <><ShieldAlert className="size-4 text-amber-400" /> Not verified</>
            )}
          </div>
          {verified ? (
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">KYC complete</Badge>
          ) : (
            <Button size="sm" className="bg-emerald-500 font-bold text-zinc-950 hover:bg-emerald-400" onClick={onVerify}>Verify now</Button>
          )}
        </div>

        {!verified && (
          <p className="text-[11px] text-muted-foreground">Verification is required to deposit or withdraw.</p>
        )}

        {onResponsibleGambling && (
          <Button variant="outline" className="w-full justify-start" onClick={onResponsibleGambling}>
            <ShieldCheck className="size-4" /> Responsible gambling
          </Button>
        )}
        <Button variant="outline" className="w-full" onClick={onLogout}>
          <LogOut className="size-4" /> Log out
        </Button>
      </DialogContent>
    </Dialog>
  );
}
