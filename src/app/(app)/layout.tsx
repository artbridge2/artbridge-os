import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/dal";
import { getCommunicationCategoryCounts } from "@/lib/queries-inbox";
import { getNotifications } from "@/lib/queries-notifications";
import { getTasks } from "@/lib/queries";
import { getArtistAttentionItems } from "@/lib/attention";
import { getCampaignStatusCounts } from "@/lib/queries-marketing";
import { getEffectiveCapabilities } from "@/lib/permissions";
import { AppSidebar } from "@/components/home/app-sidebar";
import { Topbar } from "@/components/home/topbar";
import type { CampaignStatus } from "@/lib/types";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();
  const capabilities = await getEffectiveCapabilities(profile);
  const canSeeCommunication =
    capabilities.communications_customer ||
    capabilities.communications_artist ||
    capabilities.communications_developer ||
    capabilities.communications_supplier ||
    capabilities.communications_other;

  const [communicationCounts, notifications, myTasks, artistAttentionItems, campaignStatusCounts] = await Promise.all([
    canSeeCommunication ? getCommunicationCategoryCounts(profile.id) : Promise.resolve(undefined),
    getNotifications(profile.id),
    getTasks({ ownerId: profile.id, excludeDone: true }),
    capabilities.artists ? getArtistAttentionItems(profile.id) : Promise.resolve([]),
    capabilities.marketing ? getCampaignStatusCounts() : Promise.resolve({} as Partial<Record<CampaignStatus, number>>),
  ]);

  return (
    <div className="flex min-h-screen w-full bg-[#fbfbfb]">
      <AppSidebar
        canSeeCommunication={canSeeCommunication}
        canSeeArtists={capabilities.artists}
        canSeeMarketing={capabilities.marketing}
        canSeeProjects={capabilities.projects}
        canSeeCalendar={capabilities.calendar}
        canSeeTasks={capabilities.tasks}
        communicationCounts={communicationCounts}
        taskCount={myTasks.length}
        artistCount={artistAttentionItems.length}
        activeCampaignCount={campaignStatusCounts.active ?? 0}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar profile={profile} notifications={notifications} canSeeSettings={capabilities.settings_view} />
        <main className="flex-1 px-8 pb-10">{children}</main>
      </div>
    </div>
  );
}
