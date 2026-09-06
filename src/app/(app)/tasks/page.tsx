import Link from "next/link";
import { LayoutGrid, List } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { getAreas, getProfiles, getTasks } from "@/lib/queries";
import { TaskRow } from "@/components/tasks/task-row";
import { TaskBoard } from "@/components/tasks/task-board";
import { NewTaskDialog } from "@/components/tasks/new-task-dialog";
import { cn } from "@/lib/utils";

type TasksView = "mine" | "all" | "completed";
type TasksLayout = "list" | "board";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const isCurator = profile.role === "kurator";

  const viewParam = typeof params.view === "string" ? params.view : "mine";
  const view: TasksView = viewParam === "all" && !isCurator ? "all" : viewParam === "completed" ? "completed" : "mine";
  const layout: TasksLayout = params.layout === "board" ? "board" : "list";

  const search = typeof params.q === "string" ? params.q : undefined;
  const priority = typeof params.priority === "string" ? params.priority : undefined;
  const areaId = typeof params.area === "string" ? params.area : undefined;
  const filterOwner = typeof params.owner === "string" ? params.owner : undefined;

  // Board mode shows all three statuses as columns at once — the List-only
  // "Completed" tab (which filters everything else out) doesn't apply there.
  const [tasks, profiles, areas] = await Promise.all([
    getTasks({
      ownerId: view === "mine" ? profile.id : filterOwner,
      areaId,
      priority,
      search,
      status: layout === "list" && view === "completed" ? "completed" : undefined,
      excludeDone: layout === "list" && view !== "completed",
    }),
    getProfiles(),
    getAreas(),
  ]);

  const assignableProfiles = profiles.filter((p) => p.role !== "kurator" || p.id === profile.id);

  function buildHref(overrides: { view?: TasksView; layout?: TasksLayout }) {
    const qs = new URLSearchParams();
    const v = overrides.view ?? view;
    const l = overrides.layout ?? layout;
    if (v !== "mine") qs.set("view", v);
    if (l === "board") qs.set("layout", "board");
    const query = qs.toString();
    return `/tasks${query ? `?${query}` : ""}`;
  }

  const tabHref = (v: TasksView) => buildHref({ view: v });
  // Board mode shows Completed as its own column — the "Completed" list tab doesn't apply there.
  const layoutHref = (l: TasksLayout) => buildHref({ layout: l, view: l === "board" && view === "completed" ? "all" : undefined });

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Tasks</h1>
          <p className="mt-1 text-[14px] text-[#5a616c]">Standalone Artbridge to-dos.</p>
        </div>
        <NewTaskDialog profiles={assignableProfiles} areas={areas} defaultOwnerId={profile.id} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-[#f4f4f4] p-1" style={{ width: "fit-content" }}>
          <Link
            href={tabHref("mine")}
            className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", view === "mine" ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]")}
          >
            My tasks
          </Link>
          {!isCurator && (
            <Link
              href={tabHref("all")}
              className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", view === "all" ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]")}
            >
              All tasks
            </Link>
          )}
          {layout === "list" && (
            <Link
              href={tabHref("completed")}
              className={cn("rounded-md px-3 py-1.5 text-[13px] font-medium", view === "completed" ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]")}
            >
              Completed
            </Link>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-[#f4f4f4] p-1" style={{ width: "fit-content" }}>
          <Link
            href={layoutHref("list")}
            title="List"
            className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium", layout === "list" ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]")}
          >
            <List className="size-3.5" /> List
          </Link>
          <Link
            href={layoutHref("board")}
            title="Board"
            className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium", layout === "board" ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]")}
          >
            <LayoutGrid className="size-3.5" /> Board
          </Link>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-2" action="/tasks" method="get">
        <input type="hidden" name="view" value={view} />
        {layout === "board" && <input type="hidden" name="layout" value="board" />}
        <input
          name="q"
          defaultValue={search}
          placeholder="Search title or description…"
          className="h-9 w-56 rounded-lg border border-[#e4e4e4] bg-white px-3 text-[13.5px]"
        />
        {view === "all" && (
          <select name="owner" defaultValue={filterOwner ?? ""} className="h-9 rounded-lg border border-[#e4e4e4] bg-white px-2 text-[13.5px]">
            <option value="">Everyone</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        )}
        <select name="area" defaultValue={areaId ?? ""} className="h-9 rounded-lg border border-[#e4e4e4] bg-white px-2 text-[13.5px]">
          <option value="">All areas</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue={priority ?? ""} className="h-9 rounded-lg border border-[#e4e4e4] bg-white px-2 text-[13.5px]">
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        <button type="submit" className="h-9 rounded-lg bg-[#12181f] px-3 text-[13.5px] font-medium text-white">
          Apply
        </button>
      </form>

      {layout === "board" ? (
        tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
            No tasks match this filter.
          </p>
        ) : (
          <TaskBoard tasks={tasks} showOwner={view !== "mine"} />
        )
      ) : (
        <div className="space-y-2.5">
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
              {view === "completed" ? "Nothing completed yet." : "No tasks match this filter."}
            </p>
          ) : (
            tasks.map((task) => <TaskRow key={task.id} task={task} showAssignee={view !== "mine"} />)
          )}
        </div>
      )}
    </div>
  );
}
