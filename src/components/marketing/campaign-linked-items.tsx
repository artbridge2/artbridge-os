import Link from "next/link";
import { OpenButton } from "@/components/home/open-button";
import { AddLinkedItemDialog } from "@/components/marketing/add-linked-item-dialog";
import { CAMPAIGN_LINK_TYPE_LABELS, type CampaignLinkType, type CampaignLinkedItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPES: CampaignLinkType[] = ["content", "email", "seo"];

export function CampaignLinkedItems({
  campaignId,
  items,
  counts,
  activeType,
}: {
  campaignId: string;
  items: CampaignLinkedItem[];
  counts: { all: number; content: number; email: number; seo: number };
  activeType?: CampaignLinkType;
}) {
  const filtered = activeType ? items.filter((i) => i.type === activeType) : items;
  const tabHref = (type?: CampaignLinkType) =>
    type ? `/marketing/campaigns/${campaignId}?type=${type}` : `/marketing/campaigns/${campaignId}`;

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Linked work</p>
        <AddLinkedItemDialog />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Link
          href={tabHref()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium",
            !activeType ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          All <span className="opacity-80">{counts.all}</span>
        </Link>
        {TYPES.map((type) => (
          <Link
            key={type}
            href={tabHref(type)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[13px] font-medium",
              activeType === type ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
            )}
          >
            {CAMPAIGN_LINK_TYPE_LABELS[type]} <span className="opacity-80">{counts[type]}</span>
          </Link>
        ))}
      </div>

      <div className="mt-3 space-y-2">
        {filtered.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#e4e4e4] py-6 text-center text-[13px] text-[#9aa0a8]">
            {counts.all === 0
              ? "No linked work yet — Content, Email and SEO items will appear here once those modules exist."
              : "No linked items in this category."}
          </p>
        ) : (
          filtered.map((item) => (
            <div key={item.link_id} className="flex items-center gap-3 rounded-lg border border-[#eeeeee] px-3 py-2.5">
              <span className="w-16 shrink-0 text-[12px] font-medium uppercase tracking-wide text-[#9aa0a8]">
                {CAMPAIGN_LINK_TYPE_LABELS[item.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[#12181f]">{item.title}</p>
                <p className="truncate text-[12.5px] text-[#8a909a]">
                  {[item.status, item.owner, item.date].filter(Boolean).join(" · ")}
                </p>
              </div>
              <OpenButton href={item.href} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
