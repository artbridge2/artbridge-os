import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface IngestionDecision {
  suppressed: boolean;
  /** Whether an explicit admin rule decided this — takes precedence over any later AI judgment. */
  ruleMatched: boolean;
  reason: string;
}

/**
 * Baseline heuristic for when there's no AI classifier configured yet (or as
 * a fast pre-filter even when there is one). Deliberately narrow: false
 * positives here would silently drop a real message, which the spec
 * explicitly says to avoid — when in doubt, let it through as a case.
 */
const AUTOMATED_SENDER_PATTERN =
  /^(no-?reply|do-?not-?reply|notifications?|updates?|newsletter|digest|mailer-?daemon|alerts?)@/i;

function extractEmail(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

/**
 * Decides whether an incoming message should surface as an active case.
 * Explicit admin rules (Settings > Ingestion rules) always win; the
 * heuristic below only applies when no rule matches.
 */
export async function decideIngestion(input: { sender: string | null; subject: string | null }): Promise<IngestionDecision> {
  const admin = createAdminClient();
  const { data: rules } = await admin
    .from("communication_ingestion_rules")
    .select("rule_type, match_type, pattern");

  const senderEmail = extractEmail(input.sender);
  const domain = senderEmail?.split("@")[1]?.toLowerCase() ?? null;

  for (const rule of rules ?? []) {
    const pattern = rule.pattern.toLowerCase();
    const matches =
      (rule.match_type === "sender" && senderEmail?.toLowerCase() === pattern) ||
      (rule.match_type === "domain" && domain === pattern) ||
      (rule.match_type === "subject_pattern" && !!input.subject?.toLowerCase().includes(pattern));
    if (matches) {
      return {
        suppressed: rule.rule_type === "never_create",
        ruleMatched: true,
        reason: `rule:${rule.match_type}:${rule.pattern}`,
      };
    }
  }

  if (senderEmail && AUTOMATED_SENDER_PATTERN.test(senderEmail)) {
    return { suppressed: true, ruleMatched: false, reason: "heuristic:automated-sender" };
  }

  return { suppressed: false, ruleMatched: false, reason: "default:create" };
}
