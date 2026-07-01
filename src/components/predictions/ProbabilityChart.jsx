import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

export function ProbabilityChart({ data }) {
  return (
    <div className="h-44 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="yesFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4FA7B8" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#4FA7B8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, 100]} hide />
          <Tooltip
            cursor={{ stroke: "var(--border)" }}
            contentStyle={{
              background: "var(--popover)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--popover-foreground)",
            }}
            formatter={(v) => [`${v}%`, "Yes"]}
            labelFormatter={() => ""}
          />
          <Area
            type="monotone"
            dataKey="yes"
            stroke="#4FA7B8"
            strokeWidth={2}
            fill="url(#yesFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
