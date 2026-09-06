import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getAreas, getProfiles, getTasks } from "@/lib/queries";
import { getProjectById, getProjectComments, getProjectDocuments, getProjectEvents } from "@/lib/queries-projects";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectTasks } from "@/components/projects/project-tasks";
import { ProjectDiscussion } from "@/components/projects/project-discussion";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { ProjectFiles } from "@/components/projects/project-files";
import { ProjectActivity } from "@/components/projects/project-activity";
import { TaskBoard } from "@/components/tasks/task-board";
import { NotAuthorized } from "@/components/home/not-authorized";
import { cn } from "@/lib/utils";

type ProjectTab = "overview" | "board" | "work" | "files" | "notes";
const TABS: { key: ProjectTab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "board", label: "Board" },
  { key: "work", label: "Linked work" },
  { key: "files", label: "Files" },
  { key: "notes", label: "Notes & Activity" },
];

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!(await hasCapability(profile, "projects"))) return <NotAuthorized title="Projects" />;

  const { id } = await params;
  const sp = await searchParams;
  const tabParam = typeof sp.tab === "string" ? (sp.tab as ProjectTab) : "overview";
  const tab: ProjectTab = TABS.some((t) => t.key === tabParam) ? tabParam : "overview";

  const [project, profiles, areas, comments, projectTasks, openTasks, documents, events] = await Promise.all([
    getProjectById(id),
    getProfiles(),
    getAreas(),
    getProjectComments(id),
    getTasks({ projectId: id }),
    getTasks({ excludeDone: true, excludeProjectLinked: true }),
    getProjectDocuments(id),
    getProjectEvents(id),
  ]);

  if (!project) notFound();

  const unlinkedTasks = openTasks.filter((t) => !t.project_id).slice(0, 50).map((t) => ({ id: t.id, title: t.title }));
  const doneCount = projectTasks.filter((t) => t.status === "completed").length;

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
          <ArrowLeft className="size-4" />
          Projects
        </Link>

        <ProjectHeader project={project} />

        <div className="flex items-center gap-1 rounded-lg bg-[#f4f4f4] p-1" style={{ width: "fit-content" }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "overview" ? `/projects/${id}` : `/projects/${id}?tab=${t.key}`}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium",
                tab === t.key ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {tab === "overview" && (
          <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
            <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Progress</p>
            <p className="mt-2 text-[22px] font-bold text-[#12181f]">
              {doneCount} / {projectTasks.length} <span className="text-[14px] font-medium text-[#8a909a]">tasks completed</span>
            </p>
            {project.description && <p className="mt-3 text-[13.5px] text-[#5a616c]">{project.description}</p>}
          </div>
        )}

        {tab === "board" && <TaskBoard tasks={projectTasks} showOwner />}

        {tab === "work" && (
          <ProjectTasks
            projectId={project.id}
            tasks={projectTasks}
            unlinkedTasks={unlinkedTasks}
            profiles={profiles}
            areas={areas}
            defaultOwnerId={project.owner_id ?? profile.id}
          />
        )}

        {tab === "files" && <ProjectFiles projectId={project.id} documents={documents} />}

        {tab === "notes" && (
          <>
            <ProjectDiscussion projectId={project.id} projectName={project.name} comments={comments} profiles={profiles} />
            <ProjectActivity events={events} profiles={profiles} />
          </>
        )}
      </div>

      <ProjectSidebar project={project} profiles={profiles} />
    </div>
  );
}
