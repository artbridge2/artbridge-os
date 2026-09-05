import { CasePriorityBadge, CaseStatusBadge } from "@/components/communication/case-status-badge";
import { OpenButton } from "@/components/home/open-button";
import { CATEGORY_STYLE } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import { CATEGORY_LABELS_SINGULAR, type EmailThreadWithRelations } from "@/lib/types";

export function ConversationRow({ thread }: { thread: EmailThreadWithRelations }) {
  const style = CATEGORY_STYLE[thread.category];
  const Icon = style.icon;
  const when = thread.last_message_at ?? thread.created_at;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
      <span className="h-full min-h-14 w-1 shrink-0 self-stretch rounded-full" style={{ backgroundColor: style.barColor }} />
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: style.iconBg }}>
        <Icon className="size-[18px]" style={{ color: style.iconColor }} />
      </span>

      <div className="w-32 shrink-0">
        <p className="text-[12.5px] text-[#9aa0a8]">{CATEGORY_LABELS_SINGULAR[thread.category]}</p>
        <p className="truncate text-[13.5px] font-medium text-[#3d4451]">{thread.sender ?? "Unknown"}</p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-[#12181f]">{thread.subject ?? "(no subject)"}</p>
          <CasePriorityBadge priority={thread.priority} />
        </div>
        <p className="truncate text-[13px] text-[#8a909a]">{thread.snippet ?? thread.ai_summary ?? ""}</p>
      </div>

      <div className="flex w-32 shrink-0 flex-col items-end gap-1.5">
        <p className="text-[13px] text-[#9aa0a8]">{formatElapsedEn(when)}</p>
        <CaseStatusBadge status={thread.status} />
      </div>

      <OpenButton href={`/communication/${thread.id}`} />
    </div>
  );
}
