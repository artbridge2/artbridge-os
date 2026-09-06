"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeStatus } from "@/actions/tasks";
import { TaskBoardCard } from "@/components/tasks/task-board-card";
import { STATUS_LABELS, type TaskStatus, type TaskWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "completed"];

export function TaskBoard({ tasks, showOwner }: { tasks: TaskWithRelations[]; showOwner: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [localTasks, setLocalTasks] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);

  // Reconcile with fresh server data after a status change (or any other filter/nav change).
  useEffect(() => setLocalTasks(tasks), [tasks]);

  function handleDrop(status: TaskStatus) {
    setDragOverColumn(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const task = localTasks.find((t) => t.id === id);
    if (!task || task.status === status) return;

    setLocalTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(async () => {
      await changeStatus(id, status);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {COLUMNS.map((status) => {
        const items = localTasks.filter((t) => t.status === status);
        return (
          <div
            key={status}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(status);
            }}
            onDragLeave={() => setDragOverColumn((c) => (c === status ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(status);
            }}
            className={cn(
              "flex min-h-[200px] flex-col gap-2 rounded-xl bg-[#f4f4f4] p-3 transition-colors",
              dragOverColumn === status && "bg-[#e9ecf0] ring-2 ring-[#12181f]/10"
            )}
          >
            <div className="flex items-center justify-between px-1">
              <p className="text-[13px] font-semibold text-[#5a616c]">{STATUS_LABELS[status]}</p>
              <span className="text-[12px] font-medium text-[#9aa0a8]">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOverColumn(null);
                  }}
                  className="cursor-grab active:cursor-grabbing"
                >
                  <TaskBoardCard task={task} showOwner={showOwner} />
                </div>
              ))}
              {items.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#d8dade] py-6 text-center text-[12.5px] text-[#9aa0a8]">
                  No tasks
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
