import { FileText } from "lucide-react";
import { ContentStatusBadge, ContentTypeBadge } from "@/components/marketing/content-badges";
import type { ContentItemWithRelations } from "@/lib/types";

export function ContentHeader({ item }: { item: ContentItemWithRelations }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#e3f0fd] text-[#3b82f6]">
          <FileText className="size-5" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-[#3b82f6]">{item.campaign ? item.campaign.name : "No campaign"}</p>
          <p className="text-[19px] font-semibold text-[#12181f]">{item.title}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <ContentTypeBadge type={item.content_type} />
          <ContentStatusBadge status={item.status} />
        </div>
        <p className="text-[12.5px] text-[#9aa0a8]">
          {item.publish_date ? `Publish: ${new Date(item.publish_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : "No publish date set"}
        </p>
        {item.owner && <p className="text-[12.5px] text-[#9aa0a8]">Owner: {item.owner.full_name}</p>}
      </div>
    </div>
  );
}
