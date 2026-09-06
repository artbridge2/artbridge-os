"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { CAPABILITIES, type CapabilityKey } from "@/lib/permissions";
import type { AiInstructionKey } from "@/lib/ai/instructions";
import type { Role } from "@/lib/types";

async function requireAdmin() {
  const me = await getCurrentProfile();
  if (me.role === "kurator") throw new Error("NOT_AUTHORIZED");
  return me;
}

async function logAudit(action: string, targetType: string, targetLabel: string | null, before: string | null, after: string | null) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("audit_log").insert({
    actor_id: me.id,
    action,
    target_type: targetType,
    target_label: targetLabel,
    before_summary: before,
    after_summary: after,
  });
}

export async function addIngestionRule(formData: FormData) {
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const ruleType = String(formData.get("rule_type") ?? "");
  const matchType = String(formData.get("match_type") ?? "");
  const pattern = String(formData.get("pattern") ?? "").trim().toLowerCase();
  if (!ruleType || !matchType || !pattern) return;

  await supabase.from("communication_ingestion_rules").insert({
    rule_type: ruleType,
    match_type: matchType,
    pattern,
    created_by: me.id,
  });
  revalidatePath("/settings");
}

export async function deleteIngestionRule(id: string) {
  const supabase = await createClient();
  await supabase.from("communication_ingestion_rules").delete().eq("id", id);
  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Team & Permissions
// ---------------------------------------------------------------------------

export async function setRoleCapability(role: Role, capability: CapabilityKey, allowed: boolean) {
  await requireAdmin();
  const supabase = await createClient();
  const label = CAPABILITIES.find((c) => c.key === capability)?.label ?? capability;

  await supabase.from("role_capabilities").upsert({ role, capability, allowed }, { onConflict: "role,capability" });
  await logAudit("role_capability_changed", "role", `${role} — ${label}`, String(!allowed), String(allowed));
  revalidatePath("/settings/team");
}

export async function setProfileOverride(profileId: string, profileName: string, capability: CapabilityKey, allowed: boolean | null) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const label = CAPABILITIES.find((c) => c.key === capability)?.label ?? capability;

  if (allowed === null) {
    await supabase.from("profile_capability_overrides").delete().eq("profile_id", profileId).eq("capability", capability);
    await logAudit("permission_override_removed", "profile", `${profileName} — ${label}`, null, "role default");
  } else {
    await supabase
      .from("profile_capability_overrides")
      .upsert({ profile_id: profileId, capability, allowed, updated_by: me.id }, { onConflict: "profile_id,capability" });
    await logAudit("permission_override_changed", "profile", `${profileName} — ${label}`, null, String(allowed));
  }
  revalidatePath(`/settings/team/${profileId}`);
}

export async function updateProfileRole(profileId: string, profileName: string, role: Role, previousRole: Role) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", profileId);
  await logAudit("role_changed", "profile", profileName, previousRole, role);
  revalidatePath("/settings/team");
  revalidatePath(`/settings/team/${profileId}`);
}

// ---------------------------------------------------------------------------
// AI instructions
// ---------------------------------------------------------------------------

export async function saveAiInstruction(key: AiInstructionKey, body: string, previousVersion: number) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const newVersion = previousVersion + 1;
  await supabase.from("ai_instruction_versions").insert({ instruction_key: key, version: newVersion, body, changed_by: me.id });
  await supabase.from("ai_instructions").update({ body, version: newVersion, updated_by: me.id, updated_at: new Date().toISOString() }).eq("key", key);
  await logAudit("ai_instruction_changed", "ai_instruction", key, `v${previousVersion}`, `v${newVersion}`);
  revalidatePath("/settings/ai");
  revalidatePath("/settings/ai/instructions");
}

// ---------------------------------------------------------------------------
// General settings
// ---------------------------------------------------------------------------

export async function updateWorkspaceSettings(input: { company_name: string; locale: string; timezone: string }) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("workspace_settings").update({ ...input, updated_by: me.id, updated_at: new Date().toISOString() }).eq("id", true);
  await logAudit("general_settings_changed", "workspace_settings", "General", null, `${input.company_name} · ${input.locale} · ${input.timezone}`);
  revalidatePath("/settings/general");
}

// ---------------------------------------------------------------------------
// Integration connect/disconnect audit hooks (called from the real
// connect/callback routes and a disconnect action)
// ---------------------------------------------------------------------------

export async function disconnectGmail() {
  await requireAdmin();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("gmail_integration").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await logAudit("integration_disconnected", "integration", "Google", "connected", "not_connected");
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
}

export async function disconnectShopify() {
  await requireAdmin();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  await admin.from("shopify_integration").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await logAudit("integration_disconnected", "integration", "Shopify", "connected", "not_connected");
  revalidatePath("/settings");
  revalidatePath("/settings/integrations");
}

export interface StarredCalibrationItem {
  subject: string | null;
  sender: string | null;
  category: string | null;
  status: string | null;
  snippet: string | null;
}

/**
 * One-time bootstrap calibration read — pulls currently-starred Gmail
 * threads (the only reliable Starred signal; Gmail doesn't expose historical
 * star changes) so an admin can review real patterns and manually tune the
 * persistent classification instructions. Not a permanent feature — nothing
 * calls this automatically.
 */
export async function getStarredCalibrationSample(limit = 80): Promise<StarredCalibrationItem[]> {
  await requireAdmin();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { listStarredThreadIds, getThread } = await import("@/lib/gmail/client");
  const { getGmailConnectionStatus } = await import("@/lib/gmail/status");

  const status = await getGmailConnectionStatus();
  if (!status.connected || !status.connectedEmail) return [];

  const admin = createAdminClient();
  const starredIds = (await listStarredThreadIds()).slice(0, limit);

  const { data: known } = await admin
    .from("email_threads")
    .select("gmail_thread_id, subject, sender, category, status, snippet")
    .in("gmail_thread_id", starredIds);

  const knownById = new Map((known ?? []).map((t) => [t.gmail_thread_id, t]));
  const results: StarredCalibrationItem[] = [];

  for (const id of starredIds) {
    const existing = knownById.get(id);
    if (existing) {
      results.push({ subject: existing.subject, sender: existing.sender, category: existing.category, status: existing.status, snippet: existing.snippet });
      continue;
    }
    try {
      const fetched = await getThread(id, status.connectedEmail);
      results.push({ subject: fetched.subject, sender: fetched.messages[0]?.sender ?? null, category: null, status: null, snippet: fetched.snippet });
    } catch (err) {
      console.error("[settings] failed to fetch starred thread for calibration", id, err);
    }
  }

  return results;
}
