"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import type { ContentStatus, ContentType } from "@/lib/types";

function revalidateContentViews() {
  revalidatePath("/", "layout");
}

async function requireAdmin() {
  const me = await getCurrentProfile();
  if (!(await hasCapability(me, "content"))) throw new Error("NOT_AUTHORIZED");
  return me;
}

async function logContentEvent(contentItemId: string, eventType: string, fromValue: string | null, toValue: string | null) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase
    .from("content_item_events")
    .insert({ content_item_id: contentItemId, actor_id: me.id, event_type: eventType, from_value: fromValue, to_value: toValue });
}

async function notifyUser(userId: string, type: string, title: string, body: string | null, href: string) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({ user_id: userId, type, title, body, href });
}

export interface CreateContentItemInput {
  title: string;
  contentType: ContentType;
  ownerId: string;
  campaignId?: string | null;
  publishDate?: string | null;
}

export async function createContentItem(input: CreateContentItemInput) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data, error } = await supabase
    .from("content_items")
    .insert({
      title: input.title,
      content_type: input.contentType,
      owner_id: input.ownerId,
      campaign_id: input.campaignId || null,
      publish_date: input.publishDate || null,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create content item");

  await logContentEvent(data.id, "created", null, null);
  if (input.ownerId !== me.id) {
    await notifyUser(input.ownerId, "content_assigned", `${me.full_name} made you the owner of a content piece`, input.title, `/marketing/content/${data.id}`);
  }

  revalidateContentViews();
  redirect(`/marketing/content/${data.id}`);
}

export async function updateContentTitle(id: string, title: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("content_items").update({ title }).eq("id", id);
  revalidateContentViews();
}

export async function updateContentBody(id: string, body: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("content_items").update({ body }).eq("id", id);
  revalidateContentViews();
}

export async function setContentType(id: string, contentType: ContentType) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: before } = await supabase.from("content_items").select("content_type").eq("id", id).single();
  await supabase.from("content_items").update({ content_type: contentType }).eq("id", id);
  await logContentEvent(id, "type_changed", before?.content_type ?? null, contentType);
  revalidateContentViews();
}

export async function setContentStatus(id: string, status: ContentStatus) {
  await requireAdmin();
  const supabase = await createClient();
  const { data: before } = await supabase.from("content_items").select("status").eq("id", id).single();
  await supabase
    .from("content_items")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);
  await logContentEvent(id, "status_changed", before?.status ?? null, status);
  revalidateContentViews();
}

export async function reassignContentItem(id: string, ownerId: string, title: string, previousOwnerId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("content_items").update({ owner_id: ownerId }).eq("id", id);
  await logContentEvent(id, "owner_changed", previousOwnerId, ownerId);
  if (ownerId !== me.id) {
    await notifyUser(ownerId, "content_assigned", `${me.full_name} made you the owner of a content piece`, title, `/marketing/content/${id}`);
  }
  revalidateContentViews();
}

export async function setContentPublishDate(id: string, publishDate: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("content_items").update({ publish_date: publishDate }).eq("id", id);
  revalidateContentViews();
}

export async function setContentPublishedUrl(id: string, publishedUrl: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("content_items").update({ published_url: publishedUrl || null }).eq("id", id);
  revalidateContentViews();
}

export async function setContentCampaign(id: string, campaignId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("content_items").update({ campaign_id: campaignId }).eq("id", id);
  revalidateContentViews();
}

export async function deleteContentItem(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("content_items").delete().eq("id", id);
  revalidateContentViews();
  redirect("/marketing/content");
}

/** Links an existing Content item to a Campaign via the shared campaign_links seam (used by AddLinkedItemDialog). */
export async function linkContentToCampaign(campaignId: string, contentItemId: string) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("campaign_links").upsert(
    { campaign_id: campaignId, linked_type: "content", linked_id: contentItemId, created_by: me.id },
    { onConflict: "campaign_id,linked_type,linked_id" }
  );
  await supabase.from("content_items").update({ campaign_id: campaignId }).eq("id", contentItemId);
  revalidateContentViews();
}
