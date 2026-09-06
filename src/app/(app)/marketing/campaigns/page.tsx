import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getProfiles } from "@/lib/queries";
import { getCampaigns, getCampaignStatusCounts } from "@/lib/queries-marketing";
import { CampaignRow } from "@/components/marketing/campaign-row";
import { NewCampaignDialog } from "@/components/marketing/new-campaign-dialog";
import { SearchBox } from "@/components/communication/search-box";
import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_STATUSES: CampaignStatus[] = ["planning", "active", "completed", "cancelled"];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const canManage = await hasCapability(profile, "marketing_manage");

  const statusParam = typeof params.status === "string" ? (params.status as CampaignStatus) : undefined;
  const status = statusParam && ALL_STATUSES.includes(statusParam) ? statusParam : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;

  const [campaigns, statusCounts, profiles] = await Promise.all([
    getCampaigns({ status, search }),
    getCampaignStatusCounts(),
    getProfiles(),
  ]);

  const total = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0);

  const tabHref = (s?: CampaignStatus) => (s ? `/marketing/campaigns?status=${s}` : "/marketing/campaigns");

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Campaigns</h1>
          <p className="mt-1 text-[14px] text-[#5a616c]">Coordinated marketing initiatives across Content, Email and SEO.</p>
        </div>
        {canManage && <NewCampaignDialog profiles={profiles} defaultOwnerId={profile.id} />}
      </div>

      <div className="mt-4 max-w-sm">
        <SearchBox basePath="/marketing/campaigns" placeholder="Search campaigns…" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
        <Link
          href={tabHref()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            !status ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          All <span className="opacity-80">{total}</span>
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
              status === s ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
            )}
          >
            {CAMPAIGN_STATUS_LABELS[s]} <span className="opacity-80">{statusCounts[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-[13.5px] text-[#9aa0a8]">
        {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"}
      </p>

      <div className="mt-2.5 space-y-2.5">
        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
            No campaigns match this filter.
          </p>
        ) : (
          campaigns.map((campaign) => <CampaignRow key={campaign.id} campaign={campaign} />)
        )}
      </div>
    </div>
  );
}
