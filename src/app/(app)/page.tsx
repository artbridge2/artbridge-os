import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { getTasks } from "@/lib/queries";
import { getAttentionItems } from "@/lib/attention";
import { bucketTasks, greeting } from "@/lib/buckets";
import { TaskBucketSection } from "@/components/task-bucket-section";
import { AttentionItemRow } from "@/components/attention-item-row";
import { ROLE_LABELS } from "@/lib/types";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  const [tasks, attentionItems] = await Promise.all([
    getTasks({ ownerId: profile.id, excludeDone: true }),
    getAttentionItems(profile.id),
  ]);
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

      {attentionItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm font-semibold">Needs your attention</h2>
            <span className="text-sm text-muted-foreground">{attentionItems.length}</span>
          </div>
          <div className="space-y-2">
            {attentionItems.slice(0, 3).map((item) => (
              <AttentionItemRow key={`${item.source_type}-${item.source_id}`} item={item} />
            ))}
          </div>
          {attentionItems.length > 3 && (
            <Link
              href="/communication?view=attention&owner=me"
              className="block text-sm text-muted-foreground hover:text-foreground"
            >
              +{attentionItems.length - 3} további →
            </Link>
          )}
        </div>
      )}

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
