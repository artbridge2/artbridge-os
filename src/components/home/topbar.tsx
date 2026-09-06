import { Search } from "lucide-react";
import { NotificationsBell } from "@/components/notifications-bell";
import { AccountMenu } from "@/components/home/account-menu";
import { BackToMeButton } from "@/components/home/back-to-me-button";
import type { Notification, Profile } from "@/lib/types";

export function Topbar({
  profile,
  viewedProfile,
  notifications,
  canSeeSettings,
}: {
  profile: Profile;
  viewedProfile: Profile;
  notifications: Notification[];
  canSeeSettings: boolean;
}) {
  const isViewingOther = viewedProfile.id !== profile.id;

  return (
    <header className="flex h-[76px] shrink-0 items-center gap-4 px-8">
      {isViewingOther && (
        <div className="flex shrink-0 items-center gap-2 rounded-lg bg-[#12181f] px-3 py-1.5 text-white">
          <p className="text-[13px] font-medium">Viewing: {viewedProfile.full_name}</p>
          <BackToMeButton className="flex items-center gap-1 text-[12.5px] text-[#c7c9cc] hover:text-white" />
        </div>
      )}

      <div className="flex h-[46px] flex-1 items-center gap-2.5 rounded-xl bg-[#f4f4f4] px-4">
        <Search className="size-[18px] text-[#9aa0a8]" />
        <span className="text-[14px] text-[#9aa0a8]">Search anything...</span>
      </div>

      <NotificationsBell notifications={notifications} />

      <AccountMenu fullName={profile.full_name} role={profile.role} canSeeSettings={canSeeSettings} />
    </header>
  );
}
