"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { notifyUser, notifyMentions } from "@/lib/notify";
import type { CampaignStatus, TaskPriority } from "@/lib/types";

function revalidateMarketingViews() {
  revalidatePath("/", "layout");
}

/** Campaign creation/editing/lifecycle needs marketing_manage (spec §20) — capability-driven, not a hardcoded role check, so an admin can grant it without a code change. */
async function requireAdmin() {
  const me = await getCurrentProfile();
  if (!(await hasCapability(me, "marketing_manage"))) throw new Error("NOT_AUTHORIZED");
  return me;
}

async function logCampaignEvent(campaignId: string, eventType: string, fromValue: string | null, toValue: string | null) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("marketing_campaign_events").insert({ campaign_id: campaignId, actor_id: me.id, event_type: eventType, from_value: fromValue, to_value: toValue });
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

export interface CreateCampaignInput {
  name: string;
  brief?: string | null;
  ownerId: string;
  startDate?: string | null;
  endDate?: string | null;
  priority?: TaskPriority;
  goalNotes?: string | null;
}

export async function createCampaign(input: CreateCampaignInput) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data, error } = await supabase
    .from("marketing_campaigns")
    .insert({
      name: input.name,
      brief: input.brief || null,
      owner_id: input.ownerId,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      priority: input.priority ?? "normal",
      goal_notes: input.goalNotes || null,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create campaign");

  await logCampaignEvent(data.id, "created", null, null);
  if (input.ownerId !== me.id) {
    await notifyUser(input.ownerId, "campaign_assigned", `${me.full_name} made you the owner of a campaign`, input.name, `/marketing/campaigns/${data.id}`);
  }

  revalidateMarketingViews();
  redirect(`/marketing/campaigns/${data.id}`);
}

export interface UpdateCampaignFieldInput {
  name?: string;
  brief?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  goal_notes?: string | null;
}

export async function updateCampaignField(campaignId: string, field: UpdateCampaignFieldInput) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("marketing_campaigns").update(field).eq("id", campaignId);
  revalidateMarketingViews();
}

export async function setCampaignStatus(campaignId: string, status: CampaignStatus, previousStatus: CampaignStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("marketing_campaigns")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", campaignId);
  await logCampaignEvent(campaignId, "status_changed", previousStatus, status);
  revalidateMarketingViews();
}

export async function setCampaignPriority(campaignId: string, priority: TaskPriority, previousPriority: TaskPriority) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("marketing_campaigns").update({ priority }).eq("id", campaignId);
  await logCampaignEvent(campaignId, "priority_changed", previousPriority, priority);
  revalidateMarketingViews();
}

export async function reassignCampaign(campaignId: string, ownerId: string, campaignName: string, previousOwnerId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("marketing_campaigns").update({ owner_id: ownerId }).eq("id", campaignId);
  await logCampaignEvent(campaignId, "owner_changed", previousOwnerId, ownerId);
  if (ownerId !== me.id) {
    await notifyUser(ownerId, "campaign_assigned", `${me.full_name} made you the owner of a campaign`, campaignName, `/marketing/campaigns/${campaignId}`);
  }
  revalidateMarketingViews();
}

export async function deleteCampaign(campaignId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("marketing_campaigns").delete().eq("id", campaignId);
  revalidateMarketingViews();
  redirect("/marketing/campaigns");
}

// ---------------------------------------------------------------------------
// Campaign discussion (@mentions)
// ---------------------------------------------------------------------------

export async function postCampaignComment(campaignId: string, body: string, campaignName: string, mentionedProfileIds: string[] = []) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const { error } = await supabase.from("marketing_campaign_comments").insert({ campaign_id: campaignId, author_id: me.id, body, mentioned_profile_ids: mentionedProfileIds });
  if (error) throw new Error("Could not post comment.");
  await notifyMentions(mentionedProfileIds, me.id, me.full_name, campaignName, `/marketing/campaigns/${campaignId}`);
  revalidateMarketingViews();
}

// ---------------------------------------------------------------------------
// Standalone Marketing Calendar events
// ---------------------------------------------------------------------------

export interface CreateMarketingEventInput {
  title: string;
  eventDate: string;
  description?: string | null;
  ownerId?: string | null;
  campaignId?: string | null;
  priority?: TaskPriority;
  eventType?: string | null;
}

export async function createMarketingEvent(input: CreateMarketingEventInput) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("marketing_calendar_events").insert({
    title: input.title,
    event_date: input.eventDate,
    description: input.description || null,
    owner_id: input.ownerId || null,
    campaign_id: input.campaignId || null,
    priority: input.priority ?? "normal",
    event_type: input.eventType || null,
    created_by: me.id,
  });
  revalidateMarketingViews();
}

export async function deleteMarketingEvent(eventId: string) {
  const supabase = await createClient();
  await supabase.from("marketing_calendar_events").delete().eq("id", eventId);
  revalidateMarketingViews();
}
