import { Repeat } from "lucide-react";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { describeRecurringRule } from "@/lib/recurring";
import { formatDueLabel, todayInBudapest } from "@/lib/dates";
import type { TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskHeader({ task }: { task: TaskWithRelations }) {
  const today = todayInBudapest();
  const isOverdue = !!task.due_date && task.due_date < today && task.status !== "completed";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-[22px] font-bold text-[#12181f]">{task.title}</h1>
        {task.recurring_rule && (
          <span className="flex items-center gap-1 text-[12.5px] text-[#9aa0a8]">
            <Repeat className="size-3.5" />
            {describeRecurringRule(task.recurring_rule)}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <TaskStatusBadge status={task.status} />
        <TaskPriorityBadge priority={task.priority} />
        {task.due_date && (
          <span className={cn("text-[13px] text-[#8a909a]", isOverdue && "font-medium text-[#e0353b]")}>
            Due {formatDueLabel(task.due_date, today)}
          </span>
        )}
      </div>
    </div>
  );
}
