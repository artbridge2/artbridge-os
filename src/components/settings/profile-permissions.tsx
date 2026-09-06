"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProfileOverride, updateProfileRole } from "@/actions/settings";
import { CAPABILITIES, type CapabilityKey } from "@/lib/capabilities-shared";
import { ROLE_LABELS, type Profile, type Role } from "@/lib/types";

const ROLES: Role[] = ["adam", "eszter", "kurator"];

export function ProfilePermissions({
  profile,
  roleDefaults,
  overrides,
}: {
  profile: Profile;
  roleDefaults: Record<CapabilityKey, boolean>;
  overrides: Partial<Record<CapabilityKey, boolean>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeRole(role: Role) {
    startTransition(async () => {
      await updateProfileRole(profile.id, profile.full_name, role, profile.role);
      router.refresh();
    });
  }

  function changeOverride(capability: CapabilityKey, value: string) {
    const allowed = value === "default" ? null : value === "allow";
    startTransition(async () => {
      await setProfileOverride(profile.id, profile.full_name, capability, allowed);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
        <p className="text-[14.5px] font-semibold text-[#12181f]">Role</p>
        <select
          defaultValue={profile.role}
          disabled={pending}
          onChange={(e) => changeRole(e.target.value as Role)}
          className="mt-2 h-9 w-48 rounded-md border border-input bg-transparent px-2 text-[13px]"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
        <p className="text-[14.5px] font-semibold text-[#12181f]">Access</p>
        <p className="mt-1 text-[13px] text-[#8a909a]">
          Role default shown for each capability. Override only when this person specifically needs more or less than their role.
        </p>
        <div className="mt-3 divide-y divide-[#f2f2f2]">
          {CAPABILITIES.map((cap) => {
            const override = overrides[cap.key];
            const value = override === undefined ? "default" : override ? "allow" : "deny";
            return (
              <div key={cap.key} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-[13.5px] text-[#3d4451]">{cap.label}</p>
                  <p className="text-[12px] text-[#9aa0a8]">Role default: {roleDefaults[cap.key] ? "Allowed" : "Not allowed"}</p>
                </div>
                <select
                  value={value}
                  disabled={pending}
                  onChange={(e) => changeOverride(cap.key, e.target.value)}
                  className="h-8 w-40 rounded-md border border-input bg-transparent px-2 text-[12.5px]"
                >
                  <option value="default">Use role default</option>
                  <option value="allow">Always allow</option>
                  <option value="deny">Always deny</option>
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
