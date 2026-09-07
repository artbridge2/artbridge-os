import { ShoppingBag } from "lucide-react";
import { CasePriorityBadge, CaseStatusBadge } from "@/components/communication/case-status-badge";
import { CategoryEditor } from "@/components/communication/category-editor";
import { EditableTitle } from "@/components/shared/editable-title";
import { setSubjectOverride } from "@/actions/inbox";
import { CATEGORY_STYLE, initials, senderDisplayName } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import { issueTypeLabel, threadReference, type EmailThreadWithRelations } from "@/lib/types";
import type { ShopifyCustomerMatch } from "@/lib/shopify/lookup";

export function TicketHeader({ thread, shopifyMatch }: { thread: EmailThreadWithRelations; shopifyMatch?: ShopifyCustomerMatch | null }) {
  const style = CATEGORY_STYLE[thread.category];
  const name = senderDisplayName(thread);
  const issueLabel = issueTypeLabel(thread.issue_type);
  const title = thread.subject_override ?? thread.subject ?? "(no subject)";

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
          style={{ backgroundColor: style.iconBg, color: style.iconColor }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium" style={{ color: style.iconColor }}>
            <CategoryEditor threadId={thread.id} category={thread.category} />
            {issueLabel && <span className="text-[#9aa0a8]"> · {issueLabel}</span>}
          </p>
          <EditableTitle title={title} onSave={setSubjectOverride.bind(null, thread.id)} />
          <p className="text-[13.5px] text-[#8a909a]">
            {name}
            {thread.sender && thread.sender !== name && <> · {thread.sender}</>}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <CasePriorityBadge priority={thread.priority} />
          <CaseStatusBadge status={thread.status} />
          <span className="text-[13.5px] font-semibold text-[#12181f]">{threadReference(thread)}</span>
        </div>
        <p className="text-[12.5px] text-[#9aa0a8]">
          {thread.owner ? `Owner: ${thread.owner.full_name}` : "Unassigned"} · Created {formatElapsedEn(thread.created_at)}
        </p>
        {shopifyMatch && (
          <a
            href={shopifyMatch.adminUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-md bg-[#e5f7ed] px-2 py-1 text-[12px] font-medium text-[#1c9a52] hover:bg-[#d7f0e0]"
          >
            <ShoppingBag className="size-3" />
            {shopifyMatch.name} · {shopifyMatch.ordersCount} order{shopifyMatch.ordersCount === 1 ? "" : "s"}
          </a>
        )}
      </div>
    </div>
  );
}
