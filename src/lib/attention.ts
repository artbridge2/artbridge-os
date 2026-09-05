import "server-only";
import { getEmailThreads } from "@/lib/queries-inbox";
import { CASE_STATUS_LABELS, type TaskPriority } from "@/lib/types";

/**
 * A source-agnostic "needs your attention" row for Home. Derived at query
 * time from each module's own data — not a persisted table. Communication
 * is the only source today; a future module (Marketing, Artists, ...)
 * contributes by adding its own `get*AttentionItems()` and appending the
 * result here — Home itself shouldn't need to change.
 */
export interface AttentionItem {
  source_type: "communication";
  source_id: string;
  owner_id: string | null;
  title: string;
  summary: string | null;
  priority: TaskPriority;
  attention_reason: string;
  href: string;
  created_at: string;
}

async function getCommunicationAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const threads = await getEmailThreads({ activeOnly: true, ownerId });
  return threads.map((t) => ({
    source_type: "communication",
    source_id: t.id,
    owner_id: t.owner_id,
    title: t.subject || t.sender || "(no subject)",
    summary: t.ai_summary,
    priority: t.priority === "urgent" ? "critical" : t.priority,
    attention_reason: t.draft_reply ? "AI reply ready for review" : CASE_STATUS_LABELS[t.status],
    href: `/communication/${t.id}`,
    created_at: t.last_message_at ?? t.created_at,
  }));
}

export async function getAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const communication = await getCommunicationAttentionItems(ownerId);
  return communication.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
