import "server-only";
import { createClient } from "@/lib/supabase/server";

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
