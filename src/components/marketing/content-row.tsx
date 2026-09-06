import { FileText } from "lucide-react";
import { ContentStatusBadge, ContentTypeBadge } from "@/components/marketing/content-badges";
import { OpenButton } from "@/components/home/open-button";
import type { ContentItemWithRelations } from "@/lib/types";

export function ContentRow({ item }: { item: ContentItemWithRelations }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f0fd] text-[#3b82f6]">
        <FileText className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-[#12181f]">{item.title}</p>
          <ContentTypeBadge type={item.content_type} />
        </div>
        <p className="truncate text-[13px] text-[#8a909a]">{item.campaign?.name ?? "No campaign"}</p>
      </div>

      <div className="w-24 shrink-0 text-right text-[13px] text-[#9aa0a8]">
        {item.publish_date ? new Date(item.publish_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "No date"}
      </div>

      <div className="w-24 shrink-0 text-right text-[13px] text-[#5a616c]">{item.owner?.full_name ?? "Unassigned"}</div>

      <ContentStatusBadge status={item.status} />

      <OpenButton href={`/marketing/content/${item.id}`} />
    </div>
  );
}
