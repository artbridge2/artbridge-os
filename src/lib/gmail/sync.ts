import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentHistoryId,
  getThread,
  listChangedThreadIds,
  listRecentThreadIds,
  type FetchedThread,
} from "./client";
import { classifyThread, CLASSIFICATION_VERSION } from "@/lib/ai/provider";
import type { ThreadStatus } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

const MY_EMAIL_FALLBACK = "info@artbridge.hu";

async function getConnectedEmail(admin: Admin): Promise<string> {
  const { data } = await admin
    .from("gmail_integration")
    .select("connected_email")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.connected_email ?? MY_EMAIL_FALLBACK;
}

/**
 * Stores/updates one thread + its messages, and (re)classifies it only when
 * the newest message hasn't been classified yet — see cost-control notes in
 * lib/ai/rules.ts / the Inbox spec. Never throws for a single bad thread —
 * logs and moves on so one malformed email doesn't stop the whole sync.
 */
async function upsertThread(admin: Admin, fetched: FetchedThread): Promise<void> {
  const newestMessageId = fetched.messages.at(-1)?.gmailMessageId ?? null;
  const lastInbound = [...fetched.messages].reverse().find((m) => m.isInbound);
  const lastOutbound = [...fetched.messages].reverse().find((m) => !m.isInbound);

  const { data: existing } = await admin
    .from("email_threads")
    .select("id, last_classified_message_id, status, owner_id, classification_version")
    .eq("gmail_thread_id", fetched.gmailThreadId)
    .maybeSingle();

  // A reply we already sent moved this thread out of "needs attention"; a
  // new inbound message on a thread we were waiting on brings it back.
  const reopenToAttention =
    existing?.status === "waiting" &&
    !!lastInbound &&
    existing.last_classified_message_id !== newestMessageId;
  const status: ThreadStatus | undefined = reopenToAttention ? "needs_attention" : undefined;

  const threadRow = {
    gmail_thread_id: fetched.gmailThreadId,
    subject: fetched.subject,
    participants: fetched.participants.map((email) => ({ email })),
    sender: fetched.messages[0]?.sender ?? null,
    last_message_at: fetched.messages.at(-1)?.sentAt ?? null,
    last_inbound_at: lastInbound?.sentAt ?? null,
    last_outbound_at: lastOutbound?.sentAt ?? null,
    snippet: fetched.snippet,
    ...(status ? { status } : {}),
  };

  const { data: thread, error: threadError } = existing
    ? await admin
        .from("email_threads")
        .update(threadRow)
        .eq("id", existing.id)
        .select("id, last_classified_message_id")
        .single()
    : await admin
        .from("email_threads")
        .insert(threadRow)
        .select("id, last_classified_message_id")
        .single();

  if (threadError || !thread) {
    console.error("[sync] failed to upsert thread", fetched.gmailThreadId, threadError?.message);
    return;
  }

  const messageRows = fetched.messages.map((m) => ({
    thread_id: thread.id,
    gmail_message_id: m.gmailMessageId,
    sender: m.sender,
    recipients: m.recipients.map((email) => ({ email })),
    is_inbound: m.isInbound,
    sanitized_body: m.body,
    sent_at: m.sentAt,
  }));

  if (messageRows.length > 0) {
    await admin.from("email_messages").upsert(messageRows, { onConflict: "gmail_message_id" });
  }

  const alreadyClassified =
    existing?.last_classified_message_id === newestMessageId && existing?.classification_version === CLASSIFICATION_VERSION;

  if (alreadyClassified || fetched.messages.length === 0) return;

  try {
    const result = await classifyThread({
      subject: fetched.subject,
      participants: fetched.participants,
      messages: fetched.messages.map((m) => ({
        sender: m.sender,
        body: m.body,
        sentAt: m.sentAt,
        isInbound: m.isInbound,
      })),
    });

    await admin
      .from("email_threads")
      .update({
        category: result.category,
        action: result.action,
        // Never overwrite a manual reassignment with a low-confidence guess.
        owner_id: existing?.owner_id ?? result.owner,
        priority: result.priority,
        ai_summary: result.summary,
        ai_confidence: result.confidence,
        suggested_task_title: result.suggested_task_title,
        follow_up_at: result.suggested_follow_up_date,
        status: result.action === "ignore" ? "done" : status ?? "needs_attention",
        classification_version: CLASSIFICATION_VERSION,
        last_classified_message_id: newestMessageId,
      })
      .eq("id", thread.id);
  } catch (err) {
    console.error("[sync] classification failed for", fetched.gmailThreadId, err);
  }
}

export interface SyncResult {
  threadsProcessed: number;
  errors: number;
}

/** One-time backfill for the last `days` days. Safe to re-run — upserts by gmail_thread_id. */
export async function runInitialSync(days = 30): Promise<SyncResult> {
  const admin = createAdminClient();
  const myEmail = await getConnectedEmail(admin);
  const threadIds = await listRecentThreadIds(days);

  let processed = 0;
  let errors = 0;
  for (const id of threadIds) {
    try {
      const fetched = await getThread(id, myEmail);
      await upsertThread(admin, fetched);
      processed++;
    } catch (err) {
      console.error("[sync] failed to fetch thread", id, err);
      errors++;
    }
  }

  const historyId = await getCurrentHistoryId();
  await admin
    .from("gmail_integration")
    .update({ last_synced_at: new Date().toISOString(), last_history_id: historyId })
    .order("connected_at", { ascending: false })
    .limit(1);

  return { threadsProcessed: processed, errors };
}

/** Incremental sync via Gmail historyId — call this from the cron route. */
export async function runIncrementalSync(): Promise<SyncResult> {
  const admin = createAdminClient();
  const { data: integration } = await admin
    .from("gmail_integration")
    .select("id, last_history_id")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!integration) return { threadsProcessed: 0, errors: 0 };

  if (!integration.last_history_id) {
    return runInitialSync(30);
  }

  const changedIds = await listChangedThreadIds(integration.last_history_id);
  if (changedIds === null) {
    // historyId expired (Gmail only retains ~1 week) — full resync.
    return runInitialSync(30);
  }

  const myEmail = await getConnectedEmail(admin);
  let processed = 0;
  let errors = 0;
  for (const id of changedIds) {
    try {
      const fetched = await getThread(id, myEmail);
      await upsertThread(admin, fetched);
      processed++;
    } catch (err) {
      console.error("[sync] failed to fetch thread", id, err);
      errors++;
    }
  }

  const historyId = await getCurrentHistoryId();
  await admin.from("gmail_integration").update({ last_synced_at: new Date().toISOString(), last_history_id: historyId }).eq("id", integration.id);

  return { threadsProcessed: processed, errors };
}
