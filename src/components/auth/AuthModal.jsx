import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WALLETS, shortAddress } from "@/lib/session";

export function AuthModal({ open, initialTab = "login", onClose, onAuthed }) {
  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setTab(initialTab); setError(""); } }, [open, initialTab]);

  const isRegister = tab === "register";

  const connectWallet = (w) =>
    onAuthed({ method: "wallet", wallet: w.id, label: shortAddress(), verified: false });

  const submitEmail = () => {
    const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!okEmail) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    onAuthed({ method: "email", label: email, verified: false });
  };

  const inputCls =
    "w-full rounded-full border border-[#262626] bg-[#1a1a1a] px-4 py-3 text-[13px] text-white outline-none transition placeholder:text-[#8a8a8a] focus:border-[#19C7A5]/40";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[360px] max-w-[calc(100%-2rem)] gap-0 rounded-[20px] border-0 bg-[#111] p-5">
        <DialogHeader>
          <DialogTitle className="sr-only">{isRegister ? "Register" : "Log in"}</DialogTitle>
        </DialogHeader>

        {/* pill tabs — mt clears the dialog's top-right close button */}
        <div className="mt-5 flex gap-1 rounded-full bg-[#1e1e1e] p-1 sm:mt-4">
          {[["login", "Log in"], ["register", "Register"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 rounded-full py-2 text-[13px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19C7A5]/40 ${
                tab === id ? "bg-[#2e2e2e] font-medium text-white" : "text-[#8a8a8a]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* wallets */}
        <p className="mb-2.5 mt-5 text-[11px] uppercase tracking-wide text-[#6f6f6f]">Connect wallet</p>
        <div className="grid grid-cols-4 gap-2">
          {WALLETS.map((w) => (
            <button
              key={w.id}
              onClick={() => connectWallet(w)}
              className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[14px] border border-[#262626] bg-[#1a1a1a] px-1 py-2.5 transition hover:border-[#333] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19C7A5]/40"
            >
              <span
                className="grid size-8 place-items-center rounded-full text-[13px] font-bold"
                style={{ background: `${w.color}1a`, color: w.glyph ?? w.color }}
              >
                {w.initial}
              </span>
              <span className="w-full break-words text-center text-[11px] leading-tight text-[#cfcfcf]">{w.display ?? w.name}</span>
            </button>
          ))}
        </div>

        {/* divider */}
        <div className="my-4 flex items-center gap-2.5 text-[11px] text-[#6f6f6f]">
          <span className="h-px flex-1 bg-[#262626]" /> or with email <span className="h-px flex-1 bg-[#262626]" />
        </div>

        {/* inputs */}
        <div className="space-y-2.5">
          <input type="email" value={email} placeholder="Email address" className={inputCls}
            onChange={(e) => { setEmail(e.target.value); setError(""); }} />
          <input type="password" value={password} placeholder="Password" className={inputCls}
            onChange={(e) => { setPassword(e.target.value); setError(""); }} />
          {error && <p className="px-1 text-[11px] text-[var(--danger)]">{error}</p>}
        </div>

        {/* CTA */}
        <button
          onClick={submitEmail}
          className="mt-3 w-full rounded-full bg-[#19C7A5] py-3 text-[14px] font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#19C7A5]/50"
        >
          {isRegister ? "Create account" : "Log in"}
        </button>

        <p className="mt-3.5 text-center text-[11px] leading-relaxed text-[#6f6f6f]">
          Demo build — no real authentication. 18+. By continuing you agree to the Terms &amp; Privacy Policy.
        </p>
        <button
          onClick={() => onAuthed({ method: "demo", label: "demo@tribet.gg", verified: false })}
          className="mt-2 text-center text-[12px] text-[#19C7A5] hover:underline focus-visible:outline-none"
        >
          Continue as demo →
        </button>
      </DialogContent>
    </Dialog>
  );
}
