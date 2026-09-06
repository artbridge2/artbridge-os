import Link from "next/link";
import { Repeat } from "lucide-react";
import { CompleteCheckbox } from "@/components/complete-checkbox";
import { PriorityBadge } from "@/components/priority-badge";
import { formatDueLabel, todayInBudapest } from "@/lib/dates";
import { ROLE_LABELS, type TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskCard({
  task,
  showOwner = false,
}: {
  task: TaskWithRelations;
  showOwner?: boolean;
}) {
  const today = todayInBudapest();
  const isOverdue = !!task.due_date && task.due_date < today && task.status !== "completed";
  const isDone = task.status === "completed";

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
      <div className="pt-0.5">
        <CompleteCheckbox taskId={task.id} done={isDone} />
      </div>
      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              "truncate text-sm font-medium",
              isDone && "text-muted-foreground line-through"
            )}
          >
            {task.title}
          </p>
          {task.recurring_rule && (
            <Repeat className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          {showOwner && <span>{ROLE_LABELS[task.owner?.role ?? "adam"]}</span>}
          {task.area && <span>{task.area.name}</span>}
          {task.due_date && (
            <span className={cn(isOverdue && "font-medium text-red-600 dark:text-red-400")}>
              {formatDueLabel(task.due_date, today)}
            </span>
          )}
        </div>
      </Link>
      <PriorityBadge priority={task.priority} />
    </div>
  );
}
