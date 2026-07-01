import { Menu, ReceiptText } from "lucide-react";
import { BalancePill } from "./BalancePill";
import { BRAND_NAME } from "@/lib/brand";

export function TopBar({ onBurger, balance, user, onLogin, onRegister, onAccount, onDeposit, onActivity }) {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background px-3 py-2.5 relative">
      <button
        onClick={onBurger}
        aria-label="Toggle menu"
        className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Menu className="size-5" />
      </button>

      <div className="flex items-center gap-2">
        <div className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 font-black text-zinc-950">{BRAND_NAME[0]}</div>
        <span className="text-sm font-bold tracking-tight">{BRAND_NAME}</span>
      </div>

      {user ? (
        <>
          {/* Balance + deposit centered on desktop (Stake-style) */}
          <div className="absolute left-1/2 hidden -translate-x-1/2 sm:block">
            <BalancePill balance={balance} onDeposit={onDeposit} />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onActivity}
              aria-label="My activity"
              className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ReceiptText className="size-5" />
            </button>
            {/* Balance stays inline on mobile (no room to center) */}
            <div className="sm:hidden">
              <BalancePill balance={balance} onDeposit={onDeposit} />
            </div>
            <button
              onClick={onAccount}
              aria-label="Account"
              className="relative grid size-9 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {user.label?.[0]?.toUpperCase() ?? "U"}
              {!user.verified && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-amber-400 ring-2 ring-background" />}
            </button>
          </div>
        </>
      ) : (
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onLogin}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Log in
          </button>
          <button
            onClick={onRegister}
            className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Register
          </button>
        </div>
      )}
    </header>
  );
}
