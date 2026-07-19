import { useEffect } from "react";
import { StatusBadge } from "@/components/ui/status-badge";
import { track } from "@/lib/telemetry";

const RESULT_LABEL = { won: "Won", lost: "Lost", void: "Void" };

// A utility destination, not a discovery surface — separate from Sports
// Home/Live/sport pages. Reads the client bet-history source (`activity`,
// owned by App.jsx) rather than the event-feed source: real provider bets
// and demo bets both land here once placed, but this page never touches
// live odds/market data again.
export function MyBets({ activity }) {
  const bets = activity.filter((a) => a.product === "sports");
  const open = bets.filter((b) => b.status === "open");
  const settled = bets.filter((b) => b.status && b.status !== "open");

  useEffect(() => { track("sports_my_bets_viewed", { openCount: open.length, settledCount: settled.length }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-bold">My Bets</h1>
        {open.length > 0 && (
          <StatusBadge variant="neutral" count={open.length} ariaLabel={`${open.length} open bets`} />
        )}
      </div>

      {bets.length === 0 ? (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No open bets yet. Place a bet from any event to see it here.
        </p>
      ) : (
        <>
          {open.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">Open</h2>
              <div className="space-y-2">
                {open.map((b) => <BetRow key={b.id} bet={b} />)}
              </div>
            </section>
          )}
          {settled.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold">Settled</h2>
              <div className="space-y-2">
                {settled.map((b) => <BetRow key={b.id} bet={b} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function BetRow({ bet }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{bet.title}</div>
          <div className="truncate text-xs text-muted-foreground">{bet.selection}</div>
        </div>
        {bet.status === "open" ? (
          <StatusBadge variant="pending" icon="clock" ariaLabel="Pending settlement" />
        ) : bet.status === "won" ? (
          <StatusBadge variant="success" icon="check" ariaLabel="Won" />
        ) : bet.status === "void" ? (
          <StatusBadge variant="muted" ariaLabel="Void — stake returned" />
        ) : bet.status === "lost" ? null : null}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Stake ${bet.stake}{bet.status !== "open" && bet.status !== "won" ? "" : ` · Potential $${bet.potential}`}</span>
        {bet.status && bet.status !== "open" && (
          <span className="font-medium text-muted-foreground">{RESULT_LABEL[bet.status] ?? bet.status}</span>
        )}
      </div>
    </div>
  );
}
