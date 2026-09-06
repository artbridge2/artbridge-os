import { PRIORITY_STYLE } from "@/lib/communication-style";
import { CAMPAIGN_STATUS_STYLE } from "@/lib/marketing-style";
import { CAMPAIGN_STATUS_LABELS, CASE_PRIORITY_LABELS, type CampaignStatus, type TaskPriority } from "@/lib/types";

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const style = CAMPAIGN_STATUS_STYLE[status];
  return (
    <span
      className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {CAMPAIGN_STATUS_LABELS[status]}
    </span>
  );
}

/** Only rendered for High/Urgent, matching Communication's convention of keeping Normal/Low visually quiet. */
export function CampaignPriorityBadge({ priority }: { priority: TaskPriority }) {
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
