import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentHistoryId,
  getThread,
  listChangedThreadIds,
  listRecentThreadIds,
  type FetchedThread,
} from "./client";
import { classifyThread, CLASSIFICATION_VERSION, type ClassificationResult } from "@/lib/ai/provider";
import { decideIngestion } from "./ingestion";
import type { CaseStatus } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

/** Shared by the live sync path and the backlog backfill — one place that writes a classification result to a thread. */
async function applyClassification(
  admin: Admin,
  threadId: string,
  newestMessageId: string | null,
  existingOwnerId: string | null,
  result: ClassificationResult
): Promise<void> {
  if (!result.should_create_case) {
    await admin
      .from("email_threads")
      .update({ suppressed: true, classification_version: CLASSIFICATION_VERSION, last_classified_message_id: newestMessageId })
      .eq("id", threadId);
    return;
  }

  await admin
    .from("email_threads")
    .update({
      category: result.category,
      issue_type: result.issue_type,
      // Never overwrite a manual reassignment with a low-confidence guess.
      owner_id: existingOwnerId ?? result.owner,
      priority: result.priority,
      status: result.status,
      ai_summary: result.summary,
      ai_confidence: result.confidence,
      suggested_next_action: result.suggested_next_action,
      follow_up_at: result.suggested_follow_up_date,
      shopify_customer_id: result.shopify_customer_id,
      shopify_order_id: result.shopify_order_id,
      shopify_match_confidence: result.shopify_match_confidence,
      classification_version: CLASSIFICATION_VERSION,
      last_classified_message_id: newestMessageId,
    })
    .eq("id", threadId);
}

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
 * Stores/updates one thread + its messages, decides whether it should be an
 * active case (rules first, then AI when configured), and (re)classifies
 * only when the newest message hasn't been classified yet — see cost-control
 * notes in the Communication spec (business rules live in Settings → AI). Never throws for a
 * single bad thread — logs and moves on so one malformed email doesn't stop
 * the whole sync.
 */
async function upsertThread(admin: Admin, fetched: FetchedThread): Promise<void> {
  const newestMessageId = fetched.messages.at(-1)?.gmailMessageId ?? null;
  const lastInbound = [...fetched.messages].reverse().find((m) => m.isInbound);
  const lastOutbound = [...fetched.messages].reverse().find((m) => !m.isInbound);

  // Spec boundary: a reply on an Artist acquisition thread belongs to
  // Artists, never Communication — check that first, before any
  // Communication case is created/updated for this gmail_thread_id.
  const { data: outreachThread } = await admin
    .from("artist_outreach_threads")
    .select("id")
    .eq("gmail_thread_id", fetched.gmailThreadId)
    .maybeSingle();
  if (outreachThread) {
    await syncArtistOutreachThread(admin, outreachThread.id, fetched);
    return;
  }

  const { data: existing } = await admin
    .from("email_threads")
    .select("id, last_classified_message_id, status, owner_id, category, suppressed, classification_version")
    .eq("gmail_thread_id", fetched.gmailThreadId)
    .maybeSingle();

  // A reply we already sent moved this thread out of "waiting"; a new
  // inbound message on a thread we were waiting on brings it back to
  // needing a human look. AI classification below may refine this further.
  const reopenToReview = existing?.status === "waiting" && !!lastInbound && existing.last_classified_message_id !== newestMessageId;
  const status: CaseStatus | undefined = reopenToReview ? "needs_review" : undefined;

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
    // New threads only — never override an existing case's category/status default.
    ...(existing ? {} : { category: "other" as const }),
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

  // Rule-based ingestion decision only needs to run once per thread (on
  // first sight) unless the sender changes, which it won't for a thread.
  if (!existing) {
    const ingestion = await decideIngestion({ sender: threadRow.sender, subject: fetched.subject });
    if (ingestion.suppressed) {
      await admin.from("email_threads").update({ suppressed: true }).eq("id", thread.id);
      return; // Suppressed threads are never classified further.
    }
  } else if (existing.suppressed) {
    return; // Stays suppressed once decided — no reclassification churn.
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

    await applyClassification(admin, thread.id, newestMessageId, existing?.owner_id ?? null, result);
  } catch (err) {
    console.error("[sync] classification failed for", fetched.gmailThreadId, err);
  }
}

/** Appends new messages to an existing Artist outreach thread and surfaces the reply as In conversation + a real notification — never as a Communication case. */
async function syncArtistOutreachThread(admin: Admin, threadId: string, fetched: FetchedThread): Promise<void> {
  const messageRows = fetched.messages.map((m) => ({
    thread_id: threadId,
    gmail_message_id: m.gmailMessageId,
    sender: m.sender,
    is_inbound: m.isInbound,
    sanitized_body: m.body,
    sent_at: m.sentAt,
  }));
  if (messageRows.length === 0) return;

  const { data: newlyInserted } = await admin
    .from("artist_outreach_messages")
    .upsert(messageRows, { onConflict: "gmail_message_id", ignoreDuplicates: true })
    .select("is_inbound");

  await admin
    .from("artist_outreach_threads")
    .update({ last_message_at: fetched.messages.at(-1)?.sentAt ?? null })
    .eq("id", threadId);

  const hasNewInbound = (newlyInserted ?? []).some((m) => m.is_inbound);
  if (!hasNewInbound) return;

  const { data: thread } = await admin.from("artist_outreach_threads").select("artist_id, subject").eq("id", threadId).single();
  if (!thread) return;

  const { data: artist } = await admin.from("artists").select("status, owner_id, full_name").eq("id", thread.artist_id).single();
  if (!artist) return;

  if (artist.status === "candidate" || artist.status === "contacted") {
    await admin.from("artists").update({ status: "in_conversation" }).eq("id", thread.artist_id);
    await admin
      .from("artist_events")
      .insert({ artist_id: thread.artist_id, event_type: "status_changed", from_value: artist.status, to_value: "in_conversation" });
  }

  if (artist.owner_id) {
    await admin.from("notifications").insert({
      user_id: artist.owner_id,
      type: "artist_reply",
      title: `${artist.full_name} replied`,
      body: thread.subject,
      href: `/artists/${thread.artist_id}`,
    });
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

  const backfill = await classifyBacklogBatch(15);

  return { threadsProcessed: processed + backfill.processed, errors: errors + backfill.errors };
}

export interface BackfillResult {
  processed: number;
  errors: number;
  remaining: number;
}

/**
 * Classifies threads that were synced but never successfully classified —
 * e.g. because a prior sync run hit Vercel's serverless time limit partway
 * through a large backlog. Reads messages already stored in our own DB, so
 * it needs no Gmail API round trip per thread and can make real progress
 * within one invocation's time budget. Safe to call repeatedly — idempotent
 * via the same classification_version/last_classified_message_id guard used
 * everywhere else, and naturally becomes a no-op once caught up.
 */
export async function classifyBacklogBatch(limit = 15): Promise<BackfillResult> {
  const admin = createAdminClient();

  const { data: threads } = await admin
    .from("email_threads")
    .select("id, subject, participants, owner_id")
    .eq("suppressed", false)
    .neq("classification_version", CLASSIFICATION_VERSION)
    .order("created_at", { ascending: true })
    .limit(limit);

  let processed = 0;
  let errors = 0;

  for (const thread of threads ?? []) {
    try {
      const { data: messages } = await admin
        .from("email_messages")
        .select("gmail_message_id, sender, sanitized_body, sent_at, is_inbound")
        .eq("thread_id", thread.id)
        .order("sent_at", { ascending: true });

      if (!messages || messages.length === 0) continue;

      const participants = ((thread.participants as { email: string }[] | null) ?? []).map((p) => p.email);
      const newestMessageId = messages.at(-1)?.gmail_message_id ?? null;

      const result = await classifyThread({
        subject: thread.subject,
        participants,
        messages: messages.map((m) => ({
          sender: m.sender,
          body: m.sanitized_body ?? "",
          sentAt: m.sent_at,
          isInbound: m.is_inbound,
        })),
      });

      await applyClassification(admin, thread.id, newestMessageId, thread.owner_id, result);
      processed++;
    } catch (err) {
      console.error("[sync] backfill classification failed for thread", thread.id, err);
      errors++;
    }
  }

  const { count: remaining } = await admin
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .eq("suppressed", false)
    .neq("classification_version", CLASSIFICATION_VERSION);

  return { processed, errors, remaining: remaining ?? 0 };
}

/** Resolved -> Archived after 3 days (spec §11). Call this from the daily cron alongside the Gmail sync. */
export async function archiveStaleResolvedCases(): Promise<number> {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data, error } = await admin
    .from("email_threads")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("status", "resolved")
    .lt("resolved_at", cutoff)
    .select("id");
  if (error) {
    console.error("[sync] archival failed", error.message);
    return 0;
  }
  return data?.length ?? 0;
}
