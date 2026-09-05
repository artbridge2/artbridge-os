import type { HomeStats } from "@/lib/attention";

const ITEMS: { key: keyof HomeStats; label: string }[] = [
  { key: "completedThisWeek", label: "Completed this week" },
  { key: "pending", label: "Pending" },
  { key: "needsAttention", label: "Needs attention" },
  { key: "dueThisWeek", label: "Due this week" },
];

export function OperationalStats({ stats }: { stats: HomeStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ITEMS.map((item) => (
        <div key={item.key} className="rounded-2xl border border-[#eeeeee] bg-white p-4">
          <p className="text-[22px] font-bold text-[#12181f]">{stats[item.key]}</p>
          <p className="mt-0.5 text-[13px] text-[#8a909a]">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
