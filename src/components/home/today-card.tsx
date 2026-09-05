import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";

export interface CalendarEvent {
  id: string;
  time: string;
  label: string;
  duration: string;
  dotColor: string;
}

export function TodayCard({
  dateLabel,
  events,
}: {
  dateLabel: string;
  events: CalendarEvent[];
}) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-[18px] text-[#12181f]" />
          <h2 className="text-[16px] font-semibold text-[#12181f]">Today</h2>
        </div>
        <p className="text-[13px] text-[#9aa0a8]">{dateLabel}</p>
      </div>

      <div className="mt-3 flex flex-col">
        {events.map((event) => (
          <div key={event.id} className="flex items-center gap-3 py-2.5">
            <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: event.dotColor }} />
            <span className="w-11 shrink-0 text-[13px] text-[#9aa0a8]">{event.time}</span>
            <span className="flex-1 truncate text-[13.5px] text-[#12181f]">{event.label}</span>
            <span className="shrink-0 text-[13px] text-[#9aa0a8]">{event.duration}</span>
          </div>
        ))}
      </div>

      <Link
        href="/calendar"
        className="mt-3 flex h-[46px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#2e3540] text-[13.5px] font-medium text-white hover:bg-[#242a33]"
      >
        View calendar
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
