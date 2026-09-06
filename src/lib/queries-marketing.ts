import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDateOnly, todayInBudapest } from "@/lib/dates";
import { getContentAttentionItems } from "@/lib/queries-content";
import type {
  CampaignLinkedItem,
  CampaignStatus,
  MarketingCalendarEventWithRelations,
  MarketingCalendarItem,
  MarketingCampaignComment,
  MarketingCampaignWithRelations,
  Profile,
} from "@/lib/types";

const CAMPAIGN_SELECT = `*, owner:profiles!marketing_campaigns_owner_id_fkey(id, full_name, role, email)`;

export interface CampaignFilters {
  status?: CampaignStatus;
  ownerId?: string;
  search?: string;
}

export async function getCampaigns(filters: CampaignFilters = {}): Promise<MarketingCampaignWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("marketing_campaigns").select(CAMPAIGN_SELECT);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,brief.ilike.%${filters.search}%`);
  }

  const { data } = await query.order("start_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as unknown as MarketingCampaignWithRelations[];
}

export async function getCampaignById(id: string): Promise<MarketingCampaignWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("marketing_campaigns").select(CAMPAIGN_SELECT).eq("id", id).single();
  return (data as unknown as MarketingCampaignWithRelations) ?? null;
}

export async function getCampaignStatusCounts(): Promise<Partial<Record<CampaignStatus, number>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("marketing_campaigns").select("status");
  const counts: Partial<Record<CampaignStatus, number>> = {};
  for (const row of data ?? []) {
    const status = row.status as CampaignStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

export async function getActiveCampaigns(): Promise<MarketingCampaignWithRelations[]> {
  return getCampaigns({ status: "active" });
}

export async function getUpcomingCampaigns(limit = 5): Promise<MarketingCampaignWithRelations[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketing_campaigns")
    .select(CAMPAIGN_SELECT)
    .in("status", ["planning", "active"])
    .gte("start_date", todayInBudapest())
    .order("start_date", { ascending: true })
    .limit(limit);
  return (data ?? []) as unknown as MarketingCampaignWithRelations[];
}

/**
 * Resolves a Campaign's linked objects against their owning module's real data.
 * Content is real now (see resolveContentLinks below); Email/SEO don't exist
 * as first-class linkable objects yet, so those branches still resolve to
 * nothing rather than fabricating rows. Each module's own spec adds a
 * resolver branch here as it lands.
 */
export async function getCampaignLinkedItems(
  campaignId: string
): Promise<{ items: CampaignLinkedItem[]; counts: { all: number; content: number; email: number; seo: number } }> {
  const supabase = await createClient();
  const { data: links } = await supabase
    .from("campaign_links")
    .select("id, linked_type, linked_id")
    .eq("campaign_id", campaignId);

  const rows = links ?? [];
  const counts = {
    all: rows.length,
    content: rows.filter((l) => l.linked_type === "content").length,
    email: rows.filter((l) => l.linked_type === "email").length,
    seo: rows.filter((l) => l.linked_type === "seo").length,
  };

  const contentLinks = rows.filter((l) => l.linked_type === "content");
  const items: CampaignLinkedItem[] = await resolveContentLinks(supabase, contentLinks);

  return { items, counts };
}

async function resolveContentLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  links: { id: string; linked_id: string }[]
): Promise<CampaignLinkedItem[]> {
  if (links.length === 0) return [];
  const { data: contentItems } = await supabase
    .from("content_items")
    .select("id, title, status, publish_date, owner:profiles!content_items_owner_id_fkey(full_name)")
    .in(
      "id",
      links.map((l) => l.linked_id)
    );

  const byId = new Map((contentItems ?? []).map((c) => [c.id, c]));
  return links
    .map((link): CampaignLinkedItem | null => {
      const content = byId.get(link.linked_id) as { id: string; title: string; status: string; publish_date: string | null; owner: { full_name: string } | null } | undefined;
      if (!content) return null;
      return {
        link_id: link.id,
        type: "content",
        title: content.title,
        status: content.status,
        owner: content.owner?.full_name ?? null,
        date: content.publish_date,
        href: `/marketing/content/${content.id}`,
      };
    })
    .filter((item): item is CampaignLinkedItem => item !== null);
}

export interface MarketingAttentionItem {
  source_type: "campaign" | "content";
  source_id: string;
  title: string;
  context: string;
  owner: string | null;
  ownerId: string | null;
  reason: string;
  date: string | null;
  href: string;
  overdue: boolean;
}

/**
 * Campaign-level attention (spec §16) — a launch/status decision the Campaign
 * object itself needs — merged with Content's own review state (a Scheduled
 * piece whose publish date has passed without being marked Published).
 * Email/SEO don't have a review-state concept of their own yet; this is the
 * seam where each plugs in as it lands.
 */
export async function getCampaignAttentionItems(ownerId?: string): Promise<MarketingAttentionItem[]> {
  const campaigns = await getCampaigns(ownerId ? { ownerId } : {});
  const today = todayInBudapest();
  const soon = formatDateOnly(addDays(new Date(today), 3));

  const items: MarketingAttentionItem[] = [];
  for (const c of campaigns) {
    if (c.status === "planning" && c.start_date && c.start_date < today) {
      items.push({
        source_type: "campaign",
        source_id: c.id,
        title: c.name,
        context: "Launch date passed — still in Planning",
        owner: c.owner?.full_name ?? null,
        ownerId: c.owner_id,
        reason: "Launch date passed — still in Planning",
        date: c.start_date,
        href: `/marketing/campaigns/${c.id}`,
        overdue: true,
      });
    } else if (c.status === "planning" && c.start_date && c.start_date <= soon) {
      items.push({
        source_type: "campaign",
        source_id: c.id,
        title: c.name,
        context: "Launch approaching — not yet Active",
        owner: c.owner?.full_name ?? null,
        ownerId: c.owner_id,
        reason: "Launch approaching — not yet Active",
        date: c.start_date,
        href: `/marketing/campaigns/${c.id}`,
        overdue: false,
      });
    } else if (c.status === "active" && c.end_date && c.end_date < today) {
      items.push({
        source_type: "campaign",
        source_id: c.id,
        title: c.name,
        context: "End date passed — still Active",
        owner: c.owner?.full_name ?? null,
        ownerId: c.owner_id,
        reason: "End date passed — still Active",
        date: c.end_date,
        href: `/marketing/campaigns/${c.id}`,
        overdue: true,
      });
    }
  }

  const overdueContent = await getContentAttentionItems();
  for (const c of overdueContent) {
    if (ownerId && c.owner_id !== ownerId) continue;
    items.push({
      source_type: "content",
      source_id: c.id,
      title: c.title,
      context: "Publish date passed — still Scheduled",
      owner: c.owner?.full_name ?? null,
      ownerId: c.owner_id,
      reason: "Publish date passed — still Scheduled",
      date: c.publish_date,
      href: `/marketing/content/${c.id}`,
      overdue: true,
    });
  }

  return items;
}

export async function getCampaignComments(campaignId: string): Promise<(MarketingCampaignComment & { author: Profile | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("marketing_campaign_comments")
    .select("*, author:profiles!marketing_campaign_comments_author_id_fkey(id, full_name, role, email)")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as (MarketingCampaignComment & { author: Profile | null })[];
}

const CALENDAR_EVENT_SELECT = `*, owner:profiles!marketing_calendar_events_owner_id_fkey(id, full_name, role, email), campaign:marketing_campaigns(id, name)`;

export async function getMarketingCalendarEvents(from?: string, to?: string): Promise<MarketingCalendarEventWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("marketing_calendar_events").select(CALENDAR_EVENT_SELECT);
  if (from) query = query.gte("event_date", from);
  if (to) query = query.lte("event_date", to);
  const { data } = await query.order("event_date", { ascending: true });
  return (data ?? []) as unknown as MarketingCalendarEventWithRelations[];
}

/** Unified Marketing Calendar: real Campaign start/end dates + standalone events, in one sorted list. */
export async function getMarketingCalendarItems(from?: string, to?: string): Promise<MarketingCalendarItem[]> {
  const supabase = await createClient();

  let campaignQuery = supabase.from("marketing_campaigns").select("id, name, start_date, end_date, status");
  const { data: campaigns } = await campaignQuery;

  const items: MarketingCalendarItem[] = [];
  for (const c of campaigns ?? []) {
    if (c.status === "cancelled") continue;
    if (c.start_date && (!from || c.start_date >= from) && (!to || c.start_date <= to)) {
      items.push({
        id: `${c.id}-start`,
        kind: "campaign_start",
        date: c.start_date,
        title: `${c.name} — launch`,
        context: "Campaign start",
        href: `/marketing/campaigns/${c.id}`,
      });
    }
    if (c.end_date && (!from || c.end_date >= from) && (!to || c.end_date <= to)) {
      items.push({
        id: `${c.id}-end`,
        kind: "campaign_end",
        date: c.end_date,
        title: `${c.name} — end`,
        context: "Campaign end",
        href: `/marketing/campaigns/${c.id}`,
      });
    }
  }

  const events = await getMarketingCalendarEvents(from, to);
  for (const e of events) {
    items.push({
      id: e.id,
      kind: "event",
      date: e.event_date,
      title: e.title,
      context: e.campaign?.name ?? e.event_type ?? null,
      href: `/marketing/calendar`,
    });
  }

  let contentQuery = supabase.from("content_items").select("id, title, publish_date, status, campaign:marketing_campaigns(name)").not("publish_date", "is", null);
  if (from) contentQuery = contentQuery.gte("publish_date", from);
  if (to) contentQuery = contentQuery.lte("publish_date", to);
  const { data: contentItems } = await contentQuery;
  for (const c of (contentItems ?? []) as unknown as { id: string; title: string; publish_date: string; status: string; campaign: { name: string } | null }[]) {
    items.push({
      id: `content-${c.id}`,
      kind: "content_publish",
      date: c.publish_date,
      title: c.title,
      context: c.campaign?.name ?? "Content",
      href: `/marketing/content/${c.id}`,
    });
  }

  return items.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
