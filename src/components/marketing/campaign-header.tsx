import { Megaphone } from "lucide-react";
import { CampaignPriorityBadge, CampaignStatusBadge } from "@/components/marketing/campaign-badges";
import type { MarketingCampaignWithRelations } from "@/lib/types";

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function CampaignHeader({ campaign }: { campaign: MarketingCampaignWithRelations }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#fdecd9] text-[#e8952a]">
          <Megaphone className="size-5" />
        </span>
        <div>
          <p className="text-[13px] font-medium text-[#e8952a]">Campaign</p>
          <p className="text-[19px] font-semibold text-[#12181f]">{campaign.name}</p>
          {campaign.brief && <p className="mt-0.5 max-w-lg text-[13.5px] text-[#5a616c]">{campaign.brief}</p>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <CampaignPriorityBadge priority={campaign.priority} />
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <p className="text-[12.5px] text-[#9aa0a8]">
          {campaign.start_date && campaign.end_date
            ? `${formatDate(campaign.start_date)} – ${formatDate(campaign.end_date)}`
            : campaign.start_date
              ? `Starts ${formatDate(campaign.start_date)}`
              : campaign.end_date
                ? `Ends ${formatDate(campaign.end_date)}`
                : "No dates set"}
        </p>
        {campaign.owner && <p className="text-[12.5px] text-[#9aa0a8]">Owner: {campaign.owner.full_name}</p>}
      </div>
    </div>
  );
}
