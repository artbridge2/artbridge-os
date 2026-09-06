import Link from "next/link";
import { Link2, Repeat } from "lucide-react";
import { TaskPriorityBadge } from "@/components/tasks/task-status-badge";
import { initials } from "@/lib/communication-style";
import { formatDueLabel, todayInBudapest } from "@/lib/dates";
import { ROLE_LABELS, type TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskBoardCard({ task, showOwner }: { task: TaskWithRelations; showOwner: boolean }) {
  const today = todayInBudapest();
  const isOverdue = !!task.due_date && task.due_date < today && task.status !== "completed";

  return (
    <Link
      href={`/tasks/${task.id}`}
      draggable={false}
      className={cn(
        "block rounded-lg border border-[#eeeeee] bg-white p-3 shadow-sm hover:border-[#d8dade]",
        task.status === "completed" && "opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn("text-[13.5px] font-medium leading-snug text-[#12181f]", task.status === "completed" && "line-through")}>
          {task.title}
        </p>
        {task.recurring_rule && <Repeat className="mt-0.5 size-3.5 shrink-0 text-[#9aa0a8]" />}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#8a909a]">
        {showOwner && task.owner && (
          <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[9px] font-semibold text-[#5a616c]">
            {initials(ROLE_LABELS[task.owner.role])}
          </span>
        )}
        {task.area && <span>{task.area.name}</span>}
        {task.due_date && <span className={cn(isOverdue && "font-medium text-[#e0353b]")}>{formatDueLabel(task.due_date, today)}</span>}
        {task.linked_type && <Link2 className="size-3 shrink-0" />}
      </div>
      <div className="mt-2">
        <TaskPriorityBadge priority={task.priority} />
      </div>
    </Link>
  );
}
