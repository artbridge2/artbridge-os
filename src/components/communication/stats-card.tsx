import type { CommunicationStats, PeriodStat } from "@/lib/queries-inbox";

function TrendLabel({ trendPercent }: { trendPercent: number | null }) {
  if (trendPercent === null) return null;
  const up = trendPercent > 0;
  const flat = trendPercent === 0;
  return (
    <span
      className="text-[12.5px] font-medium"
      style={{ color: flat ? "#9aa0a8" : up ? "#1c9a52" : "#e0353b" }}
    >
      {flat ? "→" : up ? "↑" : "↓"} {Math.abs(trendPercent)}%
    </span>
  );
}

function StatRow({ label, value, trend }: { label: string; value: string; trend: PeriodStat["trendPercent"] }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <p className="text-[13.5px] text-[#5a616c]">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-[15px] font-semibold text-[#12181f]">{value}</p>
        <TrendLabel trendPercent={trend} />
      </div>
    </div>
  );
}

export function StatsCard({ stats }: { stats: CommunicationStats }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14.5px] font-semibold text-[#12181f]">Conversation stats</p>
        <p className="text-[12.5px] text-[#9aa0a8]">Last 30 days</p>
      </div>
      <div className="mt-1 divide-y divide-[#f2f2f2]">
        <StatRow label="New conversations" value={String(stats.newConversations.value)} trend={stats.newConversations.trendPercent} />
        <StatRow label="Resolved" value={String(stats.resolved.value)} trend={stats.resolved.trendPercent} />
        <StatRow
          label="Avg. response time"
          value={stats.avgResponseHours.value === null ? "—" : `${stats.avgResponseHours.value.toFixed(1)} h`}
          trend={stats.avgResponseHours.trendPercent}
        />
      </div>
    </div>
  );
}
