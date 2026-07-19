import { useWallet } from "@/web3/useWallet";
import { useNormalizedAzuroEvents } from "@/web3/useAzuro";
import { SPORTS_DEMO_MODE } from "@/lib/sportsDemo";

// Internal-only — the raw provider-console information the old "On-chain
// Sports" block used to show directly on the customer journey (network,
// market counts, testnet warnings, raw mapped conditions). Reachable at
// /sports/dev; never linked from primary navigation, never shown to normal
// users. Functionality preserved, just relocated (see PROVIDER DIAGNOSTICS).
export function ProviderDiagnostics() {
  const wallet = useWallet();
  const { events, loading, bettableCount } = useNormalizedAzuroEvents();
  const totalMarkets = events.reduce((s, e) => s + e.markets.length, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-bold">Sports provider diagnostics</h1>
        <p className="text-xs text-muted-foreground">Internal only — not linked from primary navigation.</p>
      </div>

      <DiagCard title="Config">
        <Row k="Demo mode" v={String(SPORTS_DEMO_MODE)} />
        <Row k="Network" v="Azuro · Polygon Amoy (testnet)" />
        <Row k="Wallet connected" v={String(wallet.isConnected)} />
        <Row k="On sports chain" v={String(wallet.onSportsChain)} />
        <Row k="Sports balance (USDT)" v={wallet.sportsBalance?.toFixed(2)} />
        <Row k="Sports gas" v={`${wallet.sportsGas?.toFixed(3)} ${wallet.sportsGasSymbol ?? ""}`} />
      </DiagCard>

      <DiagCard title="Feed">
        <Row k="Loading" v={String(loading)} />
        <Row k="Normalized events" v={events.length} />
        <Row k="Bettable (upcoming) games" v={bettableCount} />
        <Row k="Total markets" v={totalMarkets} />
      </DiagCard>

      {bettableCount === 0 && events.length > 0 && (
        <DiagCard title="Testnet limitation">
          <p className="text-xs text-muted-foreground">
            Every fetched game has already started, so Azuro's relayer will reject a real bet with
            "Game is not active." This is a testnet-feed limitation, not an app bug — the full bet flow
            still runs end to end against whatever bettable inventory exists.
          </p>
        </DiagCard>
      )}

      <DiagCard title="Raw normalized events">
        <div className="max-h-96 overflow-y-auto rounded-lg bg-black/30 p-2">
          <pre className="whitespace-pre-wrap break-all font-mono text-[10px] text-muted-foreground">
            {JSON.stringify(events.map((e) => ({ id: e.id, source: e.source, sport: e.sport.id, country: e.country.name, league: e.league.name, status: e.status, markets: e.markets.length })), null, 2)}
          </pre>
        </div>
      </DiagCard>
    </div>
  );
}

function DiagCard({ title, children }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono">{String(v)}</span>
    </div>
  );
}
