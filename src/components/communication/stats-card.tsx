import type { CommunicationStats } from "@/lib/queries-inbox";

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <p className="text-[13.5px] text-[#5a616c]">{label}</p>
      <p className="text-[15px] font-semibold text-[#12181f]">{value}</p>
    </div>
  );
}

/** Deliberately simple (spec §22) — no trends, no avg response time. */
export function StatsCard({ stats }: { stats: CommunicationStats }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[14.5px] font-semibold text-[#12181f]">Communication stats</p>
      <div className="mt-1 divide-y divide-[#f2f2f2]">
        <StatRow label="Open" value={stats.open} />
        <StatRow label="Needs reply" value={stats.needsReply} />
        <StatRow label="Waiting" value={stats.waiting} />
        <StatRow label="Resolved this week" value={stats.resolvedThisWeek} />
      </div>
    </div>
  );
}
