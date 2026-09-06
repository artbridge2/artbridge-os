"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2 } from "lucide-react";
import { changeDueDate, changePriority, changeStatus, deleteTask, reassignTask, stopRecurrence } from "@/actions/tasks";
import { PRIORITY_LABELS, ROLE_LABELS, STATUS_LABELS, type Profile, type TaskPriority, type TaskStatus, type TaskWithRelations } from "@/lib/types";

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[14.5px] font-semibold text-[#12181f]">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function TaskSidebar({ task, profiles }: { task: TaskWithRelations; profiles: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <SidebarCard title="Details">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Status</label>
            <select
              defaultValue={task.status}
              disabled={pending}
              onChange={(e) => run(() => changeStatus(task.id, e.target.value as TaskStatus))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] text-[#9aa0a8]">Priority</label>
            <select
              defaultValue={task.priority}
              disabled={pending}
              onChange={(e) => run(() => changePriority(task.id, e.target.value as TaskPriority))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] text-[#9aa0a8]">Assignee</label>
            <select
              defaultValue={task.owner_id}
              disabled={pending}
              onChange={(e) => run(() => reassignTask(task.id, e.target.value))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {ROLE_LABELS[p.role]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[12px] text-[#9aa0a8]">Due date</label>
            <input
              type="date"
              defaultValue={task.due_date ?? ""}
              disabled={pending}
              onChange={(e) => run(() => changeDueDate(task.id, e.target.value || null))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px]"
            />
          </div>

          {task.recurring_rule && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => stopRecurrence(task.id))}
              className="text-left text-[13px] font-medium text-[#e0353b] hover:underline"
            >
              Stop recurrence
            </button>
          )}
        </div>
      </SidebarCard>

      {task.linked_type && (
        <SidebarCard title="Linked object">
          <div className="flex items-center gap-2">
            <Link2 className="size-4 shrink-0 text-[#9aa0a8]" />
            <p className="min-w-0 flex-1 truncate text-[13.5px] text-[#3d4451]">{task.linked_title}</p>
          </div>
          {task.linked_href && (
            <Link href={task.linked_href} className="mt-2 flex items-center gap-1 text-[13px] font-medium text-[#3b82f6]">
              Open linked item <ArrowRight className="size-3.5" />
            </Link>
          )}
        </SidebarCard>
      )}

      <SidebarCard title="Actions">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this task? This can't be undone.")) return;
            startTransition(() => deleteTask(task.id));
          }}
          className="text-[13.5px] font-medium text-[#e0353b] hover:underline"
        >
          Delete task
        </button>
      </SidebarCard>
    </div>
  );
}
