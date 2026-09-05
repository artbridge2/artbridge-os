import { CASE_STATUS_STYLE } from "@/lib/communication-style";
import { CASE_STATUS_LABELS, type CaseStatus } from "@/lib/types";

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
