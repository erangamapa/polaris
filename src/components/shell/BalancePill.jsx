import { useState } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function BalancePill({ balance, onDeposit }) {
  const { fmtMoney, currency, setCurrency, currencies } = useCurrency();
  const [open, setOpen] = useState(false);

  const groups = [
    { label: "Fiat", items: currencies.filter((c) => c.kind === "fiat") },
    { label: "Crypto", items: currencies.filter((c) => c.kind === "crypto") },
  ];

  return (
    <div className="relative flex items-center">
      {/* Segmented control: balance/currency + deposit fused into one pill */}
      <div className="flex items-stretch overflow-hidden rounded-lg ring-1 ring-white/5">
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Change display currency"
          className="flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="font-mono text-sm font-semibold tabular-nums text-white">{fmtMoney(balance)}</span>
          <ChevronDown className={cn("size-3.5 text-zinc-400 transition-transform", open && "rotate-180")} />
        </button>

        <div className="w-px shrink-0 bg-black/25" aria-hidden />

        <button
          onClick={onDeposit}
          aria-label="Deposit"
          className="flex items-center justify-center bg-[var(--global-cta)] px-2.5 text-sm font-semibold text-[var(--global-cta-text)] transition hover:bg-[var(--global-cta-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-3.5"
        >
          <span className="hidden sm:inline">Deposit</span>
          <Plus className="size-4 sm:hidden" />
        </button>
      </div>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-hidden onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg sm:left-0 sm:right-auto">
            {groups.map((g) => (
              <div key={g.label}>
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</div>
                {g.items.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCurrency(c.id); setOpen(false); }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-accent",
                      currency === c.id && "font-medium"
                    )}
                  >
                    <span className="grid size-5 place-items-center rounded bg-secondary text-[10px] font-bold">
                      {c.symbol ?? c.id.slice(0, 1)}
                    </span>
                    <span>{c.id}</span>
                    <span className="truncate text-xs text-muted-foreground">{c.name}</span>
                    {currency === c.id && <Check className="ml-auto size-3.5 text-[var(--global-cta)]" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
