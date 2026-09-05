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
import { decideIngestion } from "./ingestion";
import type { CaseStatus } from "@/lib/types";

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
 * Stores/updates one thread + its messages, decides whether it should be an
 * active case (rules first, then AI when configured), and (re)classifies
 * only when the newest message hasn't been classified yet — see cost-control
 * notes in lib/ai/rules.ts / the Communication spec. Never throws for a
 * single bad thread — logs and moves on so one malformed email doesn't stop
 * the whole sync.
 */
async function upsertThread(admin: Admin, fetched: FetchedThread): Promise<void> {
  const newestMessageId = fetched.messages.at(-1)?.gmailMessageId ?? null;
  const lastInbound = [...fetched.messages].reverse().find((m) => m.isInbound);
  const lastOutbound = [...fetched.messages].reverse().find((m) => !m.isInbound);

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

    if (!result.should_create_case) {
      await admin
        .from("email_threads")
        .update({ suppressed: true, classification_version: CLASSIFICATION_VERSION, last_classified_message_id: newestMessageId })
        .eq("id", thread.id);
      return;
    }

    await admin
      .from("email_threads")
      .update({
        category: result.category,
        issue_type: result.issue_type,
        // Never overwrite a manual reassignment with a low-confidence guess.
        owner_id: existing?.owner_id ?? result.owner,
        priority: result.priority,
        status: result.status,
        ai_summary: result.summary,
        ai_confidence: result.confidence,
        suggested_next_action: result.suggested_next_action,
        follow_up_at: result.suggested_follow_up_date,
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
