import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Check, Copy, Loader2, ShieldCheck } from "lucide-react";
import { fmt } from "@/lib/format";
import { useCurrency } from "@/lib/currency";
import { toast } from "@/lib/toast";
import {
  ASSETS, DEPOSIT_STAGES, WITHDRAW_STAGES, WITHDRAW_FEE, MIN_WITHDRAW, txHash, nowLabel,
} from "@/lib/walletData";

function StageTracker({ stages, current }) {
  return (
    <div className="space-y-1.5">
      {stages.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex items-center gap-2 text-sm">
            <span className={`grid size-5 place-items-center rounded-full ${done ? "bg-[var(--success)] text-[#06110E]" : active ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-secondary text-muted-foreground"}`}>
              {done ? <Check className="size-3" /> : active ? <Loader2 className="size-3 animate-spin" /> : <span className="size-1.5 rounded-full bg-current" />}
            </span>
            <span className={`capitalize ${active ? "font-medium" : done ? "text-muted-foreground" : "text-muted-foreground/60"}`}>{s}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-mono tabular-nums ${accent ? "font-semibold text-[var(--success)]" : ""}`}>{value}</span>
    </div>
  );
}

export function WalletDialog({ open, onClose, initialTab = "deposit", balance, inPlay, pending, txns, setBalance, setPending, pushTxn }) {
  const { fmtMoney } = useCurrency();
  const [tab, setTab] = useState(initialTab);
  const [assetId, setAssetId] = useState(ASSETS[0].id);
  const asset = ASSETS.find((a) => a.id === assetId);
  const ADDRESS = "TX9fJ2bQ7mK4pR8sV1nW6dZ3xY5aL0kQ2a";

  const [copied, setCopied] = useState(false);
  const [depAmt, setDepAmt] = useState(100);
  const [depStage, setDepStage] = useState(null);

  const [wAmt, setWAmt] = useState(50);
  const [wAddr, setWAddr] = useState("");
  const [wStage, setWStage] = useState(null);
  const [wHash, setWHash] = useState("");
  const [withdrawView, setWithdrawView] = useState("form"); // form | 2fa
  const [code, setCode] = useState("");

  const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => { if (open) { setTab(initialTab); setWithdrawView("form"); setCode(""); } }, [open, initialTab]);

  const total = balance + inPlay + pending;
  const net = Math.max(0, wAmt - WITHDRAW_FEE);
  const wValid = wAmt >= MIN_WITHDRAW && wAmt <= balance && wAddr.trim().length > 6;

  const copy = async () => {
    try { await navigator.clipboard.writeText(ADDRESS); } catch { /* clipboard may be blocked */ }
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const runStages = (setStage, count, onComplete) => {
    clearInterval(timer.current);
    setStage(0);
    let i = 0;
    timer.current = setInterval(() => {
      i += 1;
      if (i >= count) { clearInterval(timer.current); onComplete(); return; }
      setStage(i);
    }, 1100);
  };

  const startDeposit = () => {
    if (depStage !== null || depAmt <= 0) return;
    runStages(setDepStage, DEPOSIT_STAGES.length, () => {
      setBalance((b) => b + depAmt);
      pushTxn({ id: `t${Date.now()}`, type: "Deposit", amount: depAmt, status: "Completed", hash: txHash(), time: nowLabel(), network: asset.network });
      toast.success("Deposit credited", { message: `+$${fmt(depAmt)} ${asset.label}` });
      setTimeout(() => setDepStage(null), 1800);
    });
  };

  const startWithdraw = () => {
    if (!wValid || wStage !== null) return;
    const amount = wAmt;
    setBalance((b) => b - amount);
    setPending((p) => p + amount);
    setWHash("");
    runStages(setWStage, WITHDRAW_STAGES.length, () => {
      setPending((p) => p - amount);
      pushTxn({ id: `t${Date.now()}`, type: "Withdrawal", amount, status: "Completed", hash: txHash(), time: nowLabel(), network: asset.network });
      toast.success("Withdrawal sent", { message: `$${fmt(amount)} to ${asset.network}` });
      setTimeout(() => { setWStage(null); setWHash(""); }, 1800);
    });
    setTimeout(() => setWHash(txHash()), 1100 * 3);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Wallet</DialogTitle>
        </DialogHeader>

        {/* balance breakdown */}
        <div className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-xs text-muted-foreground">Total balance</span>
            <span className="font-mono text-xl font-semibold tabular-nums">{fmtMoney(total)}</span>
          </div>
          <Separator className="mb-2" />
          <div className="space-y-1">
            <StatRow label="Available" value={fmtMoney(balance)} />
            <StatRow label="In play" value={fmtMoney(inPlay)} />
            <StatRow label="Pending withdrawal" value={fmtMoney(pending)} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full">
            <TabsTrigger value="deposit" className="flex-1">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw" className="flex-1">Withdraw</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>

          {/* DEPOSIT */}
          <TabsContent value="deposit" className="mt-3 space-y-3">
            <div className="flex gap-2">
              {ASSETS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAssetId(a.id)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${a.id === assetId ? "bg-[var(--global-cta)] text-[var(--global-cta-text)]" : "bg-secondary text-muted-foreground"}`}
                >
                  {a.network}
                </button>
              ))}
            </div>

            {depStage !== null ? (
              <div className="space-y-3 rounded-xl border bg-card p-3">
                <div className="text-sm font-medium">Depositing ${fmt(depAmt)} {asset.label}</div>
                <StageTracker stages={DEPOSIT_STAGES} current={depStage} />
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)] p-2 text-center text-[11px] text-[var(--warning)]">
                  Send only <span className="font-semibold">{asset.label} · {asset.network}</span> to this address
                </div>
                <div className="grid place-items-center rounded-xl bg-zinc-950 p-5">
                  <div className="grid size-28 place-items-center rounded-lg bg-white/90 text-xs text-zinc-500">QR</div>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-background p-2 text-xs">
                  <span className="truncate font-mono">{ADDRESS}</span>
                  <button onClick={copy} className={`ml-auto flex items-center gap-1 rounded px-2 py-1 ${copied ? "bg-[var(--success-bg)] text-[var(--success)]" : "bg-secondary"}`}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}{copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Min {asset.min} {asset.label} · {asset.confirms} confirmation{asset.confirms > 1 ? "s" : ""} · credited in {asset.eta}.
                  Converted to your USD balance at 1 {asset.label} ≈ $1.00 (0.5% spread).
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex w-28 items-center rounded-md border bg-background px-2">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input type="number" min={0} value={depAmt} onFocus={(e) => e.target.select()} onChange={(e) => setDepAmt(Math.max(0, +e.target.value))} className="h-8 border-0 bg-transparent px-1.5 font-mono tabular-nums shadow-none focus-visible:ring-0" />
                  </div>
                  <Button className="flex-1 bg-[var(--global-cta)] font-bold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)]" onClick={startDeposit}>
                    Simulate incoming deposit
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* WITHDRAW */}
          <TabsContent value="withdraw" className="mt-3 space-y-3">
            {wStage !== null ? (
              <div className="space-y-3 rounded-xl border bg-card p-3">
                <div className="text-sm font-medium">Withdrawing ${fmt(wAmt)} → {asset.network}</div>
                <StageTracker stages={WITHDRAW_STAGES} current={wStage} />
                {wHash && <div className="rounded-md bg-background p-2 font-mono text-[11px] text-muted-foreground">tx {wHash}</div>}
              </div>
            ) : withdrawView === "2fa" ? (
              <div className="space-y-3">
                <button onClick={() => { setWithdrawView("form"); setCode(""); }} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-[var(--success)]" /> Confirm withdrawal</div>
                  <p className="mt-1 text-xs text-muted-foreground">Enter the 6-digit code from your authenticator to send ${fmt(net)} to {asset.network}.</p>
                </div>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  placeholder="••••••"
                  className="text-center font-mono text-lg tracking-[0.5em]"
                />
                <Button
                  className="w-full bg-[var(--global-cta)] font-bold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] disabled:bg-zinc-700 disabled:text-zinc-400"
                  disabled={code.length !== 6}
                  onClick={() => { startWithdraw(); setWithdrawView("form"); setCode(""); }}
                >
                  Verify &amp; withdraw
                </Button>
                <p className="text-[11px] text-muted-foreground">Demo — any 6 digits work. Code delivery (authenticator / SMS) is handled outside the app.</p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  {ASSETS.map((a) => (
                    <button key={a.id} onClick={() => setAssetId(a.id)} className={`flex-1 rounded-lg py-1.5 text-xs font-medium ${a.id === assetId ? "bg-[var(--global-cta)] text-[var(--global-cta-text)]" : "bg-secondary text-muted-foreground"}`}>
                      {a.network}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Destination address</label>
                  <Input value={wAddr} onChange={(e) => setWAddr(e.target.value)} placeholder={`Your ${asset.network} address`} className="font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <button onClick={() => setWAmt(+balance.toFixed(2))} className="text-xs text-[var(--success)]">Max ${fmt(balance)}</button>
                  </div>
                  <div className="flex items-center rounded-md border bg-background px-2">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input type="number" min={0} value={wAmt} onFocus={(e) => e.target.select()} onChange={(e) => setWAmt(Math.max(0, +e.target.value))} className="h-9 border-0 bg-transparent px-1.5 font-mono tabular-nums shadow-none focus-visible:ring-0" />
                  </div>
                </div>
                <div className="space-y-1 rounded-lg border bg-card p-2.5">
                  <StatRow label="Network fee" value={`$${fmt(WITHDRAW_FEE)}`} />
                  <StatRow label="You receive" value={`$${fmt(net)}`} accent />
                </div>
                {wAmt > 0 && wAmt < MIN_WITHDRAW && <p className="text-[11px] text-[var(--danger)]">Minimum withdrawal is ${fmt(MIN_WITHDRAW)}.</p>}
                {wAmt > balance && <p className="text-[11px] text-[var(--danger)]">Amount exceeds your available balance.</p>}
                <Button className="w-full bg-[var(--global-cta)] font-bold text-[var(--global-cta-text)] hover:bg-[var(--global-cta-hover)] disabled:bg-zinc-700 disabled:text-zinc-400" disabled={!wValid} onClick={() => setWithdrawView("2fa")}>
                  Withdraw ${fmt(net)}
                </Button>
                <p className="text-[11px] text-muted-foreground">Confirm the address and network — on-chain withdrawals can’t be reversed. You’ll enter a 2FA code next.</p>
              </>
            )}
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="mt-3">
            {txns.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No transactions yet.</div>
            ) : (
              <div className="space-y-2">
                {txns.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border bg-card p-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{t.type}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{t.network} · tx {t.hash} · {t.time}</div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className={`font-mono text-sm tabular-nums ${t.type === "Deposit" ? "text-[var(--success)]" : ""}`}>
                        {t.type === "Deposit" ? "+" : "−"}{fmtMoney(t.amount)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">{t.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
