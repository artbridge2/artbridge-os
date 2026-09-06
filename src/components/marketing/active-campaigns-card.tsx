import Link from "next/link";
import { CampaignStatusBadge } from "@/components/marketing/campaign-badges";
import type { MarketingCampaignWithRelations } from "@/lib/types";

export function ActiveCampaignsCard({ campaigns }: { campaigns: MarketingCampaignWithRelations[] }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14.5px] font-semibold text-[#12181f]">Active campaigns</p>
        <Link href="/marketing/campaigns?status=active" className="text-[13px] font-medium text-[#3b82f6]">
          View all
        </Link>
      </div>
      <div className="mt-2 divide-y divide-[#f2f2f2]">
        {campaigns.length === 0 ? (
          <p className="py-4 text-[13.5px] text-[#9aa0a8]">No active campaigns right now.</p>
        ) : (
          campaigns.map((c) => (
            <Link key={c.id} href={`/marketing/campaigns/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:opacity-80">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-[#12181f]">{c.name}</p>
                <p className="truncate text-[12.5px] text-[#8a909a]">{c.owner?.full_name ?? "Unassigned"}</p>
              </div>
              <CampaignStatusBadge status={c.status} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
