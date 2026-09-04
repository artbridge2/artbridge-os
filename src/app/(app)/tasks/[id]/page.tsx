import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Repeat } from "lucide-react";
import { getProfiles, getTaskById } from "@/lib/queries";
import { StatusBadge } from "@/components/status-badge";
import { PriorityBadge } from "@/components/priority-badge";
import { TaskDetailControls } from "@/components/task-detail-controls";
import { describeRecurringRule } from "@/lib/recurring";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, profiles] = await Promise.all([getTaskById(id), getProfiles()]);

  if (!task) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/tasks"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tasks
      </Link>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_260px]">
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
              {task.recurring_rule && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Repeat className="size-3.5" />
                  {describeRecurringRule(task.recurring_rule)}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
            </div>
          </div>

          {task.description && (
            <p className="whitespace-pre-wrap text-sm text-foreground/90">
              {task.description}
            </p>
          )}

          {task.next_action && (
            <div>
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">
                Next action
              </h2>
              <p className="mt-1 text-sm">{task.next_action}</p>
            </div>
          )}

          {task.notes && (
            <div>
              <h2 className="text-xs font-semibold uppercase text-muted-foreground">Notes</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm">{task.notes}</p>
            </div>
          )}

          {task.source_thread && (
            <Link
              href={`/communication/${task.source_thread.id}`}
              className="block text-sm text-muted-foreground underline hover:text-foreground"
            >
              ← Email: {task.source_thread.subject ?? "(no subject)"}
            </Link>
          )}
        </div>

        <TaskDetailControls task={task} profiles={profiles} />
      </div>
    </div>
  );
}
