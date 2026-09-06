import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/dal";
import { getCommunicationCategoryCounts } from "@/lib/queries-inbox";
import { getNotifications } from "@/lib/queries-notifications";
import { getTasks } from "@/lib/queries";
import { AppSidebar } from "@/components/home/app-sidebar";
import { Topbar } from "@/components/home/topbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  const [communicationCounts, notifications, myTasks] = await Promise.all([
    profile.role === "kurator" ? Promise.resolve(undefined) : getCommunicationCategoryCounts(profile.id),
    getNotifications(profile.id),
    getTasks({ ownerId: profile.id, excludeDone: true }),
  ]);

  return (
    <div className="flex min-h-screen w-full bg-[#fbfbfb]">
      <AppSidebar role={profile.role} communicationCounts={communicationCounts} taskCount={myTasks.length} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={profile.role} notifications={notifications} />
        <main className="flex-1 px-8 pb-10">{children}</main>
      </div>
    </div>
  );
}
