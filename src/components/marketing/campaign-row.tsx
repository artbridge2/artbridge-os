import { Megaphone } from "lucide-react";
import { CampaignPriorityBadge, CampaignStatusBadge } from "@/components/marketing/campaign-badges";
import { OpenButton } from "@/components/home/open-button";
import type { MarketingCampaignWithRelations } from "@/lib/types";

function dateRange(campaign: MarketingCampaignWithRelations): string {
  if (!campaign.start_date && !campaign.end_date) return "No dates set";
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (campaign.start_date && campaign.end_date) return `${fmt(campaign.start_date)} – ${fmt(campaign.end_date)}`;
  return fmt(campaign.start_date ?? campaign.end_date!);
}

export function CampaignRow({ campaign }: { campaign: MarketingCampaignWithRelations }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fdecd9] text-[#e8952a]">
        <Megaphone className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-[#12181f]">{campaign.name}</p>
          <CampaignPriorityBadge priority={campaign.priority} />
        </div>
        <p className="truncate text-[13px] text-[#8a909a]">{campaign.brief || "No brief yet"}</p>
      </div>

      <div className="w-28 shrink-0 text-right text-[13px] text-[#9aa0a8]">{dateRange(campaign)}</div>

      <div className="w-24 shrink-0 text-right text-[13px] text-[#5a616c]">{campaign.owner?.full_name ?? "Unassigned"}</div>

      <CampaignStatusBadge status={campaign.status} />

      <OpenButton href={`/marketing/campaigns/${campaign.id}`} />
    </div>
  );
}
