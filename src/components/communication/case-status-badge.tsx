import { CASE_STATUS_STYLE, PRIORITY_STYLE } from "@/lib/communication-style";
import { CASE_STATUS_LABELS, CASE_PRIORITY_LABELS, type CasePriority, type CaseStatus } from "@/lib/types";

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const style = CASE_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {CASE_STATUS_LABELS[status]}
    </span>
  );
}

/** Only rendered for High/Urgent — Normal/Low priority is not visually prominent (spec §12: urgent cases are visually prominent). */
export function CasePriorityBadge({ priority }: { priority: CasePriority }) {
  if (priority === "low" || priority === "normal") return null;
  const style = PRIORITY_STYLE[priority];
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {CASE_PRIORITY_LABELS[priority]}
    </span>
  );
}
