import { FolderKanban } from "lucide-react";
import { ProjectPriorityBadge, ProjectStatusBadge } from "@/components/projects/project-badges";
import { OpenButton } from "@/components/home/open-button";
import type { ProjectWithRelations } from "@/lib/types";

function dateRange(project: ProjectWithRelations): string {
  if (!project.start_date && !project.end_date) return "No dates set";
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (project.start_date && project.end_date) return `${fmt(project.start_date)} – ${fmt(project.end_date)}`;
  return fmt(project.start_date ?? project.end_date!);
}

export function ProjectRow({ project }: { project: ProjectWithRelations }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#ece9fd] text-[#6c5ce7]">
        <FolderKanban className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-[#12181f]">{project.name}</p>
          <ProjectPriorityBadge priority={project.priority} />
        </div>
        <p className="truncate text-[13px] text-[#8a909a]">{project.description || "No description yet"}</p>
      </div>

      <div className="w-28 shrink-0 text-right text-[13px] text-[#9aa0a8]">{dateRange(project)}</div>

      <div className="w-24 shrink-0 text-right text-[13px] text-[#5a616c]">{project.owner?.full_name ?? "Unassigned"}</div>

      <ProjectStatusBadge status={project.status} />

      <OpenButton href={`/projects/${project.id}`} />
    </div>
  );
}
