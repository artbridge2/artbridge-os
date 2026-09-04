import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import {
  addMonths,
  addWeeks,
  budapestNow,
  formatDateOnly,
  monthBounds,
  weekBounds,
} from "@/lib/dates";
import { getTasksInDateRange } from "@/lib/queries";
import { TaskCard } from "@/components/task-card";
import { ROLE_LABELS, type Role, type TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
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
  const tasks = await getTasksInDateRange(formatDateOnly(start), formatDateOnly(end));

  const byOwner = (role: Role) => tasks.filter((t) => t.owner?.role === role);

  return (
    <div className="space-y-4">
      <WeekNav offset={offset} start={start} end={end} />
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
  const tasks = await getTasksInDateRange(formatDateOnly(start), formatDateOnly(end));

  const byDate = new Map<string, TaskWithRelations[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const list = byDate.get(task.due_date) ?? [];
    list.push(task);
    byDate.set(task.due_date, list);
  }
  const dates = [...byDate.keys()].sort();

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
        <p className="text-sm text-muted-foreground">Nincs határidős feladat ebben a hónapban.</p>
      ) : (
        <div className="space-y-4">
          {dates.map((date) => (
            <div key={date} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                {format(new Date(`${date}T00:00:00`), "MMMM d., EEEE", { locale: hu })}
              </h2>
              <div className="space-y-2">
                {byDate.get(date)!.map((task) => (
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
