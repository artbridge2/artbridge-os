import { PRIORITY_STYLE } from "@/lib/communication-style";
import { PROJECT_STATUS_STYLE } from "@/lib/project-style";
import { CASE_PRIORITY_LABELS, PROJECT_STATUS_LABELS, type ProjectStatus, type TaskPriority } from "@/lib/types";

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const style = PROJECT_STATUS_STYLE[status];
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium" style={{ backgroundColor: style.bg, color: style.color }}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

/** Only rendered for High/Urgent, matching Communication/Campaign's convention of keeping Normal/Low visually quiet. */
export function ProjectPriorityBadge({ priority }: { priority: TaskPriority }) {
  if (priority === "low" || priority === "normal") return null;
  const style = PRIORITY_STYLE[priority];
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-semibold uppercase tracking-wide" style={{ backgroundColor: style.bg, color: style.color }}>
      {CASE_PRIORITY_LABELS[priority]}
    </span>
  );
}
