import Link from "next/link";
import { TaskCard } from "@/components/task-card";
import type { TaskWithRelations } from "@/lib/types";

const MAX_VISIBLE = 5;

export function TaskBucketSection({
  title,
  tasks,
  moreHref,
  emptyLabel,
}: {
  title: string;
  tasks: TaskWithRelations[];
  moreHref: string;
  emptyLabel?: string;
}) {
  if (tasks.length === 0 && !emptyLabel) return null;

  const visible = tasks.slice(0, MAX_VISIBLE);
  const remaining = tasks.length - visible.length;

  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {visible.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {remaining > 0 && (
            <Link
              href={moreHref}
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              +{remaining} további →
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
