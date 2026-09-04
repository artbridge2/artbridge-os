import { getCurrentProfile } from "@/lib/dal";
import { getAreas, getProfiles, getTasks } from "@/lib/queries";
import { TaskFilters } from "@/components/task-filters";
import { TaskCreateSheet } from "@/components/task-create-sheet";
import { TaskCard } from "@/components/task-card";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const owner = typeof params.owner === "string" ? params.owner : undefined;
  const area = typeof params.area === "string" ? params.area : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;
  const priority = typeof params.priority === "string" ? params.priority : undefined;
  const overdue = params.overdue === "1";
  const search = typeof params.q === "string" ? params.q : undefined;

  const [tasks, profiles, areas] = await Promise.all([
    getTasks({
      ownerId: owner,
      areaId: area,
      status,
      priority,
      overdueOnly: overdue,
      search,
    }),
    getProfiles(),
    getAreas(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Tasks</h1>
        <TaskCreateSheet profiles={profiles} areas={areas} defaultOwnerId={profile.id} />
      </div>

      <TaskFilters profiles={profiles} areas={areas} currentUserId={profile.id} />

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nincs a szűrésnek megfelelő task.
          </p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} showOwner />)
        )}
      </div>
    </div>
  );
}
