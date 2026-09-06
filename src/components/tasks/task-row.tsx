"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Link2, Repeat } from "lucide-react";
import { completeTask, reopenTask } from "@/actions/tasks";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/task-status-badge";
import { OpenButton } from "@/components/home/open-button";
import { initials } from "@/lib/communication-style";
import { formatDueLabel, todayInBudapest } from "@/lib/dates";
import { ROLE_LABELS, type TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskRow({ task, showAssignee = true }: { task: TaskWithRelations; showAssignee?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const today = todayInBudapest();
  const isOverdue = !!task.due_date && task.due_date < today && task.status !== "completed";
  const isDone = task.status === "completed";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { await (isDone ? reopenTask(task.id) : completeTask(task.id)); router.refresh(); })}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          isDone ? "border-transparent bg-[#12181f] text-white" : "border-[#d8dade] hover:border-[#12181f]"
        )}
      >
        {isDone && <Check className="size-3.5" strokeWidth={3} />}
      </button>

      {showAssignee && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[12px] font-semibold text-[#5a616c]">
          {initials(task.owner ? ROLE_LABELS[task.owner.role] : "?")}
        </span>
      )}

      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("truncate text-[15px] font-semibold text-[#12181f]", isDone && "text-[#9aa0a8] line-through")}>
            {task.title}
          </p>
          {task.recurring_rule && <Repeat className="size-3.5 shrink-0 text-[#9aa0a8]" />}
          {task.linked_type && <Link2 className="size-3.5 shrink-0 text-[#9aa0a8]" />}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-[#8a909a]">
          {task.area && <span>{task.area.name}</span>}
          {task.due_date && (
            <span className={cn(isOverdue && "font-medium text-[#e0353b]")}>{formatDueLabel(task.due_date, today)}</span>
          )}
        </div>
      </Link>

      <div className="flex shrink-0 items-center gap-2">
        <TaskPriorityBadge priority={task.priority} />
        <TaskStatusBadge status={task.status} />
      </div>

      <OpenButton href={`/tasks/${task.id}`} />
    </div>
  );
}
