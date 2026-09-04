"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { completeTask, reopenTask } from "@/actions/tasks";
import { cn } from "@/lib/utils";

export function CompleteCheckbox({
  taskId,
  done,
}: {
  taskId: string;
  done: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label={done ? "Task újranyitása" : "Task teljesítése"}
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void (done ? reopenTask(taskId) : completeTask(taskId));
        })
      }
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
        done
          ? "border-transparent bg-foreground text-background"
          : "border-muted-foreground/40 hover:border-foreground",
        pending && "opacity-50"
      )}
    >
      {done && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}
