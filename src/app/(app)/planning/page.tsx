import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import {
  TIME_ZONE,
  addMonths,
  addWeeks,
  budapestNow,
  formatDateOnly,
  monthBounds,
  weekBounds,
} from "@/lib/dates";
import { getTasksInDateRange } from "@/lib/queries";
import { getCalendarConnectionStatus, getCalendarEvents, type CalendarEventSummary } from "@/lib/google/calendar";
import { TaskCard } from "@/components/task-card";
import { ROLE_LABELS, type Role, type TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatEventTime(iso: string, allDay: boolean): string {
  if (allDay) return "All day";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Real Google Calendar events in range — returns [] on any failure (not connected, API error) so a Planning page load never breaks over Calendar being unavailable. Tasks are the page's core data either way. */
async function safeGetCalendarEvents(start: Date, end: Date): Promise<CalendarEventSummary[]> {
  try {
    const status = await getCalendarConnectionStatus();
    if (!status.connected) return [];
    return await getCalendarEvents(start, end);
  } catch (err) {
    console.error("[planning] calendar events fetch failed", err);
    return [];
  }
}

/** Local (Budapest) date key for grouping — an all-day event's date is already a plain YYYY-MM-DD, a timed event's is derived from its zoned datetime. */
function eventDateKey(event: CalendarEventSummary): string {
  if (event.allDay) return event.start.slice(0, 10);
  return formatDateOnly(toZonedTime(new Date(event.start), TIME_ZONE));
}

function EventChip({ event }: { event: CalendarEventSummary }) {
  return (
    <a
      href={event.htmlLink}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border border-[#e4e4e4] bg-[#fafafa] px-2.5 py-1.5 text-[12.5px] text-[#5a616c] hover:bg-[#f0f0f0]"
    >
      <span className="shrink-0 text-[#9aa0a8]">{formatEventTime(event.start, event.allDay)}</span>
      <span className="min-w-0 flex-1 truncate">{event.title}</span>
      <ExternalLink className="size-3 shrink-0 text-[#9aa0a8]" />
    </a>
  );
}

const COLUMNS: Role[] = ["adam", "eszter", "kurator"];

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = params.view === "month" ? "month" : "week";
  const offset = Number(params.offset ?? 0) || 0;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Planning</h1>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Link
            href="/planning?view=week"
            className={cn(
              "rounded px-3 py-1 text-sm",
              view === "week" ? "bg-secondary font-medium" : "text-muted-foreground"
            )}
          >
            Week
          </Link>
          <Link
            href="/planning?view=month"
            className={cn(
              "rounded px-3 py-1 text-sm",
              view === "month" ? "bg-secondary font-medium" : "text-muted-foreground"
            )}
          >
            Month
          </Link>
        </div>
      </div>

      {view === "week" ? <WeekView offset={offset} /> : <MonthView offset={offset} />}
    </div>
  );
}

async function WeekView({ offset }: { offset: number }) {
  const anchor = addWeeks(budapestNow(), offset);
  const { start, end } = weekBounds(anchor);
  const [tasks, events] = await Promise.all([
    getTasksInDateRange(formatDateOnly(start), formatDateOnly(end)),
    safeGetCalendarEvents(start, end),
  ]);

  const byOwner = (role: Role) => tasks.filter((t) => t.owner?.role === role);

  return (
    <div className="space-y-4">
      <WeekNav offset={offset} start={start} end={end} />
      {events.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-semibold">Google Calendar</h2>
          <div className="space-y-1.5">
            {events.map((event) => (
              <EventChip key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {COLUMNS.map((role) => (
          <div key={role} className="space-y-2">
            <h2 className="text-sm font-semibold">{ROLE_LABELS[role]}</h2>
            <div className="space-y-2">
              {byOwner(role).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nincs feladat.</p>
              ) : (
                byOwner(role).map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeekNav({ offset, start, end }: { offset: number; start: Date; end: Date }) {
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/planning?view=week&offset=${offset - 1}`}
        className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <p className="text-sm font-medium">
        {format(start, "MMM d.", { locale: hu })} – {format(end, "MMM d.", { locale: hu })}
      </p>
      <Link
        href={`/planning?view=week&offset=${offset + 1}`}
        className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

async function MonthView({ offset }: { offset: number }) {
  const anchor = addMonths(budapestNow(), offset);
  const { start, end } = monthBounds(anchor);
  const [tasks, events] = await Promise.all([
    getTasksInDateRange(formatDateOnly(start), formatDateOnly(end)),
    safeGetCalendarEvents(start, end),
  ]);

  const byDate = new Map<string, TaskWithRelations[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const list = byDate.get(task.due_date) ?? [];
    list.push(task);
    byDate.set(task.due_date, list);
  }

  const eventsByDate = new Map<string, CalendarEventSummary[]>();
  for (const event of events) {
    const key = eventDateKey(event);
    const list = eventsByDate.get(key) ?? [];
    list.push(event);
    eventsByDate.set(key, list);
  }

  const dates = [...new Set([...byDate.keys(), ...eventsByDate.keys()])].sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/planning?view=month&offset=${offset - 1}`}
          className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <p className="text-sm font-medium">{format(anchor, "yyyy. MMMM", { locale: hu })}</p>
        <Link
          href={`/planning?view=month&offset=${offset + 1}`}
          className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {dates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nincs határidős feladat vagy naptáresemény ebben a hónapban.</p>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {format(new Date(`${date}T00:00:00`), "MMMM d., EEEE", { locale: hu })}
              </h2>
              <div className="space-y-2">
                {(eventsByDate.get(date) ?? []).map((event) => (
                  <EventChip key={event.id} event={event} />
                ))}
                {(byDate.get(date) ?? []).map((task) => (
                  <TaskCard key={task.id} task={task} showOwner />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
