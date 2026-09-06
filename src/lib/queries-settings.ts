import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface IngestionRule {
  id: string;
  rule_type: "never_create" | "always_create";
  match_type: "sender" | "domain" | "subject_pattern";
  pattern: string;
  created_at: string;
}

export async function getIngestionRules(): Promise<IngestionRule[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("communication_ingestion_rules")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as IngestionRule[];
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_label: string | null;
  before_summary: string | null;
  after_summary: string | null;
  created_at: string;
}

export async function getAuditLog(limit = 50): Promise<(AuditLogEntry & { actor: Profile | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*, actor:profiles!audit_log_actor_id_fkey(id, full_name, role, email)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as unknown as (AuditLogEntry & { actor: Profile | null })[];
}

export interface WorkspaceSettings {
  company_name: string;
  locale: string;
  timezone: string;
  updated_at: string;
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  const supabase = await createClient();
  const { data } = await supabase.from("workspace_settings").select("company_name, locale, timezone, updated_at").eq("id", true).single();
  return data as WorkspaceSettings;
}
