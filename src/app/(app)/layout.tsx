import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/dal";
import { getCommunicationCategoryCounts } from "@/lib/queries-inbox";
import { getNotifications } from "@/lib/queries-notifications";
import { getTasks } from "@/lib/queries";
import { getArtistAttentionItems } from "@/lib/attention";
import { getCampaignStatusCounts } from "@/lib/queries-marketing";
import { hasCapability } from "@/lib/permissions";
import { AppSidebar } from "@/components/home/app-sidebar";
import { Topbar } from "@/components/home/topbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  const [communicationCounts, notifications, myTasks, artistAttentionItems, campaignStatusCounts, canSeeSettings] = await Promise.all([
    profile.role === "kurator" ? Promise.resolve(undefined) : getCommunicationCategoryCounts(profile.id),
    getNotifications(profile.id),
    getTasks({ ownerId: profile.id, excludeDone: true }),
    getArtistAttentionItems(profile.id),
    getCampaignStatusCounts(),
    hasCapability(profile, "settings_view"),
  ]);

  return (
    <div className="flex min-h-screen w-full bg-[#fbfbfb]">
      <AppSidebar
        role={profile.role}
        communicationCounts={communicationCounts}
        taskCount={myTasks.length}
        artistCount={artistAttentionItems.length}
        activeCampaignCount={campaignStatusCounts.active ?? 0}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} notifications={notifications} canSeeSettings={canSeeSettings} />
        <main className="flex-1 px-8 pb-10">{children}</main>
      </div>
    </div>
  );
}
