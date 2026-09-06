import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAreas, getProfiles, getTaskAttachments, getTaskById, getTaskComments } from "@/lib/queries";
import { getProjects } from "@/lib/queries-projects";
import { TaskHeader } from "@/components/tasks/task-header";
import { TaskDescription } from "@/components/tasks/task-description";
import { TaskChecklist } from "@/components/tasks/task-checklist";
import { TaskComments } from "@/components/tasks/task-comments";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { TaskSidebar } from "@/components/tasks/task-sidebar";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, profiles, , comments, attachments, projects] = await Promise.all([
    getTaskById(id),
    getProfiles(),
    getAreas(),
    getTaskComments(id),
    getTaskAttachments(id),
    getProjects(),
  ]);

  if (!task) notFound();

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-4">
        <Link href="/tasks" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
          <ArrowLeft className="size-4" />
          Tasks
        </Link>

        <TaskHeader task={task} />

        <TaskDescription taskId={task.id} description={task.description} />

        <TaskChecklist taskId={task.id} items={task.checklist} />

        <TaskAttachments taskId={task.id} attachments={attachments} />

        <TaskComments taskId={task.id} comments={comments} />
      </div>

      <TaskSidebar task={task} profiles={profiles} projects={projects.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
