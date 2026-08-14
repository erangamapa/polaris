import { useEffect, useRef } from 'react';
import { MAX_PICKS, payoutRowsForDisplay } from '../utils/payouts';

type Props = {
  spots: number;
  /** Live matched-hit count during/after a round (0 = no highlight). */
  currentHits?: number;
};

export function PayoutTable({ spots, currentHits = 0 }: Props) {
  const n = spots >= 1 ? spots : 0;
  const rows = payoutRowsForDisplay(spots);
  const tableRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);
  const liveHits = Math.max(0, Math.min(MAX_PICKS, Math.floor(currentHits)));

  useEffect(() => {
    const table = tableRef.current;
    const active = activeRef.current;
    if (!table || !active || liveHits <= 0) return;

    const activeCenter = active.offsetLeft + active.offsetWidth / 2;
    const target = activeCenter - table.clientWidth / 2;
    const maxScroll = Math.max(0, table.scrollWidth - table.clientWidth);
    table.scrollTo({
      left: Math.max(0, Math.min(maxScroll, target)),
      behavior: 'smooth',
    });
  }, [liveHits, spots]);

  return (
    <aside className="payout-panel" aria-label="Payout table">
      <div className="payout-label">
        <h2 className="payout-title">Payouts</h2>
        <span className="payout-sub">
          <span className="payout-spots">{n}</span>/{MAX_PICKS} picks
        </span>
      </div>
      <div className="payout-table" role="list" ref={tableRef}>
        {rows.map((r) => {
          const isLive = liveHits > 0 && r.hits === liveHits;
          const isReached = liveHits > 0 && r.hits < liveHits && r.possible;
          return (
            <div
              key={r.hits}
              ref={isLive ? activeRef : undefined}
              role="listitem"
              className={[
                'payout-row',
                r.mult <= 0 || !r.possible ? 'is-zero' : '',
                isLive ? 'is-live' : '',
                isReached ? 'is-reached' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-current={isLive ? 'true' : undefined}
              title={
                r.possible
                  ? `${r.hits} hit${r.hits === 1 ? '' : 's'} → ${formatMult(r.mult)}`
                  : `Need ${r.hits} picks to unlock`
              }
            >
              <span className="payout-hit">{r.hits}</span>
              <span className="gold payout-mult">
                {r.possible ? formatMult(r.mult) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function formatMult(m: number): string {
  if (m <= 0) return '0×';
  if (m >= 10) return `${Math.round(m)}×`;
  if (Number.isInteger(m) || Math.abs(m * 10 - Math.round(m * 10)) < 1e-6) {
    return `${m.toFixed(1)}×`;
  }
  return `${m.toFixed(2)}×`;
}
