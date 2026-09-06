import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { hasCapability, getRoleCapabilityMatrix } from "@/lib/permissions";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { RoleCapabilityMatrix } from "@/components/settings/role-capability-matrix";
import { ROLE_LABELS } from "@/lib/types";

export default async function TeamPage() {
  const profile = await getCurrentProfile();
  const canManage = await hasCapability(profile, "settings_team");
  if (!canManage) redirect("/settings");

  const [profiles, matrix] = await Promise.all([getProfiles(), getRoleCapabilityMatrix()]);

  return (
    <div className="max-w-3xl space-y-6 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">External services, capabilities, and administrative control.</p>
      </div>

      <SettingsTabs active="/settings/team" showAdmin={canManage} />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Team</p>
        <div className="mt-2 space-y-2">
          {profiles.map((p) => (
            <Link
              key={p.id}
              href={`/settings/team/${p.id}`}
              className="flex items-center justify-between rounded-xl border border-[#eeeeee] bg-white px-4 py-3 hover:bg-[#f9f9f9]"
            >
              <div>
                <p className="text-[14px] font-medium text-[#12181f]">{p.full_name}</p>
                <p className="text-[12.5px] text-[#8a909a]">{p.email}</p>
              </div>
              <span className="text-[13px] text-[#5a616c]">{ROLE_LABELS[p.role]}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Role defaults</p>
        <p className="mt-1 text-[13px] text-[#8a909a]">
          What each role can access by default. Per-user overrides are set on a team member&apos;s own page.
        </p>
        <div className="mt-2">
          <RoleCapabilityMatrix matrix={matrix} />
        </div>
      </div>
    </div>
  );
}
