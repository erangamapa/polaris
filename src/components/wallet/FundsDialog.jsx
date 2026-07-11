import { Copy, ExternalLink, LogOut, Droplets } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useWallet, shortAddress } from "@/web3/useWallet";
import { baseSepolia } from "@shared/chains";
import { toast } from "@/lib/toast";

// Non-custodial Funds panel: shows the player's own on-chain balances across the
// two chains (casino = Base Sepolia, sports = Polygon Amoy) and links to faucets.
// TriBet never holds funds — no deposit-to-us.
export function FundsDialog({ open, onClose }) {
  const {
    address, casinoBalance, casinoSymbol, sportsBalance, sportsSymbol, sportsGas, sportsGasSymbol, disconnect,
  } = useWallet();

  const explorer = `${baseSepolia.blockExplorers.default.url}/address/${address}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Funds</DialogTitle>
          <DialogDescription>
            Your funds stay in your own wallet. {"TriBet"} is non-custodial — play settles on-chain.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
          <span className="font-mono text-sm">{shortAddress(address)}</span>
          <div className="flex items-center gap-1">
            <button onClick={copy} aria-label="Copy address" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
              <Copy className="size-4" />
            </button>
            <a href={explorer} target="_blank" rel="noreferrer" aria-label="View on explorer" className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>

        <div className="space-y-2">
          <BalanceRow label="Casino (BetSwirl · Base Sepolia)" symbol={casinoSymbol} amount={casinoBalance} decimals={5} note="native — bets + gas" />
          <BalanceRow label="Sports (Azuro · Polygon Amoy)" symbol={sportsSymbol} amount={sportsBalance} decimals={2} note="bet token — mint from Sports tab" />
          <BalanceRow label="Sports gas" symbol={sportsGasSymbol} amount={sportsGas} decimals={4} note="Polygon Amoy native" />
        </div>

        <div className="rounded-lg border border-dashed p-3 text-sm">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <Droplets className="size-4 text-[var(--global-cta)]" /> Get testnet funds
          </div>
          <div className="flex flex-col gap-1.5">
            <FaucetLink href="https://portal.cdp.coinbase.com/products/faucet" label="Casino: Base Sepolia ETH faucet (Coinbase)" />
            <FaucetLink href="https://faucet.polygon.technology/" label="Sports: Polygon Amoy POL faucet (gas)" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Get POL for gas on Amoy, then mint test USDT from the Sports tab. Both are testnets — funds have no real value.
          </p>
        </div>

        <button
          onClick={() => { disconnect(); onClose(); }}
          data-test-id="disconnect"
          className="flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-4" /> Disconnect
        </button>
      </DialogContent>
    </Dialog>
  );
}

function BalanceRow({ label, symbol, amount, note, decimals = 5 }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2.5">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
      <div className="font-mono text-sm font-semibold tabular-nums">
        {amount.toFixed(decimals)} {symbol}
      </div>
    </div>
  );
}

function FaucetLink({ href, label }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[var(--global-cta)] hover:underline">
      <ExternalLink className="size-3.5" /> {label}
    </a>
  );
}
