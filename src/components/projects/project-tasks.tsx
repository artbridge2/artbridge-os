"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { promoteTaskToGlobal, setTaskProject } from "@/actions/projects";
import { TaskRow } from "@/components/tasks/task-row";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import type { Area, Profile, TaskWithRelations } from "@/lib/types";

export function ProjectTasks({
  projectId,
  tasks,
  unlinkedTasks,
  profiles,
  areas,
  defaultOwnerId,
}: {
  projectId: string;
  tasks: TaskWithRelations[];
  unlinkedTasks: { id: string; title: string }[];
  profiles: Profile[];
  areas: Area[];
  defaultOwnerId: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();

  function link() {
    if (!selected) return;
    startTransition(async () => {
      await setTaskProject(selected, projectId);
      router.refresh();
      setSelected("");
    });
  }

  function promote(taskId: string) {
    startTransition(async () => {
      await promoteTaskToGlobal(taskId);
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Tasks</p>
        <NewTaskDialog profiles={profiles} areas={areas} defaultOwnerId={defaultOwnerId} defaultProjectId={projectId} triggerLabel="New task" />
      </div>
      <div className="mt-3 space-y-2">
        {tasks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#e4e4e4] py-6 text-center text-[13px] text-[#9aa0a8]">No tasks linked yet.</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <TaskRow task={task} showAssignee />
              </div>
              {!task.promoted_to_global && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => promote(task.id)}
                  title="Also show this task on the Global Tasks board"
                  className="flex shrink-0 items-center gap-1 rounded-md border border-[#eeeeee] px-2 py-1 text-[12px] font-medium text-[#5a616c] hover:bg-[#f4f4f4]"
                >
                  <ArrowUpRight className="size-3.5" /> Promote
                </button>
              )}
            </div>
          ))
        )}
      </div>
      {unlinkedTasks.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-transparent px-2 text-[13px]"
          >
            <option value="">Link an existing task…</option>
            {unlinkedTasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={link}
            disabled={!selected || pending}
            className="h-9 shrink-0 rounded-md bg-[#12181f] px-3 text-[13px] font-medium text-white disabled:opacity-40"
          >
            {pending ? "Linking…" : "Link"}
          </button>
        </div>
      )}
    </div>
  );
}
