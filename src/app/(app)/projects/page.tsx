import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getProfiles } from "@/lib/queries";
import { getProjects, getProjectStatusCounts } from "@/lib/queries-projects";
import { ProjectRow } from "@/components/projects/project-row";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { SearchBox } from "@/components/communication/search-box";
import { NotAuthorized } from "@/components/home/not-authorized";
import { PROJECT_STATUS_LABELS, type ProjectStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_STATUSES: ProjectStatus[] = ["planning", "active", "completed", "cancelled"];

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!(await hasCapability(profile, "projects"))) return <NotAuthorized title="Projects" />;

  const params = await searchParams;
  const statusParam = typeof params.status === "string" ? (params.status as ProjectStatus) : undefined;
  const status = statusParam && ALL_STATUSES.includes(statusParam) ? statusParam : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;

  const [projects, statusCounts, profiles] = await Promise.all([
    getProjects({ status, search }),
    getProjectStatusCounts(),
    getProfiles(),
  ]);

  const total = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0);
  const tabHref = (s?: ProjectStatus) => (s ? `/projects?status=${s}` : "/projects");

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Projects</h1>
          <p className="mt-1 text-[14px] text-[#5a616c]">Multi-task initiatives — a Project groups Tasks toward one goal.</p>
        </div>
        <NewProjectDialog profiles={profiles} defaultOwnerId={profile.id} />
      </div>

      <div className="mt-4 max-w-sm">
        <SearchBox basePath="/projects" placeholder="Search projects…" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
        <Link
          href={tabHref()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            !status ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          All <span className="opacity-80">{total}</span>
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
              status === s ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
            )}
          >
            {PROJECT_STATUS_LABELS[s]} <span className="opacity-80">{statusCounts[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-[13.5px] text-[#9aa0a8]">
        {projects.length} project{projects.length === 1 ? "" : "s"}
      </p>

      <div className="mt-2.5 space-y-2.5">
        {projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
            No projects match this filter.
          </p>
        ) : (
          projects.map((project) => <ProjectRow key={project.id} project={project} />)
        )}
      </div>
    </div>
  );
}
