import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getAreas, getProfiles, getTasks } from "@/lib/queries";
import { getProjectById, getProjectComments } from "@/lib/queries-projects";
import { ProjectHeader } from "@/components/projects/project-header";
import { ProjectTasks } from "@/components/projects/project-tasks";
import { ProjectDiscussion } from "@/components/projects/project-discussion";
import { ProjectSidebar } from "@/components/projects/project-sidebar";
import { NotAuthorized } from "@/components/home/not-authorized";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await getCurrentProfile();
  if (!(await hasCapability(profile, "projects"))) return <NotAuthorized title="Projects" />;

  const { id } = await params;

  const [project, profiles, areas, comments, projectTasks, openTasks] = await Promise.all([
    getProjectById(id),
    getProfiles(),
    getAreas(),
    getProjectComments(id),
    getTasks({ projectId: id }),
    getTasks({ excludeDone: true }),
  ]);

  if (!project) notFound();

  const unlinkedTasks = openTasks.filter((t) => !t.project_id).slice(0, 50).map((t) => ({ id: t.id, title: t.title }));

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
          <ArrowLeft className="size-4" />
          Projects
        </Link>

        <ProjectHeader project={project} />

        <ProjectTasks
          projectId={project.id}
          tasks={projectTasks}
          unlinkedTasks={unlinkedTasks}
          profiles={profiles}
          areas={areas}
          defaultOwnerId={project.owner_id ?? profile.id}
        />

        <ProjectDiscussion projectId={project.id} projectName={project.name} comments={comments} profiles={profiles} />
      </div>

      <ProjectSidebar project={project} profiles={profiles} />
    </div>
  );
}
