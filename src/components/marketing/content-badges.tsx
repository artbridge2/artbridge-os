import { CONTENT_STATUS_STYLE } from "@/lib/marketing-style";
import { CONTENT_STATUS_LABELS, CONTENT_TYPE_LABELS, type ContentStatus, type ContentType } from "@/lib/types";

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const style = CONTENT_STATUS_STYLE[status];
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium" style={{ backgroundColor: style.bg, color: style.color }}>
      {CONTENT_STATUS_LABELS[status]}
    </span>
  );
}

export function ContentTypeBadge({ type }: { type: ContentType }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-[#f4f4f4] px-2 text-[12.5px] font-medium text-[#5a616c]">
      {CONTENT_TYPE_LABELS[type]}
    </span>
  );
}
