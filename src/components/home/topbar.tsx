import { Search } from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";
import { AccountMenu } from "@/components/home/account-menu";
import type { Notification, Profile } from "@/lib/types";

export function Topbar({
  profile,
  notifications,
  canSeeSettings,
}: {
  profile: Profile;
  notifications: Notification[];
  canSeeSettings: boolean;
}) {
  return (
    <header className="flex h-[76px] shrink-0 items-center gap-4 px-8">
      <div className="flex h-[46px] flex-1 items-center gap-2.5 rounded-xl bg-[#f4f4f4] px-4">
        <Search className="size-[18px] text-[#9aa0a8]" />
        <span className="text-[14px] text-[#9aa0a8]">Search anything...</span>
      </div>

      <NotificationsBell notifications={notifications} />

      <AccountMenu fullName={profile.full_name} role={profile.role} canSeeSettings={canSeeSettings} />
    </header>
  );
}
