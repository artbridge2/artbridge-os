"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/dal";
import { generateReplyDraft } from "@/lib/ai/provider";
import { sendReply } from "@/lib/gmail/client";
import type { ThreadStatus } from "@/lib/types";

function revalidateInboxViews() {
  revalidatePath("/", "layout");
}

export async function changeThreadStatus(threadId: string, status: ThreadStatus) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ status }).eq("id", threadId);
  revalidateInboxViews();
}

export async function reassignThread(threadId: string, ownerId: string | null) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ owner_id: ownerId }).eq("id", threadId);
  revalidateInboxViews();
}

export async function setFollowUpDate(threadId: string, followUpAt: string | null) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ follow_up_at: followUpAt }).eq("id", threadId);
  revalidateInboxViews();
}

export async function generateDraft(threadId: string) {
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("email_threads")
    .select("id, subject")
    .eq("id", threadId)
    .single();
  if (!thread) return;

  const { data: messages } = await supabase
    .from("email_messages")
    .select("sender, sanitized_body, sent_at, is_inbound")
    .eq("thread_id", threadId)
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
}

export async function updateDraft(threadId: string, body: string) {
  const supabase = await createClient();
  await supabase.from("email_threads").update({ draft_reply: body }).eq("id", threadId);
  revalidateInboxViews();
}

/** Explicit send — the only path in the app that emails anyone. Never called from sync/classification code. */
export async function sendDraft(threadId: string) {
  const supabase = await createClient();

  const { data: thread } = await supabase
    .from("email_threads")
    .select("*")
    .eq("id", threadId)
    .single();
  if (!thread || !thread.draft_reply) return;

  const recipient = thread.sender;
  if (!recipient) throw new Error("Thread has no sender to reply to");

  const admin = createAdminClient();
  const { data: gmailIntegration } = await admin
    .from("gmail_integration")
    .select("connected_email")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gmailIntegration) throw new Error("Gmail is not connected");

  await sendReply({
    gmailThreadId: thread.gmail_thread_id,
    to: recipient,
    subject: thread.subject ?? "(no subject)",
    body: thread.draft_reply,
    from: gmailIntegration.connected_email,
  });

  await supabase
    .from("email_threads")
    .update({
      status: "waiting",
      last_outbound_at: new Date().toISOString(),
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
