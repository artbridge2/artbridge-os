import { TASK_PRIORITY_STYLE, TASK_STATUS_STYLE } from "@/lib/task-style";
import { PRIORITY_LABELS, STATUS_LABELS, type TaskPriority, type TaskStatus } from "@/lib/types";

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const style = TASK_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function TaskPriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "low" || priority === "normal") return null;
  const style = TASK_PRIORITY_STYLE[priority];
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
