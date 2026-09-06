import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import {
  TIME_ZONE,
  addDays,
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

// Spec §17: filter what the Calendar shows rather than dumping every date
// stored anywhere onto it — Google Calendar events and Tasks (split into
// plain Tasks vs Project Tasks) can each be toggled independently.
const SHOW_OPTIONS = [
  { key: "all", label: "All" },
  { key: "google", label: "Google Calendar" },
  { key: "tasks", label: "Tasks" },
  { key: "project_tasks", label: "Project Tasks" },
] as const;
type ShowFilter = (typeof SHOW_OPTIONS)[number]["key"];

function filterTasks(tasks: TaskWithRelations[], show: ShowFilter): TaskWithRelations[] {
  if (show === "google") return [];
  if (show === "tasks") return tasks.filter((t) => !t.project_id);
  if (show === "project_tasks") return tasks.filter((t) => !!t.project_id);
  return tasks;
}

function filterEvents(events: CalendarEventSummary[], show: ShowFilter): CalendarEventSummary[] {
  if (show === "tasks" || show === "project_tasks") return [];
  return events;
}

function ShowFilterBar({ view, offset, show }: { view: string; offset: number; show: ShowFilter }) {
  const href = (s: ShowFilter) => `/planning?view=${view}&offset=${offset}${s === "all" ? "" : `&show=${s}`}`;
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg bg-[#f4f4f4] p-1" style={{ width: "fit-content" }}>
      {SHOW_OPTIONS.map((o) => (
        <Link
          key={o.key}
          href={href(o.key)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12.5px] font-medium",
            show === o.key ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]"
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const view = params.view === "month" ? "month" : params.view === "day" ? "day" : "week";
  const offset = Number(params.offset ?? 0) || 0;
  const show: ShowFilter = SHOW_OPTIONS.some((o) => o.key === params.show) ? (params.show as ShowFilter) : "all";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Planning</h1>
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Link
            href={`/planning?view=day${show === "all" ? "" : `&show=${show}`}`}
            className={cn("rounded px-3 py-1 text-sm", view === "day" ? "bg-secondary font-medium" : "text-muted-foreground")}
          >
            Day
          </Link>
          <Link
            href={`/planning?view=week${show === "all" ? "" : `&show=${show}`}`}
            className={cn("rounded px-3 py-1 text-sm", view === "week" ? "bg-secondary font-medium" : "text-muted-foreground")}
          >
            Week
          </Link>
          <Link
            href={`/planning?view=month${show === "all" ? "" : `&show=${show}`}`}
            className={cn("rounded px-3 py-1 text-sm", view === "month" ? "bg-secondary font-medium" : "text-muted-foreground")}
          >
            Month
          </Link>
        </div>
      </div>

      <ShowFilterBar view={view} offset={offset} show={show} />

      {view === "day" ? (
        <DayView offset={offset} show={show} />
      ) : view === "week" ? (
        <WeekView offset={offset} show={show} />
      ) : (
        <MonthView offset={offset} show={show} />
      )}
    </div>
  );
}

async function DayView({ offset, show }: { offset: number; show: ShowFilter }) {
  const date = addDays(budapestNow(), offset);
  const dateStr = formatDateOnly(date);
  const start = new Date(`${dateStr}T00:00:00`);
  const end = new Date(`${dateStr}T23:59:59`);
  const [allTasks, allEvents] = await Promise.all([
    getTasksInDateRange(dateStr, dateStr),
    safeGetCalendarEvents(start, end),
  ]);
  const tasks = filterTasks(allTasks, show);
  const events = filterEvents(allEvents, show);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={`/planning?view=day&offset=${offset - 1}${show === "all" ? "" : `&show=${show}`}`} className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="size-4" />
        </Link>
        <p className="text-sm font-medium">{format(date, "MMMM d., EEEE", { locale: hu })}</p>
        <Link href={`/planning?view=day&offset=${offset + 1}${show === "all" ? "" : `&show=${show}`}`} className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground">
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {events.length === 0 && tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nincs határidős feladat vagy naptáresemény ezen a napon.</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EventChip key={event.id} event={event} />
          ))}
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} showOwner />
          ))}
        </div>
      )}
    </div>
  );
}

async function WeekView({ offset, show }: { offset: number; show: ShowFilter }) {
  const anchor = addWeeks(budapestNow(), offset);
  const { start, end } = weekBounds(anchor);
  const [allTasks, allEvents] = await Promise.all([
    getTasksInDateRange(formatDateOnly(start), formatDateOnly(end)),
    safeGetCalendarEvents(start, end),
  ]);
  const tasks = filterTasks(allTasks, show);
  const events = filterEvents(allEvents, show);

  const byOwner = (role: Role) => tasks.filter((t) => t.owner?.role === role);

  return (
    <div className="space-y-4">
      <WeekNav offset={offset} start={start} end={end} show={show} />
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

function WeekNav({ offset, start, end, show }: { offset: number; start: Date; end: Date; show: ShowFilter }) {
  const q = show === "all" ? "" : `&show=${show}`;
  return (
    <div className="flex items-center justify-between">
      <Link
        href={`/planning?view=week&offset=${offset - 1}${q}`}
        className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </Link>
      <p className="text-sm font-medium">
        {format(start, "MMM d.", { locale: hu })} – {format(end, "MMM d.", { locale: hu })}
      </p>
      <Link
        href={`/planning?view=week&offset=${offset + 1}${q}`}
        className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Link>
    </div>
  );
}

async function MonthView({ offset, show }: { offset: number; show: ShowFilter }) {
  const anchor = addMonths(budapestNow(), offset);
  const { start, end } = monthBounds(anchor);
  const [allTasks, allEvents] = await Promise.all([
    getTasksInDateRange(formatDateOnly(start), formatDateOnly(end)),
    safeGetCalendarEvents(start, end),
  ]);
  const tasks = filterTasks(allTasks, show);
  const events = filterEvents(allEvents, show);

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
  const q = show === "all" ? "" : `&show=${show}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href={`/planning?view=month&offset=${offset - 1}${q}`}
          className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <p className="text-sm font-medium">{format(anchor, "yyyy. MMMM", { locale: hu })}</p>
        <Link
          href={`/planning?view=month&offset=${offset + 1}${q}`}
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
