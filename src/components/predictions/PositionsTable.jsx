import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getMarket } from "@/lib/predictionsData";
import { fmtCents } from "@/lib/format";
import { useCurrency } from "@/lib/currency";

export function PositionsTable({ positions }) {
  const { fmtMoney } = useCurrency();
  if (!positions.length) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No positions yet — buy Yes or No on any market to open one.
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Market</TableHead>
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Avg</TableHead>
            <TableHead className="text-right">Value / P&amp;L</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((p) => {
            const market = getMarket(p.marketId);
            const cur = p.status === "settled"
              ? (p.resolvedYes === (p.side === "Yes") ? 1 : 0)
              : market
                ? (p.side === "Yes" ? market.yes : market.no)
                : p.avgPrice;
            const value = cur * p.shares;
            const cost = p.avgPrice * p.shares;
            const pnl = value - cost;
            const up = pnl >= 0;
            return (
              <TableRow key={p.id}>
                <TableCell className="max-w-[220px] truncate text-sm">{p.question}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={p.side === "Yes" ? "text-[var(--outcome-affirmative)]" : "text-[var(--outcome-negative)]"}>
                    {p.side}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{p.shares}</TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">{fmtCents(p.avgPrice)}</TableCell>
                <TableCell className="text-right">
                  <div className="font-mono tabular-nums">{fmtMoney(value)}</div>
                  <div className={`font-mono text-xs tabular-nums ${up ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
                    {up ? "+" : "−"}{fmtMoney(Math.abs(pnl))}
                    {p.status === "settled" && <span className="ml-1 text-muted-foreground">· settled</span>}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
