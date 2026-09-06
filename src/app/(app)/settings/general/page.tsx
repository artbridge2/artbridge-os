import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getWorkspaceSettings } from "@/lib/queries-settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";

export default async function GeneralSettingsPage() {
  const profile = await getCurrentProfile();
  const canManage = await hasCapability(profile, "settings_team");
  if (!(await hasCapability(profile, "settings_view"))) redirect("/");

  const settings = await getWorkspaceSettings();

  return (
    <div className="max-w-2xl space-y-6 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">External services, capabilities, and administrative control.</p>
      </div>

      <SettingsTabs active="/settings/general" showAdmin={canManage} />

      {canManage ? (
        <GeneralSettingsForm settings={settings} />
      ) : (
        <div className="rounded-2xl border border-[#eeeeee] bg-white p-4 text-[13.5px] text-[#5a616c]">
          <p>{settings.company_name} · {settings.locale} · {settings.timezone}</p>
        </div>
      )}
    </div>
  );
}
