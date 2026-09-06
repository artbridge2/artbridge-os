"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { sendNewMessage, sendReply as sendGmailReply } from "@/lib/gmail/client";
import { findPossibleDuplicates, type DuplicateCandidateInput } from "@/lib/artists/duplicate-detection";
import { generateArtistOutreachDraft, generateArtistOutreachDraftFromBrief, type ThreadForAI } from "@/lib/ai/provider";
import type { ArtistLink, ArtistStatus, FitAssessment, RejectionReason } from "@/lib/types";

function revalidateArtistViews() {
  revalidatePath("/", "layout");
}

async function logArtistEvent(artistId: string, eventType: string, fromValue: string | null, toValue: string | null) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("artist_events").insert({ artist_id: artistId, actor_id: me.id, event_type: eventType, from_value: fromValue, to_value: toValue });
}

async function notifyUser(userId: string, type: string, title: string, body: string | null, href: string) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({ user_id: userId, type, title, body, href });
}

async function notifyMentions(body: string, title: string | null, href: string) {
  const profiles = await getProfiles();
  const me = await getCurrentProfile();
  for (const p of profiles) {
    if (p.id === me.id) continue;
    if (body.toLowerCase().includes(`@${p.full_name.toLowerCase()}`)) {
      await notifyUser(p.id, "mention", `${me.full_name} mentioned you`, title, href);
    }
  }
}

// ---------------------------------------------------------------------------
// Duplicate check (spec §12) — called before any canonical creation
// ---------------------------------------------------------------------------

export async function checkDuplicates(input: DuplicateCandidateInput) {
  return findPossibleDuplicates(input);
}

// ---------------------------------------------------------------------------
// Direct add
// ---------------------------------------------------------------------------

export interface CreateArtistInput {
  fullName: string;
  artistName?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  location?: string | null;
  technique?: string | null;
  bio?: string | null;
  ownerId: string;
  source: "outbound" | "applied";
}

export async function createArtist(input: CreateArtistInput): Promise<string> {
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: artist, error } = await supabase
    .from("artists")
    .insert({
      full_name: input.fullName,
      artist_name: input.artistName || null,
      email: input.email || null,
      website: input.website || null,
      instagram: input.instagram || null,
      location: input.location || null,
      technique: input.technique || null,
      bio: input.bio || null,
      source: input.source,
      status: "candidate",
      owner_id: input.ownerId,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error || !artist) throw new Error("Failed to create artist");
  await logArtistEvent(artist.id, "created", null, input.source);
  revalidateArtistViews();
  return artist.id as string;
}

export type CreateArtistFormState = { error?: string } | undefined;

export async function submitCreateArtist(_prev: CreateArtistFormState, formData: FormData): Promise<CreateArtistFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "");
  if (!fullName || !ownerId) return { error: "Name and owner are required." };

  const id = await createArtist({
    fullName,
    artistName: String(formData.get("artist_name") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    instagram: String(formData.get("instagram") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    ownerId,
    source: "outbound",
  });

  revalidatePath("/artists");
  redirect(`/artists/${id}`);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Manual override — any status to any status, always available (spec §4/§5: authorized users can always pick a different status directly). */
export async function setArtistStatus(artistId: string, status: ArtistStatus) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("artists").select("status, owner_id, full_name").eq("id", artistId).single();
  await supabase.from("artists").update({ status }).eq("id", artistId);
  await logArtistEvent(artistId, "status_changed", before?.status ?? null, status);

  if (status === "maybe_later" && before?.owner_id) {
    await notifyUser(before.owner_id, "artist_status", "Candidate needs a decision", before.full_name, `/artists/${artistId}`);
  }
  revalidateArtistViews();
}

/**
 * "Maybe later" is a temporary pause, not a dead end (spec §4) — remembers
 * the status to `Resume` back to. Rejection reuses the same "previous status"
 * column for the same reason (spec §5's restore/reopen): an artist is only
 * ever in one paused state at a time, so one column safely serves both.
 */
export async function setArtistMaybeLater(artistId: string, revisitDate?: string | null) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("artists").select("status").eq("id", artistId).single();
  if (!before || before.status === "maybe_later") return;
  await supabase
    .from("artists")
    .update({ status: "maybe_later", maybe_later_previous_status: before.status, revisit_date: revisitDate || null })
    .eq("id", artistId);
  await logArtistEvent(artistId, "status_changed", before.status, "maybe_later");
  revalidateArtistViews();
}

export async function resumeArtist(artistId: string) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("artists").select("status, maybe_later_previous_status").eq("id", artistId).single();
  if (!before) return;
  const target = (before.maybe_later_previous_status as ArtistStatus | null) ?? "candidate";
  await supabase.from("artists").update({ status: target, maybe_later_previous_status: null, revisit_date: null }).eq("id", artistId);
  await logArtistEvent(artistId, "status_changed", before.status, target);
  revalidateArtistViews();
}

/** Reachable from any stage (spec §5). Optional reason + note; never deletes the Artist. */
export async function rejectArtist(artistId: string, reason: RejectionReason | null, note?: string) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const { data: before } = await supabase.from("artists").select("status, full_name").eq("id", artistId).single();
  if (!before || before.status === "rejected") return;
  await supabase
    .from("artists")
    .update({ status: "rejected", maybe_later_previous_status: before.status, rejection_reason: reason })
    .eq("id", artistId);
  await logArtistEvent(artistId, "status_changed", before.status, "rejected");
  if (note?.trim()) {
    await supabase.from("artist_comments").insert({ artist_id: artistId, author_id: me.id, body: note.trim() });
  }
  revalidateArtistViews();
}

/** Admin restore/reopen after Rejected (spec §5) — same "previous status" memory as Resume. */
export async function restoreArtist(artistId: string) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("artists").select("status, maybe_later_previous_status").eq("id", artistId).single();
  if (!before) return;
  const target = (before.maybe_later_previous_status as ArtistStatus | null) ?? "candidate";
  await supabase
    .from("artists")
    .update({ status: target, maybe_later_previous_status: null, rejection_reason: null })
    .eq("id", artistId);
  await logArtistEvent(artistId, "status_changed", "rejected", target);
  revalidateArtistViews();
}

export async function reassignArtist(artistId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("artists").select("owner_id, full_name").eq("id", artistId).single();
  await supabase.from("artists").update({ owner_id: ownerId }).eq("id", artistId);
  await logArtistEvent(artistId, "reassigned", before?.owner_id ?? null, ownerId);
  if (ownerId !== before?.owner_id) {
    await notifyUser(ownerId, "artist_assigned", "Artist assigned to you", before?.full_name ?? null, `/artists/${artistId}`);
  }
  revalidateArtistViews();
}

export async function setFitAssessment(artistId: string, fit: FitAssessment | null, rationale: string | null) {
  const supabase = await createClient();
  await supabase.from("artists").update({ fit_assessment: fit, fit_rationale: rationale }).eq("id", artistId);
  revalidateArtistViews();
}

export async function updateArtistField(
  artistId: string,
  patch: Partial<{ bio: string | null; technique: string | null; location: string | null; website: string | null; instagram: string | null; phone: string | null; email: string | null }>
) {
  const supabase = await createClient();
  await supabase.from("artists").update(patch).eq("id", artistId);
  revalidateArtistViews();
}

export async function deleteArtist(artistId: string) {
  const supabase = await createClient();
  await supabase.from("artists").update({ deleted_at: new Date().toISOString() }).eq("id", artistId);
  revalidateArtistViews();
  redirect("/artists");
}

// ---------------------------------------------------------------------------
// Discussion (@mentions)
// ---------------------------------------------------------------------------

export async function postArtistComment(artistId: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const { data: artist } = await supabase.from("artists").select("full_name").eq("id", artistId).single();

  await supabase.from("artist_comments").insert({ artist_id: artistId, author_id: me.id, body });
  await notifyMentions(body, artist?.full_name ?? null, `/artists/${artistId}`);
  revalidateArtistViews();
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function addArtistDocument(artistId: string, name: string, url: string) {
  if (!name.trim() || !url.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("artist_documents").insert({ artist_id: artistId, name: name.trim(), url: url.trim(), added_by: me.id });
  revalidateArtistViews();
}

export async function removeArtistDocument(id: string) {
  const supabase = await createClient();
  await supabase.from("artist_documents").delete().eq("id", id);
  revalidateArtistViews();
}

// ---------------------------------------------------------------------------
// Onboarding (spec §16-17)
// ---------------------------------------------------------------------------

const ONBOARDING_FIELD_MAP = {
  commission: ["onboarding_commission_at", "onboarding_commission_by"],
  registration: ["onboarding_registration_at", "onboarding_registration_by"],
  upload: ["onboarding_upload_at", "onboarding_upload_by"],
  published: ["onboarding_published_at", "onboarding_published_by"],
} as const;

export async function completeOnboardingStep(artistId: string, step: keyof typeof ONBOARDING_FIELD_MAP, commissionTerms?: string) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const [atField, byField] = ONBOARDING_FIELD_MAP[step];

  const patch: Record<string, unknown> = { [atField]: new Date().toISOString(), [byField]: me.id };
  if (step === "commission" && commissionTerms) patch.commission_terms = commissionTerms;

  const { data: before } = await supabase.from("artists").select("status").eq("id", artistId).single();

  await supabase.from("artists").update(patch).eq("id", artistId);
  await logArtistEvent(artistId, "onboarding_step_completed", null, step);

  // Registration completion -> Registered; publishing completion -> Active artist (spec §2).
  if (step === "registration" && before?.status !== "active") {
    await supabase.from("artists").update({ status: "registered" }).eq("id", artistId);
    await logArtistEvent(artistId, "status_changed", before?.status ?? null, "registered");
  } else if (step === "published") {
    await supabase.from("artists").update({ status: "active" }).eq("id", artistId);
    await logArtistEvent(artistId, "status_changed", before?.status ?? null, "active");
  }
  revalidateArtistViews();
}

export async function reopenOnboardingStep(artistId: string, step: keyof typeof ONBOARDING_FIELD_MAP) {
  const supabase = await createClient();
  const [atField, byField] = ONBOARDING_FIELD_MAP[step];
  await supabase.from("artists").update({ [atField]: null, [byField]: null }).eq("id", artistId);
  revalidateArtistViews();
}

// ---------------------------------------------------------------------------
// Applications (spec §6)
// ---------------------------------------------------------------------------

export async function logApplication(input: { name: string; email: string | null; message: string | null; links: ArtistLink[] }) {
  const supabase = await createClient();
  const { data: application, error } = await supabase
    .from("artist_applications")
    .insert({ raw_name: input.name, raw_email: input.email, raw_message: input.message, raw_links: input.links })
    .select("id")
    .single();
  if (error || !application) throw new Error("Failed to log application");
  revalidateArtistViews();
  return application.id as string;
}

export async function reviewApplication(
  applicationId: string,
  decision: "accepted" | "rejected" | "maybe_later",
  input: { linkToArtistId?: string; ownerId?: string }
) {
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: application } = await supabase.from("artist_applications").select("*").eq("id", applicationId).single();
  if (!application) throw new Error("Application not found");

  let artistId = input.linkToArtistId ?? application.artist_id ?? null;

  if (!artistId && decision !== "rejected") {
    const { data: artist, error } = await supabase
      .from("artists")
      .insert({
        full_name: application.raw_name ?? "Unknown",
        email: application.raw_email,
        other_links: application.raw_links,
        source: "applied",
        // Accepted -> straight to In conversation, no Candidate/Contacted detour (spec §2): the artist already reached out.
        status: decision === "accepted" ? "in_conversation" : "maybe_later",
        owner_id: input.ownerId ?? me.id,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (error || !artist) throw new Error("Failed to create artist from application");
    artistId = artist.id as string;
  } else if (artistId) {
    await supabase
      .from("artists")
      .update({ status: decision === "accepted" ? "in_conversation" : decision === "maybe_later" ? "maybe_later" : "rejected" })
      .eq("id", artistId);
  }

  await supabase
    .from("artist_applications")
    .update({ review_status: decision, reviewed_by: me.id, reviewed_at: new Date().toISOString(), artist_id: artistId })
    .eq("id", applicationId);

  if (artistId) await logArtistEvent(artistId, "application_reviewed", application.review_status, decision);

  revalidateArtistViews();
  return artistId;
}

// ---------------------------------------------------------------------------
// Outreach — real send/reply mechanics only (AI drafting removed; the
// dedicated Research/Outreach AI workflow was cut for cost/value reasons —
// discovery now happens externally, see createArtist above). Uses the
// shared Gmail connection, never Communication.
// ---------------------------------------------------------------------------

export async function sendArtistOutreach(artistId: string, subject: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: artist } = await supabase.from("artists").select("email, full_name, status").eq("id", artistId).single();
  if (!artist) throw new Error("Artist not found");
  if (!artist.email) throw new Error("NO_VERIFIED_EMAIL");

  const admin = createAdminClient();
  const { data: gmailIntegration } = await admin
    .from("gmail_integration")
    .select("connected_email")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gmailIntegration) throw new Error("GMAIL_NOT_CONNECTED");

  const { gmailThreadId, gmailMessageId } = await sendNewMessage({
    to: artist.email,
    subject,
    body,
    from: gmailIntegration.connected_email,
  });

  const { data: thread, error } = await supabase
    .from("artist_outreach_threads")
    .insert({ artist_id: artistId, gmail_thread_id: gmailThreadId, subject, last_message_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !thread) throw new Error("Failed to record outreach thread");

  await supabase.from("artist_outreach_messages").insert({
    thread_id: thread.id,
    gmail_message_id: gmailMessageId,
    sender: me.full_name,
    is_inbound: false,
    sanitized_body: body,
    sent_at: new Date().toISOString(),
  });

  if (artist.status === "candidate") {
    await supabase.from("artists").update({ status: "contacted" }).eq("id", artistId);
    await logArtistEvent(artistId, "status_changed", "candidate", "contacted");
  }

  revalidateArtistViews();
}

/** Replies within an existing Artist outreach thread — never touches Communication. */
export async function replyArtistOutreach(threadId: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: thread } = await supabase.from("artist_outreach_threads").select("*, artist:artists(email, status, id)").eq("id", threadId).single();
  if (!thread) throw new Error("Outreach thread not found");
  const artist = thread.artist as unknown as { email: string | null; status: string; id: string };
  if (!artist?.email) throw new Error("NO_VERIFIED_EMAIL");
  if (!thread.gmail_thread_id) throw new Error("Thread has no Gmail conversation to reply to");

  const admin = createAdminClient();
  const { data: gmailIntegration } = await admin
    .from("gmail_integration")
    .select("connected_email")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gmailIntegration) throw new Error("GMAIL_NOT_CONNECTED");

  await sendGmailReply({
    gmailThreadId: thread.gmail_thread_id,
    to: artist.email,
    subject: thread.subject ?? "(no subject)",
    body,
    from: gmailIntegration.connected_email,
  });

  const now = new Date().toISOString();
  await supabase.from("artist_outreach_messages").insert({
    thread_id: threadId,
    gmail_message_id: `local-sent-${crypto.randomUUID()}`,
    sender: me.full_name,
    is_inbound: false,
    sanitized_body: body,
    sent_at: now,
  });
  await supabase.from("artist_outreach_threads").update({ last_message_at: now }).eq("id", threadId);

  revalidateArtistViews();
}

async function outreachContext(artistId: string, threadId: string | null): Promise<{ artist: { name: string; bio: string | null; technique: string | null; location: string | null }; thread: ThreadForAI } | null> {
  const supabase = await createClient();
  const { data: artist } = await supabase.from("artists").select("full_name, artist_name, bio, technique, location").eq("id", artistId).single();
  if (!artist) return null;

  let messages: ThreadForAI["messages"] = [];
  let subject: string | null = null;
  if (threadId) {
    const { data: thread } = await supabase.from("artist_outreach_threads").select("subject").eq("id", threadId).single();
    subject = thread?.subject ?? null;
    const { data: rows } = await supabase
      .from("artist_outreach_messages")
      .select("sender, sanitized_body, sent_at, is_inbound")
      .eq("thread_id", threadId)
      .order("sent_at", { ascending: true });
    messages = (rows ?? []).map((m) => ({ sender: m.sender, body: m.sanitized_body ?? "", sentAt: m.sent_at, isInbound: m.is_inbound }));
  }

  return {
    artist: { name: artist.artist_name || artist.full_name, bio: artist.bio, technique: artist.technique, location: artist.location },
    thread: { subject, participants: [], messages },
  };
}

/** "Use AI draft" for the Artist Conversation card (spec §7) — writes an opening outreach email if no thread exists yet, otherwise a reply. */
export async function generateArtistDraft(artistId: string, threadId: string | null): Promise<string> {
  const ctx = await outreachContext(artistId, threadId);
  if (!ctx) return "";
  return generateArtistOutreachDraft(ctx.artist, ctx.thread, artistId);
}

/** "Write from brief" for the Artist Conversation card (spec §7). */
export async function generateArtistDraftFromBrief(artistId: string, threadId: string | null, brief: string): Promise<string> {
  const ctx = await outreachContext(artistId, threadId);
  if (!ctx) return "";
  return generateArtistOutreachDraftFromBrief(ctx.artist, ctx.thread, brief, artistId);
}
