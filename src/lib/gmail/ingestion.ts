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
  /^(no-?reply|do-?not-?reply|notifications?|updates?|newsletter|digest|mailer-?daemon|alerts?|bounces?|postmaster|automated|donotreply|no-reply-\w+)@/i;

/**
 * Sending infrastructure for transactional/marketing email platforms — these
 * domains are ESP (email service provider) plumbing regardless of which
 * business is using the platform, so matching on the domain itself is safe
 * and business-agnostic (spec point 2: "Shopify/Klaviyo/Meta automatikus
 * értesítések... más biztonsággal felismerhető automatizált levelek").
 * Deliberately conservative — only well-known bulk/transactional-mail
 * infrastructure, never a guess at a specific business's own domain.
 */
const AUTOMATED_SENDING_DOMAINS = [
  /(^|\.)klaviyo\.com$/i,
  /(^|\.)klaviyomail\.com$/i,
  /(^|\.)e\.klaviyo\.com$/i,
  /(^|\.)mail\.shopify\.com$/i,
  /(^|\.)shopifyemail\.com$/i,
  /(^|\.)facebookmail\.com$/i,
  /(^|\.)mail\.instagram\.com$/i,
  /(^|\.)mandrillapp\.com$/i,
  /(^|\.)sendgrid\.net$/i,
  /(^|\.)amazonses\.com$/i,
  /(^|\.)sparkpostmail\.com$/i,
  // Found live during the reconciliation pass — real, confirmed-automated
  // vendor/system domains for THIS mailbox specifically, not a guess:
  /(^|\.)gls-hungary\.com$/i, // courier scheduled reports/auto-replies, no human on the other end
  /(^|\.)wshostmag\.com$/i, // Artbridge's OWN dev/staging system sending itself test emails
  /(^|\.)hellorep\.ai$/i, // third-party AI-support vendor's marketing/billing mail
  /(^|\.)godaddy\.com$/i, // domain registrar renewal notices
  /(^|\.)szamlazz\.hu$/i, // Hungarian invoicing SaaS, transactional only
  /(^|\.)billingo\.com$/i,
  /(^|\.)sendtric\.com$/i,
  /(^|\.)optimonk\.com$/i,
];

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

  if (domain && AUTOMATED_SENDING_DOMAINS.some((pattern) => pattern.test(domain))) {
    return { suppressed: true, ruleMatched: false, reason: "heuristic:automated-sending-domain" };
  }

  // A "noreply."-prefixed subdomain (e.g. noreply.telekom.hu) is as reliable
  // a signal as a noreply@ local-part — the earlier local-part-only check
  // missed this shape entirely.
  if (domain && /^no-?reply\./i.test(domain)) {
    return { suppressed: true, ruleMatched: false, reason: "heuristic:automated-sending-domain" };
  }

  return { suppressed: false, ruleMatched: false, reason: "default:create" };
}
