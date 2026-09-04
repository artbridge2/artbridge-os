"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeDueDate,
  changeStatus,
  completeTask,
  reassignTask,
  reopenTask,
} from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  PRIORITY_LABELS,
  ROLE_LABELS,
  STATUS_LABELS,
  type Profile,
  type TaskStatus,
  type TaskWithRelations,
} from "@/lib/types";

export function TaskDetailControls({
  task,
  profiles,
}: {
  task: TaskWithRelations;
  profiles: Profile[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isDone = task.status === "done";

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <Button
        className="w-full"
        disabled={pending}
        onClick={() => run(() => (isDone ? reopenTask(task.id) : completeTask(task.id)))}
      >
        {isDone ? "Task újranyitása" : "Task teljesítve"}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          defaultValue={task.status}
          disabled={pending}
          onChange={(e) => run(() => changeStatus(task.id, e.target.value as TaskStatus))}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner">Felelős</Label>
        <select
          id="owner"
          defaultValue={task.owner_id}
          disabled={pending}
          onChange={(e) => run(() => reassignTask(task.id, e.target.value))}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {ROLE_LABELS[p.role]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="due_date">Határidő</Label>
        <input
          id="due_date"
          type="date"
          defaultValue={task.due_date ?? ""}
          disabled={pending}
          onChange={(e) => run(() => changeDueDate(task.id, e.target.value || null))}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        />
      </div>

      <div className="space-y-1 pt-2 text-sm text-muted-foreground">
        <p>Prioritás: {PRIORITY_LABELS[task.priority]}</p>
        {task.area && <p>Area: {task.area.name}</p>}
      </div>
    </div>
  );
}
