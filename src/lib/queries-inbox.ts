import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CASE_STATUSES, type CaseStatus, type EmailCategory, type EmailMessage, type EmailThreadWithRelations } from "@/lib/types";

const THREAD_SELECT = `*, owner:profiles!email_threads_owner_id_fkey(id, full_name, role, email)`;

export interface CommunicationFilters {
  category?: string;
  status?: CaseStatus;
  /** Only cases in one of ACTIVE_CASE_STATUSES — used for "My queue" default views. */
  activeOnly?: boolean;
  priority?: string;
  ownerId?: string;
  search?: string;
  /** Archive view: only archived cases instead of the normal active/resolved set. */
  archived?: boolean;
}

async function searchMatchingThreadIds(supabase: Awaited<ReturnType<typeof createClient>>, term: string): Promise<string[]> {
  const { data } = await supabase.from("email_messages").select("thread_id").ilike("sanitized_body", `%${term}%`).limit(100);
  return [...new Set((data ?? []).map((r) => r.thread_id as string))];
}

export async function getEmailThreads(filters: CommunicationFilters = {}): Promise<EmailThreadWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("email_threads").select(THREAD_SELECT).is("deleted_at", null).eq("suppressed", false);

  query = filters.archived ? query.eq("status", "archived") : query.neq("status", "archived");

  if (filters.status) query = query.eq("status", filters.status);
  else if (filters.activeOnly) query = query.in("status", ACTIVE_CASE_STATUSES);

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);

  if (filters.search) {
    const term = filters.search;
    const matchedIds = await searchMatchingThreadIds(supabase, term);
    const orParts = [
      `subject.ilike.%${term}%`,
      `sender.ilike.%${term}%`,
      `snippet.ilike.%${term}%`,
      `ai_summary.ilike.%${term}%`,
    ];
    if (matchedIds.length > 0) orParts.push(`id.in.(${matchedIds.join(",")})`);
    query = query.or(orParts.join(","));
  }

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
  /** Every active (non-archived, non-resolved... no: ACTIVE_CASE_STATUSES) case, including any not yet classified — the honest "All" total. */
  total: number;
  byCategory: Partial<Record<EmailCategory, number>>;
}

/** Active case counts, scoped to one owner (My queue) or the whole team — drives the tab bar and sidebar submenu badges. */
export async function getCommunicationCategoryCounts(ownerId?: string): Promise<CommunicationCategoryCounts> {
  const supabase = await createClient();
  let query = supabase
    .from("email_threads")
    .select("category")
    .is("deleted_at", null)
    .eq("suppressed", false)
    .in("status", ACTIVE_CASE_STATUSES);
  if (ownerId) query = query.eq("owner_id", ownerId);

  const { data } = await query;

  const byCategory: Partial<Record<EmailCategory, number>> = {};
  for (const row of data ?? []) {
    const category = row.category as EmailCategory;
    byCategory[category] = (byCategory[category] ?? 0) + 1;
  }
  return { total: data?.length ?? 0, byCategory };
}

export interface QuickFilterCounts {
  needs_reply: number;
  needs_review: number;
  in_progress: number;
  waiting: number;
}

/** Scoped to one owner (My queue) or the whole team. */
export async function getQuickFilterCounts(ownerId?: string): Promise<QuickFilterCounts> {
  const supabase = await createClient();
  const base = () => {
    let q = supabase.from("email_threads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("suppressed", false);
    if (ownerId) q = q.eq("owner_id", ownerId);
    return q;
  };

  const [needsReply, needsReview, inProgress, waiting] = await Promise.all([
    base().eq("status", "needs_reply"),
    base().eq("status", "needs_review"),
    base().eq("status", "in_progress"),
    base().eq("status", "waiting"),
  ]);

  return {
    needs_reply: needsReply.count ?? 0,
    needs_review: needsReview.count ?? 0,
    in_progress: inProgress.count ?? 0,
    waiting: waiting.count ?? 0,
  };
}

export interface CommunicationStats {
  open: number;
  needsReply: number;
  waiting: number;
  resolvedThisWeek: number;
}

/** Spec §22 — deliberately simple: Open / Needs reply / Waiting / Resolved this week. No trends, no avg response time. Scoped to one owner or the whole team. */
export async function getCommunicationStats(ownerId?: string): Promise<CommunicationStats> {
  const supabase = await createClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const base = () => {
    let q = supabase.from("email_threads").select("id", { count: "exact", head: true }).is("deleted_at", null).eq("suppressed", false);
    if (ownerId) q = q.eq("owner_id", ownerId);
    return q;
  };

  const [open, needsReply, waiting, resolvedThisWeek] = await Promise.all([
    base().in("status", ACTIVE_CASE_STATUSES),
    base().eq("status", "needs_reply"),
    base().eq("status", "waiting"),
    base().eq("status", "resolved").gte("resolved_at", weekAgo),
  ]);

  return {
    open: open.count ?? 0,
    needsReply: needsReply.count ?? 0,
    waiting: waiting.count ?? 0,
    resolvedThisWeek: resolvedThisWeek.count ?? 0,
  };
}
