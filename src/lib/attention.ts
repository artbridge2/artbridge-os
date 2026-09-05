import "server-only";
import { getEmailThreads } from "@/lib/queries-inbox";
import { ACTION_LABELS, type TaskPriority } from "@/lib/types";

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
  const threads = await getEmailThreads({ status: "needs_attention", ownerId });
  return threads.map((t) => ({
    source_type: "communication",
    source_id: t.id,
    owner_id: t.owner_id,
    title: t.subject || t.sender || "(no subject)",
    summary: t.ai_summary,
    priority: t.priority,
    attention_reason: t.draft_reply
      ? "AI reply ready for review"
      : t.action
        ? ACTION_LABELS[t.action]
        : "Needs attention",
    href: `/communication/${t.id}`,
    created_at: t.last_message_at ?? t.created_at,
  }));
}

export async function getAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const communication = await getCommunicationAttentionItems(ownerId);
  return communication.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}
