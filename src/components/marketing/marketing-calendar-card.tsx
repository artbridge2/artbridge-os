import Link from "next/link";
import type { MarketingCalendarItem } from "@/lib/types";

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const KIND_LABEL: Record<MarketingCalendarItem["kind"], string> = {
  campaign_start: "Launch",
  campaign_end: "Ends",
  event: "Event",
};

export function MarketingCalendarCard({ items, compact = false }: { items: MarketingCalendarItem[]; compact?: boolean }) {
  const shown = compact ? items.slice(0, 6) : items;
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      {compact && (
        <div className="flex items-center justify-between">
          <p className="text-[14.5px] font-semibold text-[#12181f]">Marketing calendar</p>
          <Link href="/marketing/calendar" className="text-[13px] font-medium text-[#3b82f6]">
            Full view
          </Link>
        </div>
      )}
      <div className="mt-2 divide-y divide-[#f2f2f2]">
        {shown.length === 0 ? (
          <p className="py-4 text-[13.5px] text-[#9aa0a8]">No dated marketing work coming up.</p>
        ) : (
          shown.map((item) => (
            <Link key={item.id} href={item.href} className="flex items-center gap-3 py-2.5 hover:opacity-80">
              <span className="w-14 shrink-0 text-[12px] font-medium text-[#9aa0a8]">{formatDate(item.date)}</span>
              <span className="w-14 shrink-0 text-[12px] font-medium uppercase tracking-wide text-[#e8952a]">{KIND_LABEL[item.kind]}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-[#3d4451]">{item.title}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
