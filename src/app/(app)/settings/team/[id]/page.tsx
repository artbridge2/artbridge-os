import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { hasCapability, getRoleCapabilityMatrix, getProfileOverrides, type CapabilityKey } from "@/lib/permissions";
import { ProfilePermissions } from "@/components/settings/profile-permissions";

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getCurrentProfile();
  const canManage = await hasCapability(viewer, "settings_team");
  if (!canManage) redirect("/settings");

  const [profiles, matrix, overrides] = await Promise.all([getProfiles(), getRoleCapabilityMatrix(), getProfileOverrides(id)]);
  const profile = profiles.find((p) => p.id === id);
  if (!profile) notFound();

  const overrideMap: Partial<Record<CapabilityKey, boolean>> = {};
  for (const o of overrides) overrideMap[o.capability] = o.allowed;

  return (
    <div className="max-w-2xl space-y-4 pt-6">
      <Link href="/settings/team" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
        <ArrowLeft className="size-4" />
        Team
      </Link>

      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-[#12181f]">{profile.full_name}</h1>
        <p className="mt-0.5 text-[13.5px] text-[#8a909a]">{profile.email}</p>
      </div>

      <ProfilePermissions profile={profile} roleDefaults={matrix[profile.role]} overrides={overrideMap} />
    </div>
  );
}
