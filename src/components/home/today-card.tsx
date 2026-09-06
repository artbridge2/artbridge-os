import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import type { CalendarEventSummary } from "@/lib/google/calendar";

const DOT_COLORS = ["#8f7de8", "#e6a13c", "#3fae87", "#e0545c", "#3b82f6"];

function formatTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDuration(start: string, end: string, allDay: boolean): string {
  if (allDay) return "";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} h`;
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="size-[18px] text-[#12181f]" />
          <h2 className="text-[16px] font-semibold text-[#12181f]">Next 7 days</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

export function TodayCard({
  state,
  events,
}: {
  state: "connected" | "not_connected" | "error";
  events?: CalendarEventSummary[];
}) {
  if (state === "not_connected") {
    return (
      <CardShell>
        <p className="mt-3 text-[13.5px] text-[#8a909a]">
          Connect the company Google Calendar to see the next 7 days&apos; events here.
        </p>
        <Link
          href="/api/gmail/connect"
          className="mt-3 flex h-[46px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#2e3540] text-[13.5px] font-medium text-white hover:bg-[#242a33]"
        >
          Connect Google Calendar
          <ArrowRight className="size-3.5" />
        </Link>
      </CardShell>
    );
  }

  if (state === "error") {
    return (
      <CardShell>
        <p className="mt-3 text-[13.5px] text-[#e0545c]">Calendar unavailable.</p>
        <p className="mt-1 text-[13px] text-[#9aa0a8]">The rest of Home still works — try reloading in a moment.</p>
      </CardShell>
    );
  }

  const list = events ?? [];

  return (
    <CardShell>
      {list.length === 0 ? (
        <p className="mt-3 text-[13.5px] text-[#9aa0a8]">No events in the next 7 days.</p>
      ) : (
        <div className="mt-3 flex flex-col">
          {list.map((event, i) => (
            <a
              key={event.id}
              href={event.htmlLink}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 py-2.5 hover:opacity-80"
            >
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: DOT_COLORS[i % DOT_COLORS.length] }} />
              <span className="w-16 shrink-0 text-[13px] text-[#9aa0a8]">{formatTime(event.start, event.allDay)}</span>
              <span className="flex-1 truncate text-[13.5px] text-[#12181f]">{event.title}</span>
              <span className="shrink-0 text-[13px] text-[#9aa0a8]">{formatDuration(event.start, event.end, event.allDay)}</span>
            </a>
          ))}
        </div>
      )}
      <Link
        href="/calendar"
        className="mt-3 flex h-[46px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#2e3540] text-[13.5px] font-medium text-white hover:bg-[#242a33]"
      >
        View calendar
        <ArrowRight className="size-3.5" />
      </Link>
    </CardShell>
  );
}
