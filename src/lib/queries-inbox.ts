import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CaseStatus, EmailCategory, EmailMessage, EmailThreadWithRelations } from "@/lib/types";

const THREAD_SELECT = `*, owner:profiles!email_threads_owner_id_fkey(id, full_name, role, email)`;

/**
 * Excludes noise/ignore — but NOT-yet-classified threads (category/action
 * still null, e.g. freshly synced before AI classification has run) must
 * stay visible. `.neq()` alone would silently drop them: in SQL,
 * `null <> 'noise'` evaluates to unknown, not true, so a plain `.neq()`
 * filters out every unclassified row along with actual noise.
 */
function excludeNoise<T extends { or: (filters: string) => T }>(query: T): T {
  return query.or("category.is.null,category.neq.noise").or("action.is.null,action.neq.ignore");
}

export interface CommunicationFilters {
  category?: string;
  /** Fine-grained display status (splits "needs_attention" into reply vs. review). */
  caseStatus?: CaseStatus;
  /** Raw column filter — use when you want everything still active, without the reply/review split (e.g. Home's attention feed). */
  status?: "needs_attention" | "waiting" | "done";
  ownerId?: string;
  search?: string;
}

export async function getEmailThreads(filters: CommunicationFilters = {}): Promise<EmailThreadWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("email_threads").select(THREAD_SELECT).is("deleted_at", null);

  if (!filters.category) {
    query = excludeNoise(query);
  }

  switch (filters.caseStatus) {
    case "resolved":
      query = query.eq("status", "done");
      break;
    case "waiting":
      query = query.eq("status", "waiting");
      break;
    case "needs_reply":
      query = query.eq("status", "needs_attention").in("action", ["reply", "reply_task"]);
      break;
    case "needs_review":
      query = query.eq("status", "needs_attention").not("action", "in", "(reply,reply_task)");
      break;
    default:
      if (filters.status) query = query.eq("status", filters.status);
      break;
  }

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.search) query = query.or(`subject.ilike.%${filters.search}%,sender.ilike.%${filters.search}%`);

  const { data } = await query.order("last_message_at", { ascending: false, nullsFirst: false });
  return (data ?? []) as unknown as EmailThreadWithRelations[];
}

export async function getEmailThreadById(id: string): Promise<EmailThreadWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("email_threads").select(THREAD_SELECT).eq("id", id).is("deleted_at", null).single();
  return (data as unknown as EmailThreadWithRelations) ?? null;
}

export async function getEmailMessages(threadId: string): Promise<EmailMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });
  return (data ?? []) as EmailMessage[];
}

export interface CommunicationCategoryCounts {
  /** All active (non-resolved, non-noise) cases, including ones not yet AI-classified — the honest "All" total. */
  total: number;
  byCategory: Partial<Record<EmailCategory, number>>;
}

/** Active (non-resolved, non-noise) case counts — drives the tab bar and sidebar submenu badges. */
export async function getCommunicationCategoryCounts(): Promise<CommunicationCategoryCounts> {
  const supabase = await createClient();
  const { data } = await excludeNoise(
    supabase.from("email_threads").select("category").is("deleted_at", null).neq("status", "done")
  );

  const byCategory: Partial<Record<EmailCategory, number>> = {};
  for (const row of data ?? []) {
    const category = row.category as EmailCategory | null;
    if (!category) continue;
    byCategory[category] = (byCategory[category] ?? 0) + 1;
  }
  return { total: data?.length ?? 0, byCategory };
}

export interface QuickFilterCounts {
  needs_reply: number;
  needs_review: number;
  waiting: number;
  resolved: number;
}

export async function getQuickFilterCounts(): Promise<QuickFilterCounts> {
  const supabase = await createClient();
  const base = () =>
    excludeNoise(supabase.from("email_threads").select("id", { count: "exact", head: true }).is("deleted_at", null));

  const [needsReply, needsReview, waiting, resolved] = await Promise.all([
    base().eq("status", "needs_attention").in("action", ["reply", "reply_task"]),
    base().eq("status", "needs_attention").not("action", "in", "(reply,reply_task)"),
    base().eq("status", "waiting"),
    base().eq("status", "done"),
  ]);

  return {
    needs_reply: needsReply.count ?? 0,
    needs_review: needsReview.count ?? 0,
    waiting: waiting.count ?? 0,
    resolved: resolved.count ?? 0,
  };
}

export interface PeriodStat {
  value: number;
  /** Percent change vs. the prior period of equal length. Null when the prior period had no baseline to compare against. */
  trendPercent: number | null;
}

export interface CommunicationStats {
  newConversations: PeriodStat;
  resolved: PeriodStat;
  /** Average hours between an inbound message and Artbridge's next outbound reply, for threads that got a reply in the period. Null when no such thread exists in the period. */
  avgResponseHours: { value: number | null; trendPercent: number | null };
}

function trend(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Real conversation stats for the "Conversation stats" card — never hardcoded. */
export async function getCommunicationStats(days = 30): Promise<CommunicationStats> {
  const supabase = await createClient();
  const now = Date.now();
  const periodStart = new Date(now - days * 86_400_000).toISOString();
  const priorStart = new Date(now - 2 * days * 86_400_000).toISOString();

  const [newCurrent, newPrior, resolvedCurrent, resolvedPrior, responseCurrent, responsePrior] = await Promise.all([
    excludeNoise(
      supabase.from("email_threads").select("id", { count: "exact", head: true }).is("deleted_at", null)
    ).gte("created_at", periodStart),
    excludeNoise(
      supabase.from("email_threads").select("id", { count: "exact", head: true }).is("deleted_at", null)
    )
      .gte("created_at", priorStart)
      .lt("created_at", periodStart),
    supabase
      .from("email_threads")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("resolved_at", periodStart),
    supabase
      .from("email_threads")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .gte("resolved_at", priorStart)
      .lt("resolved_at", periodStart),
    supabase
      .from("email_threads")
      .select("last_inbound_at, last_outbound_at")
      .is("deleted_at", null)
      .not("last_inbound_at", "is", null)
      .not("last_outbound_at", "is", null)
      .gte("last_outbound_at", periodStart),
    supabase
      .from("email_threads")
      .select("last_inbound_at, last_outbound_at")
      .is("deleted_at", null)
      .not("last_inbound_at", "is", null)
      .not("last_outbound_at", "is", null)
      .gte("last_outbound_at", priorStart)
      .lt("last_outbound_at", periodStart),
  ]);

  function avgResponseHours(rows: { last_inbound_at: string | null; last_outbound_at: string | null }[] | null) {
    const deltas = (rows ?? [])
      .map((r) => new Date(r.last_outbound_at!).getTime() - new Date(r.last_inbound_at!).getTime())
      .filter((ms) => ms > 0);
    if (deltas.length === 0) return null;
    return deltas.reduce((a, b) => a + b, 0) / deltas.length / 3_600_000;
  }

  const avgCurrent = avgResponseHours(responseCurrent.data);
  const avgPrior = avgResponseHours(responsePrior.data);

  return {
    newConversations: {
      value: newCurrent.count ?? 0,
      trendPercent: trend(newCurrent.count ?? 0, newPrior.count ?? 0),
    },
    resolved: {
      value: resolvedCurrent.count ?? 0,
      trendPercent: trend(resolvedCurrent.count ?? 0, resolvedPrior.count ?? 0),
    },
    avgResponseHours: {
      value: avgCurrent,
      // Lower is better for response time, so invert the sign of the raw % change.
      trendPercent: avgCurrent !== null && avgPrior !== null && avgPrior > 0 ? Math.round(((avgPrior - avgCurrent) / avgPrior) * 100) : null,
    },
  };
}
