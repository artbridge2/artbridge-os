"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/dal";
import { generateReplyDraft } from "@/lib/ai/provider";
import { sendReply as sendGmailReply } from "@/lib/gmail/client";
import type { EmailCategory, ThreadStatus } from "@/lib/types";

function revalidateInboxViews() {
  revalidatePath("/", "layout");
}

export async function changeThreadStatus(threadId: string, status: ThreadStatus) {
  const supabase = await createClient();
  await supabase
    .from("email_threads")
    .update({ status, resolved_at: status === "done" ? new Date().toISOString() : null })
    .eq("id", threadId);
  revalidateInboxViews();
}

export async function markResolved(threadId: string) {
  await changeThreadStatus(threadId, "done");
}

export async function markWaiting(threadId: string) {
  await changeThreadStatus(threadId, "waiting");
}

export async function reassignThread(threadId: string, ownerId: string | null) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ owner_id: ownerId }).eq("id", threadId);
  revalidateInboxViews();
}

export async function convertToInternal(threadId: string) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ category: "internal" satisfies EmailCategory }).eq("id", threadId);
  revalidateInboxViews();
}

export async function updateLabels(threadId: string, labels: string[]) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ labels }).eq("id", threadId);
  revalidateInboxViews();
}

/** Soft-delete: kept for auditability, filtered out of every list/detail query. */
export async function deleteConversation(threadId: string) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ deleted_at: new Date().toISOString() }).eq("id", threadId);
  revalidateInboxViews();
  redirect("/communication");
}

export async function setFollowUpDate(threadId: string, followUpAt: string | null) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ follow_up_at: followUpAt }).eq("id", threadId);
  revalidateInboxViews();
}

/** Prepares an AI draft and returns its text directly so the reply composer can drop it straight in. */
export async function generateDraft(threadId: string): Promise<string> {
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("email_threads")
    .select("id, subject")
    .eq("id", threadId)
    .single();
  if (!thread) return "";

  const { data: messages } = await supabase
    .from("email_messages")
    .select("sender, sanitized_body, sent_at, is_inbound, is_internal_note")
    .eq("thread_id", threadId)
    .eq("is_internal_note", false)
    .order("sent_at", { ascending: true });

  const draft = await generateReplyDraft({
    subject: thread.subject,
    participants: [],
    messages: (messages ?? []).map((m) => ({
      sender: m.sender,
      body: m.sanitized_body ?? "",
      sentAt: m.sent_at,
      isInbound: m.is_inbound,
    })),
  });

  await supabase
    .from("email_threads")
    .update({ draft_reply: draft, draft_generated_at: new Date().toISOString() })
    .eq("id", threadId);

  revalidateInboxViews();
  return draft;
}

/** Internal-only note — never leaves Artbridge. Works with or without Gmail connected. */
export async function postInternalNote(threadId: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();

  await supabase.from("email_messages").insert({
    thread_id: threadId,
    gmail_message_id: `local-note-${crypto.randomUUID()}`,
    sender: me.full_name,
    is_inbound: false,
    is_internal_note: true,
    sanitized_body: body,
    sent_at: new Date().toISOString(),
  });

  revalidateInboxViews();
}

/**
 * Explicit external reply — the only path that emails anyone. Throws
 * "GMAIL_NOT_CONNECTED" if Gmail hasn't been connected yet; callers show a
 * Connect Gmail state rather than a raw error.
 */
export async function sendReply(threadId: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: thread } = await supabase.from("email_threads").select("*").eq("id", threadId).single();
  if (!thread) throw new Error("Thread not found");

  const recipient = thread.sender;
  if (!recipient) throw new Error("Thread has no sender to reply to");

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
    to: recipient,
    subject: thread.subject ?? "(no subject)",
    body,
    from: gmailIntegration.connected_email,
  });

  const now = new Date().toISOString();

  await supabase.from("email_messages").insert({
    thread_id: threadId,
    gmail_message_id: `local-sent-${crypto.randomUUID()}`,
    sender: me.full_name,
    is_inbound: false,
    is_internal_note: false,
    sanitized_body: body,
    sent_at: now,
  });

  await supabase
    .from("email_threads")
    .update({
      status: "waiting",
      last_outbound_at: now,
      draft_reply: null,
      draft_generated_at: null,
    })
    .eq("id", threadId);

  revalidateInboxViews();
}

export async function createTaskFromThread(
  threadId: string,
  input: { title: string; ownerId: string; areaId: string | null; priority: string }
) {
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      owner_id: input.ownerId,
      area_id: input.areaId,
      priority: input.priority,
      status: "todo",
      source_type: "email",
      source_thread_id: threadId,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error) throw new Error("Failed to create task from thread");

  revalidateInboxViews();
  return task.id as string;
}

export interface CreateConversationInput {
  category: EmailCategory;
  recipientEmail: string | null;
  subject: string;
  message: string;
  ownerId: string | null;
}

/**
 * "New conversation" (spec 8.2). Always created as a fully internal,
 * fully-persisted case — no Gmail thread/message is faked. Sending the
 * opening message out externally requires Gmail to be connected first; the
 * UI offers that as a distinct, connection-gated action rather than a
 * checkbox that silently no-ops today.
 */
export async function createConversation(input: CreateConversationInput): Promise<string> {
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const now = new Date().toISOString();

  const { data: thread, error } = await supabase
    .from("email_threads")
    .insert({
      gmail_thread_id: `local-${crypto.randomUUID()}`,
      subject: input.subject,
      participants: input.recipientEmail ? [{ email: input.recipientEmail }] : [],
      sender: input.recipientEmail ?? me.email,
      last_message_at: now,
      last_inbound_at: null,
      last_outbound_at: now,
      category: input.category,
      action: "fyi",
      owner_id: input.ownerId,
      status: "needs_attention",
      classification_version: 0,
    })
    .select("id")
    .single();

  if (error || !thread) throw new Error("Failed to create conversation");

  await supabase.from("email_messages").insert({
    thread_id: thread.id,
    gmail_message_id: `local-${crypto.randomUUID()}`,
    sender: me.full_name,
    is_inbound: false,
    is_internal_note: false,
    sanitized_body: input.message,
    sent_at: now,
  });

  revalidateInboxViews();
  return thread.id as string;
}

export type NewConversationFormState = { error?: string } | undefined;

export async function submitNewConversation(
  _prevState: NewConversationFormState,
  formData: FormData
): Promise<NewConversationFormState> {
  const category = String(formData.get("category") ?? "") as EmailCategory;
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "") || null;
  const recipientEmail = String(formData.get("recipient_email") ?? "").trim() || null;

  if (!category || !subject || !message) {
    return { error: "Category, subject and message are required." };
  }

  let threadId: string;
  try {
    threadId = await createConversation({ category, subject, message, ownerId, recipientEmail });
  } catch {
    return { error: "Could not create the conversation." };
  }

  revalidatePath("/communication");
  redirect(`/communication/${threadId}`);
}
