import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Persistent, admin-editable AI instructions (Settings spec §28-31). Runtime
 * reads always go through the service-role client so a background job (Gmail
 * sync, cron) can fetch them without a user session — same trust model as
 * gmail_integration/shopify_integration.
 */
export type AiInstructionKey =
  | "global"
  | "communication_business_rules"
  | "communication_routing"
  | "artist_research"
  | "content"
  | "marketing"
  | "email_marketing"
  | "seo";

export interface AiInstruction {
  key: AiInstructionKey;
  label: string;
  body: string;
  version: number;
  updated_by: string | null;
  updated_at: string;
}

/** Runtime fetch — used by the actual AI call sites (provider.ts, artist-research.ts). Never throws: falls back to empty string so a DB hiccup degrades gracefully rather than breaking classification/drafting. */
export async function getAiInstruction(key: AiInstructionKey): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin.from("ai_instructions").select("body").eq("key", key).maybeSingle();
  return data?.body ?? "";
}

/** Admin-facing read for the Settings editor (RLS-scoped, so only admins can list these). */
export async function getAiInstructions(): Promise<AiInstruction[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("ai_instructions").select("*").order("key");
  return (data ?? []) as AiInstruction[];
}

export async function getAiInstructionVersions(key: AiInstructionKey) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_instruction_versions")
    .select("*, changed_by_profile:profiles!ai_instruction_versions_changed_by_fkey(full_name)")
    .eq("instruction_key", key)
    .order("version", { ascending: false });
  return data ?? [];
}
