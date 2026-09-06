import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayInBudapest } from "@/lib/dates";

export interface AiUsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  costIsPartial: boolean;
}

export interface AiUsageSummary {
  today: AiUsageTotals;
  thisMonth: AiUsageTotals;
  byCapability: (AiUsageTotals & { capability: string })[];
}

function sumRows(rows: { input_tokens: number; output_tokens: number; estimated_cost_usd: number | null }[]): AiUsageTotals {
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCostUsd = 0;
  let costIsPartial = false;
  for (const r of rows) {
    inputTokens += r.input_tokens;
    outputTokens += r.output_tokens;
    if (r.estimated_cost_usd === null) costIsPartial = true;
    else estimatedCostUsd += r.estimated_cost_usd;
  }
  return { calls: rows.length, inputTokens, outputTokens, estimatedCostUsd, costIsPartial };
}

/** Real usage from ai_usage_log — no estimate, no placeholder. Empty until real calls have been logged. */
export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const supabase = await createClient();
  const monthStart = `${todayInBudapest().slice(0, 7)}-01`;

  const { data } = await supabase
    .from("ai_usage_log")
    .select("capability, input_tokens, output_tokens, estimated_cost_usd, created_at")
    .gte("created_at", `${monthStart}T00:00:00Z`)
    .eq("success", true);

  const rows = data ?? [];
  const today = todayInBudapest();
  const todayRows = rows.filter((r) => r.created_at.slice(0, 10) === today);

  const byCapabilityMap = new Map<string, typeof rows>();
  for (const r of rows) {
    const list = byCapabilityMap.get(r.capability) ?? [];
    list.push(r);
    byCapabilityMap.set(r.capability, list);
  }
  const byCapability = [...byCapabilityMap.entries()]
    .map(([capability, capRows]) => ({ capability, ...sumRows(capRows) }))
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

  return {
    today: sumRows(todayRows),
    thisMonth: sumRows(rows),
    byCapability,
  };
}
