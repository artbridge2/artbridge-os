import { CasePriorityBadge, CaseStatusBadge } from "@/components/communication/case-status-badge";
import { CATEGORY_STYLE, initials, senderDisplayName } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import { CATEGORY_LABELS_SINGULAR, issueTypeLabel, threadReference, type EmailThreadWithRelations } from "@/lib/types";

export function TicketHeader({ thread }: { thread: EmailThreadWithRelations }) {
  const style = CATEGORY_STYLE[thread.category];
  const name = senderDisplayName(thread);
  const issueLabel = issueTypeLabel(thread.issue_type);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
          style={{ backgroundColor: style.iconBg, color: style.iconColor }}
        >
          {initials(name)}
        </span>
        <div>
          <p className="text-[13px] font-medium" style={{ color: style.iconColor }}>
            {CATEGORY_LABELS_SINGULAR[thread.category]}
            {issueLabel && <span className="text-[#9aa0a8]"> · {issueLabel}</span>}
          </p>
          <p className="text-[19px] font-semibold text-[#12181f]">{name}</p>
          {thread.sender && thread.sender !== name && (
            <p className="text-[13.5px] text-[#8a909a]">{thread.sender}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <CasePriorityBadge priority={thread.priority} />
          <CaseStatusBadge status={thread.status} />
          <span className="text-[13.5px] font-semibold text-[#12181f]">{threadReference(thread)}</span>
        </div>
        <p className="text-[12.5px] text-[#9aa0a8]">Created {formatElapsedEn(thread.created_at)}</p>
      </div>
    </div>
  );
}
