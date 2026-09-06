import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getCampaignById, getCampaignComments, getCampaignLinkedItems } from "@/lib/queries-marketing";
import { CampaignHeader } from "@/components/marketing/campaign-header";
import { CampaignLinkedItems } from "@/components/marketing/campaign-linked-items";
import { CampaignDiscussion } from "@/components/marketing/campaign-discussion";
import { CampaignSidebar } from "@/components/marketing/campaign-sidebar";
import type { CampaignLinkType } from "@/lib/types";

const LINK_TYPES: CampaignLinkType[] = ["content", "email", "seo"];

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const typeParam = typeof sp.type === "string" ? (sp.type as CampaignLinkType) : undefined;
  const activeType = typeParam && LINK_TYPES.includes(typeParam) ? typeParam : undefined;

  const profile = await getCurrentProfile();
  const canManage = profile.role !== "kurator";

  const [campaign, profiles, comments, linked] = await Promise.all([
    getCampaignById(id),
    getProfiles(),
    getCampaignComments(id),
    getCampaignLinkedItems(id),
  ]);

  if (!campaign) notFound();

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-4">
        <Link href="/marketing/campaigns" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
          <ArrowLeft className="size-4" />
          Campaigns
        </Link>

        <CampaignHeader campaign={campaign} />

        <CampaignLinkedItems campaignId={campaign.id} items={linked.items} counts={linked.counts} activeType={activeType} />

        <CampaignDiscussion campaignId={campaign.id} campaignName={campaign.name} comments={comments} />
      </div>

      <CampaignSidebar campaign={campaign} profiles={profiles} canManage={canManage} />
    </div>
  );
}
