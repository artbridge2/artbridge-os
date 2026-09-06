import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Approximate $/million-tokens — NOT guaranteed current. Verify against
 * console.anthropic.com/settings/billing and update here if rates change.
 * Missing a model just means estimated_cost_usd is left null (never a
 * fabricated number) rather than blocking usage logging.
 */
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 1, output: 5 },
  "claude-sonnet-5": { input: 3, output: 15 },
};

function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number | null {
  const rates = PRICING_PER_MTOK[model];
  if (!rates) return null;
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

export interface AiUsageMeta {
  /** e.g. "communication_classify", "communication_draft", "artist_outreach_draft" */
  capability: string;
  relatedObjectId?: string | null;
}

async function logUsage(meta: AiUsageMeta, model: string, inputTokens: number, outputTokens: number, latencyMs: number, success: boolean, errorMessage: string | null) {
  try {
    const admin = createAdminClient();
    await admin.from("ai_usage_log").insert({
      capability: meta.capability,
      provider: "anthropic",
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_usd: estimateCostUsd(model, inputTokens, outputTokens),
      related_object_id: meta.relatedObjectId ?? null,
      latency_ms: latencyMs,
      success,
      error_message: errorMessage,
    });
  } catch (err) {
    // Logging must never break the real AI call it's observing.
    console.error("[ai usage log] failed to record usage", err);
  }
}

/**
 * Wraps one Anthropic messages.create call with usage logging. Best-effort —
 * a logging failure never masks the real response or error. Never stores
 * prompt/response content, only token counts and a short error message.
 */
export async function loggedCreate(
  client: Anthropic,
  params: Anthropic.MessageCreateParamsNonStreaming,
  meta: AiUsageMeta
): Promise<Anthropic.Message> {
  const startedAt = Date.now();
  try {
    const response = await client.messages.create(params);
    void logUsage(meta, params.model, response.usage.input_tokens, response.usage.output_tokens, Date.now() - startedAt, true, null);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500);
    void logUsage(meta, params.model, 0, 0, Date.now() - startedAt, false, message);
    throw err;
  }
}
