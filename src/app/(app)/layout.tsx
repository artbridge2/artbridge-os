import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/dal";
import { AppSidebar } from "@/components/home/app-sidebar";
import { Topbar } from "@/components/home/topbar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex min-h-screen w-full bg-[#fbfbfb]">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar role={profile.role} />
        <main className="flex-1 px-8 pb-10">{children}</main>
      </div>
    </div>
  );
}
