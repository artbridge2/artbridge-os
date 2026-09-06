import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";
import { CAPABILITIES, type CapabilityKey } from "@/lib/capabilities-shared";

export { CAPABILITIES, type CapabilityKey };

/** Role default × per-user override, merged. This is the one place "who can do what" is decided. */
export async function getEffectiveCapabilities(profile: Pick<Profile, "id" | "role">): Promise<Record<CapabilityKey, boolean>> {
  const supabase = await createClient();
  const [{ data: roleRows }, { data: overrideRows }] = await Promise.all([
    supabase.from("role_capabilities").select("capability, allowed").eq("role", profile.role),
    supabase.from("profile_capability_overrides").select("capability, allowed").eq("profile_id", profile.id),
  ]);

  const result = {} as Record<CapabilityKey, boolean>;
  for (const cap of CAPABILITIES) result[cap.key] = false;
  for (const row of roleRows ?? []) {
    if (row.capability in result) result[row.capability as CapabilityKey] = row.allowed;
  }
  for (const row of overrideRows ?? []) {
    if (row.capability in result) result[row.capability as CapabilityKey] = row.allowed;
  }
  return result;
}

export async function hasCapability(profile: Pick<Profile, "id" | "role">, capability: CapabilityKey): Promise<boolean> {
  const caps = await getEffectiveCapabilities(profile);
  return caps[capability];
}

/** True if any Communication category is accessible — the real gate for the module's own pages, not just the sidebar link. */
export async function canAccessCommunication(profile: Pick<Profile, "id" | "role">): Promise<boolean> {
  const caps = await getEffectiveCapabilities(profile);
  return (
    caps.communications_customer ||
    caps.communications_artist ||
    caps.communications_developer ||
    caps.communications_supplier ||
    caps.communications_other
  );
}

/** Same-role default capabilities, ignoring per-user overrides — used by the Team & Permissions matrix. */
export async function getRoleCapabilityMatrix(): Promise<Record<Role, Record<CapabilityKey, boolean>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("role_capabilities").select("role, capability, allowed");

  const matrix = {} as Record<Role, Record<CapabilityKey, boolean>>;
  for (const role of ["adam", "eszter", "kurator"] as Role[]) {
    matrix[role] = {} as Record<CapabilityKey, boolean>;
    for (const cap of CAPABILITIES) matrix[role][cap.key] = false;
  }
  for (const row of data ?? []) {
    const role = row.role as Role;
    if (matrix[role] && row.capability in matrix[role]) {
      matrix[role][row.capability as CapabilityKey] = row.allowed;
    }
  }
  return matrix;
}

export interface ProfileOverride {
  profile_id: string;
  capability: CapabilityKey;
  allowed: boolean;
}

export async function getProfileOverrides(profileId: string): Promise<ProfileOverride[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_capability_overrides")
    .select("profile_id, capability, allowed")
    .eq("profile_id", profileId);
  return (data ?? []) as ProfileOverride[];
}
