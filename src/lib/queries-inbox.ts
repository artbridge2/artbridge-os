import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EmailCategory, EmailMessage, EmailThreadWithRelations } from "@/lib/types";

const THREAD_SELECT = `*, owner:profiles!email_threads_owner_id_fkey(id, full_name, role, email)`;

export type InboxView = "attention" | "waiting" | "fyi" | "all" | "noise";

export interface InboxFilters {
  view?: InboxView;
  ownerId?: string;
  category?: string;
  priority?: string;
  search?: string;
}

export async function getEmailThreads(filters: InboxFilters = {}): Promise<EmailThreadWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("email_threads").select(THREAD_SELECT);

  switch (filters.view) {
    case "attention":
      query = query
        .eq("status", "needs_attention")
        .in("action", ["reply", "task", "reply_task"]);
      break;
    case "waiting":
      query = query.eq("status", "waiting");
      break;
    case "fyi":
      query = query.eq("action", "fyi");
      break;
    case "noise":
      query = query.or("action.eq.ignore,category.eq.noise");
      break;
    case "all":
      break;
    default:
      query = query
        .eq("status", "needs_attention")
        .in("action", ["reply", "task", "reply_task"]);
  }

  if (filters.view !== "noise" && filters.view !== "all") {
    query = query.neq("action", "ignore").neq("category", "noise");
  }

  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.search) query = query.ilike("subject", `%${filters.search}%`);

  const { data } = await query.order("last_message_at", { ascending: false });
  return (data ?? []) as unknown as EmailThreadWithRelations[];
}

export async function getEmailThreadById(id: string): Promise<EmailThreadWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("email_threads").select(THREAD_SELECT).eq("id", id).single();
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

export interface InboxCounts {
  attention: number;
  waiting: number;
  fyi: number;
}

/** Counts for the tab bar. `ownerId` narrows to "Mine" when provided. */
export async function getInboxCounts(ownerId?: string): Promise<InboxCounts> {
  const supabase = await createClient();

  let attentionQuery = supabase
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .eq("status", "needs_attention")
    .in("action", ["reply", "task", "reply_task"]);
  let waitingQuery = supabase
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .eq("status", "waiting");
  let fyiQuery = supabase
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .eq("action", "fyi");

  if (ownerId) {
    attentionQuery = attentionQuery.eq("owner_id", ownerId);
    waitingQuery = waitingQuery.eq("owner_id", ownerId);
    fyiQuery = fyiQuery.eq("owner_id", ownerId);
  }

  const [attention, waiting, fyi] = await Promise.all([attentionQuery, waitingQuery, fyiQuery]);

  return {
    attention: attention.count ?? 0,
    waiting: waiting.count ?? 0,
    fyi: fyi.count ?? 0,
  };
}

/** Category breakdown of the "needs attention" set — the counts row under the tabs. */
export async function getCategoryCounts(): Promise<Partial<Record<EmailCategory, number>>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("email_threads")
    .select("category")
    .eq("status", "needs_attention")
    .in("action", ["reply", "task", "reply_task"]);

  const counts: Partial<Record<EmailCategory, number>> = {};
  for (const row of data ?? []) {
    const category = row.category as EmailCategory | null;
    if (!category) continue;
    counts[category] = (counts[category] ?? 0) + 1;
  }
  return counts;
}
