import Link from "next/link";
import type { MarketingCalendarItem } from "@/lib/types";

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function UpcomingCard({ items }: { items: MarketingCalendarItem[] }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14.5px] font-semibold text-[#12181f]">Upcoming</p>
        <Link href="/marketing/calendar" className="text-[13px] font-medium text-[#3b82f6]">
          Full calendar
        </Link>
      </div>
      <div className="mt-2 divide-y divide-[#f2f2f2]">
        {items.length === 0 ? (
          <p className="py-4 text-[13.5px] text-[#9aa0a8]">Nothing scheduled in the next two weeks.</p>
        ) : (
          items.map((item) => (
            <Link key={item.id} href={item.href} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-[#12181f]">{item.title}</p>
                {item.context && <p className="truncate text-[12.5px] text-[#8a909a]">{item.context}</p>}
              </div>
              <p className="shrink-0 text-[12.5px] text-[#9aa0a8]">{formatDate(item.date)}</p>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
