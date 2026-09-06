import { addDays, budapestNow, formatDateOnly, todayInBudapest, weekBounds } from "@/lib/dates";
import type { TaskWithRelations } from "@/lib/types";

export interface Buckets {
  overdue: TaskWithRelations[];
  today: TaskWithRelations[];
  thisWeek: TaskWithRelations[];
  upcoming: TaskWithRelations[];
}

/**
 * Splits a user's open tasks into the four Home buckets. Tasks without a due
 * date, and tasks due more than 14 days out, are intentionally left out —
 * Home is meant to focus, not list everything (see Tasks/Planning for those).
 */
export function bucketTasks(tasks: TaskWithRelations[]): Buckets {
  const today = todayInBudapest();
  const weekEnd = formatDateOnly(weekBounds().end);
  const horizon = formatDateOnly(addDays(budapestNow(), 14));

  const buckets: Buckets = { overdue: [], today: [], thisWeek: [], upcoming: [] };

  for (const task of tasks) {
    if (!task.due_date || task.status === "completed") continue;
    if (task.due_date < today) buckets.overdue.push(task);
    else if (task.due_date === today) buckets.today.push(task);
    else if (task.due_date <= weekEnd) buckets.thisWeek.push(task);
    else if (task.due_date <= horizon) buckets.upcoming.push(task);
  }

  return buckets;
}

export function greeting(name: string): string {
  const hour = budapestNow().getHours();
  const part = hour < 10 ? "Jó reggelt" : hour < 18 ? "Jó napot" : "Jó estét";
  return `${part}, ${name}!`;
}
