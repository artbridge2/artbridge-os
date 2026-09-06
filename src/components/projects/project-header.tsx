import { FolderKanban } from "lucide-react";
import { ProjectPriorityBadge, ProjectStatusBadge } from "@/components/projects/project-badges";
import type { ProjectWithRelations } from "@/lib/types";

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectHeader({ project }: { project: ProjectWithRelations }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#ece9fd] text-[#6c5ce7]">
          <FolderKanban className="size-5" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-[#6c5ce7]">Project</p>
          <p className="text-[19px] font-semibold text-[#12181f]">{project.name}</p>
          {project.description && <p className="mt-0.5 max-w-lg text-[13.5px] text-[#5a616c]">{project.description}</p>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <ProjectPriorityBadge priority={project.priority} />
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="text-[12.5px] text-[#9aa0a8]">
          {project.start_date && project.end_date
            ? `${formatDate(project.start_date)} – ${formatDate(project.end_date)}`
            : project.start_date
              ? `Starts ${formatDate(project.start_date)}`
              : project.end_date
                ? `Ends ${formatDate(project.end_date)}`
                : "No dates set"}
        </p>
        {project.owner && <p className="text-[12.5px] text-[#9aa0a8]">Owner: {project.owner.full_name}</p>}
      </div>
    </div>
  );
}
