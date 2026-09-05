"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";

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
