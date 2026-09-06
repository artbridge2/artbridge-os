"use client";

import { postCampaignComment } from "@/actions/marketing";
import { Discussion } from "@/components/shared/discussion";
import type { MarketingCampaignComment, Profile } from "@/lib/types";

export function CampaignDiscussion({
  campaignId,
  campaignName,
  comments,
  profiles,
}: {
  campaignId: string;
  campaignName: string;
  comments: (MarketingCampaignComment & { author: Profile | null })[];
  profiles: Profile[];
}) {
  return (
    <Discussion
      placeholder="Discuss this campaign…"
      comments={comments}
      profiles={profiles}
      onPost={(body, mentionedProfileIds) => postCampaignComment(campaignId, body, campaignName, mentionedProfileIds)}
    />
  );
}
