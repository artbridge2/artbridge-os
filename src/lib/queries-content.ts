import "server-only";
import { createClient } from "@/lib/supabase/server";
import { todayInBudapest } from "@/lib/dates";
import type { ContentItemWithRelations, ContentStatus, ContentType } from "@/lib/types";

const CONTENT_SELECT = `*, owner:profiles!content_items_owner_id_fkey(id, full_name, role, email), campaign:marketing_campaigns(id, name)`;

export interface ContentFilters {
  status?: ContentStatus;
  contentType?: ContentType;
  ownerId?: string;
  campaignId?: string;
  search?: string;
}

export async function getContentItems(filters: ContentFilters = {}): Promise<ContentItemWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("content_items").select(CONTENT_SELECT);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.contentType) query = query.eq("content_type", filters.contentType);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.campaignId) query = query.eq("campaign_id", filters.campaignId);
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  const { data } = await query.order("publish_date", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false });
  return (data ?? []) as unknown as ContentItemWithRelations[];
}

export async function getContentItemById(id: string): Promise<ContentItemWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("content_items").select(CONTENT_SELECT).eq("id", id).single();
  return (data as unknown as ContentItemWithRelations) ?? null;
}

export async function getContentStatusCounts(): Promise<Partial<Record<ContentStatus, number>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("content_items").select("status");
  const counts: Partial<Record<ContentStatus, number>> = {};
  for (const row of data ?? []) {
    const status = row.status as ContentStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

/** Scheduled pieces whose publish date is today or has already passed without being marked Published. */
export async function getContentAttentionItems(): Promise<ContentItemWithRelations[]> {
  const supabase = await createClient();
  const today = todayInBudapest();
  const { data } = await supabase
    .from("content_items")
    .select(CONTENT_SELECT)
    .eq("status", "scheduled")
    .lte("publish_date", today)
    .order("publish_date", { ascending: true });
  return (data ?? []) as unknown as ContentItemWithRelations[];
}
