import { getCurrentProfile } from "@/lib/dal";
import { getTasks } from "@/lib/queries";
import { bucketTasks, greeting } from "@/lib/buckets";
import { TaskBucketSection } from "@/components/task-bucket-section";
import { ROLE_LABELS } from "@/lib/types";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const tasks = await getTasks({ ownerId: profile.id, excludeDone: true });
  const buckets = bucketTasks(tasks);

  const totalOpen =
    buckets.overdue.length + buckets.today.length + buckets.thisWeek.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting(ROLE_LABELS[profile.role])}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalOpen === 0
            ? "Nincs sürgős tennivalód — szép munka."
            : `${totalOpen} tennivaló vár rád ezen a héten.`}
        </p>
      </div>

      <div className="space-y-6">
        <TaskBucketSection
          title="Overdue"
          tasks={buckets.overdue}
          moreHref="/tasks?owner=me&overdue=1"
        />
        <TaskBucketSection
          title="Today"
          tasks={buckets.today}
          moreHref="/tasks?owner=me"
          emptyLabel="Ma nincs határidős feladatod."
        />
        <TaskBucketSection
          title="This Week"
          tasks={buckets.thisWeek}
          moreHref="/tasks?owner=me"
        />
        <TaskBucketSection
          title="Upcoming"
          tasks={buckets.upcoming}
          moreHref="/tasks?owner=me"
        />
      </div>
    </div>
  );
}
