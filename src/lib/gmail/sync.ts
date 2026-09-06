import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getCurrentHistoryId,
  getThread,
  listChangedThreadIds,
  listRecentThreadIds,
  type FetchedThread,
} from "./client";
import { classifyThread, extractEmail, generateReplyDraft, CLASSIFICATION_VERSION, type ClassificationResult, type ShopifyDraftContext, type ThreadForAI } from "@/lib/ai/provider";
import { findShopifyCustomerByEmail } from "@/lib/shopify/lookup";
import { decideIngestion } from "./ingestion";
import type { CaseStatus, ChecklistItem } from "@/lib/types";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * classifyThread() returns the role label it reasoned about ("adam"/
 * "eszter"), not a real profile UUID — email_threads.owner_id is a UUID FK,
 * so writing the label directly always failed with a Postgres type error.
 * That failure was being silently swallowed (see applyClassification below),
 * which is why classification effectively never persisted for any thread
 * the AI assigned an owner to.
 */
export async function resolveOwnerProfileId(admin: Admin, roleLabel: "adam" | "eszter" | null): Promise<string | null> {
  if (!roleLabel) return null;
  const { data } = await admin.from("profiles").select("id").eq("role", roleLabel).maybeSingle();
  return data?.id ?? null;
}

/** Configurable in Settings — below this, a classification never fully trusts itself (spec: confidence + Needs review). */
async function getConfidenceThreshold(admin: Admin): Promise<number> {
  const { data } = await admin.from("workspace_settings").select("classification_confidence_threshold").eq("id", true).single();
  return data?.classification_confidence_threshold ?? 0.6;
}

/** "Display Name <email@domain.com>" -> "Display Name", falling back to the email/raw string when there's no display name. */
function extractSenderName(raw: string | null): string | null {
  if (!raw) return null;
  const match = raw.match(/^"?([^"<]+)"?\s*<[^>]+>/);
  const name = match?.[1]?.trim();
  return name && name.length > 0 ? name : extractEmail(raw);
}

/** Best-effort Shopify context for draft generation — reuses the same customer the classifier already matched, never a fresh guess. Failure here must never block classification from being saved. */
async function fetchShopifyDraftContext(senderRaw: string | null): Promise<ShopifyDraftContext | null> {
  if (!senderRaw) return null;
  try {
    const match = await findShopifyCustomerByEmail(extractEmail(senderRaw));
    if (!match) return null;
    return {
      customerName: match.name,
      ordersCount: match.ordersCount,
      recentOrders: match.recentOrders.map((o) => ({ name: o.name, createdAt: o.createdAt, fulfillmentStatus: o.fulfillmentStatus })),
    };
  } catch (err) {
    console.error("[sync] shopify draft context lookup failed", err);
    return null;
  }
}

/**
 * Shared by the live sync path, the backlog backfill, and the manual
 * category-correction re-evaluation — one place that writes a classification
 * result to a thread. `categoryLocked` is true once a human has manually
 * corrected the category (see setCategory in actions/inbox.ts) — the AI's
 * own category guess is silently dropped in that case so a later
 * reclassification (a new inbound message, the backfill batch) can never
 * revert a human's fix. Every other field still gets the fresh AI result.
 */
export async function applyClassification(
  admin: Admin,
  threadId: string,
  newestMessageId: string | null,
  existingOwnerId: string | null,
  result: ClassificationResult,
  threadForAI: ThreadForAI,
  senderRaw: string | null,
  categoryLocked = false,
  statusLocked = false,
  priorityLocked = false
): Promise<void> {
  const threshold = await getConfidenceThreshold(admin);
  const lowConfidence = result.confidence < threshold;

  // Confidence enforced in code, not just the prompt: a high-confidence
  // "irrelevant" call is suppressed as before, but an UNCERTAIN one is never
  // silently dropped — it's kept as a real case routed to the existing
  // status='needs_review' queue so a human confirms instead of a message
  // just disappearing.
  if (!result.should_create_case && !lowConfidence) {
    const { error } = await admin
      .from("email_threads")
      .update({ suppressed: true, suppressed_by: "ai", classification_version: CLASSIFICATION_VERSION, last_classified_message_id: newestMessageId })
      .eq("id", threadId);
    // A silently-ignored write error left threads permanently stuck at
    // classification_version 0 with no visible failure anywhere — surface it
    // as a real error so the caller's error count (and retry-on-next-run)
    // actually reflects reality.
    if (error) throw new Error(`suppress update failed: ${error.message}`);
    return;
  }

  // Never overwrite a manual reassignment with a low-confidence guess.
  const ownerId = existingOwnerId ?? (await resolveOwnerProfileId(admin, result.owner));

  const checklist: ChecklistItem[] = result.next_actions.map((text) => ({
    id: crypto.randomUUID(),
    text,
    done: false,
  }));

  // The case genuinely needs a human reply — prepare the draft now instead of
  // making Ádám/Eszter click "Generate" every time they open it. Best-effort:
  // a draft-generation failure must not lose the classification itself. Never
  // for a low-confidence call — we're not confident enough to write a reply
  // in this case's voice, let alone confident enough to auto-route it.
  let draftReply: string | null = null;
  let draftGeneratedAt: string | null = null;
  if (!lowConfidence && !statusLocked && result.status === "needs_reply") {
    try {
      const shopifyContext = result.shopify_customer_id ? await fetchShopifyDraftContext(senderRaw) : null;
      draftReply = await generateReplyDraft(threadForAI, shopifyContext, threadId);
      draftGeneratedAt = new Date().toISOString();
    } catch (err) {
      console.error("[sync] auto draft generation failed", err);
    }
  }

  // An uncertain classification never gets to pick a normal operational
  // status for itself — it goes to the existing Needs review queue instead,
  // same as any other case that needs a human decision.
  const effectiveStatus = lowConfidence ? "needs_review" : result.status;

  const { error } = await admin
    .from("email_threads")
    .update({
      suppressed: false,
      suppressed_by: null,
      suggested_artist_application: result.is_artist_application,
      ...(categoryLocked ? {} : { category: result.category }),
      issue_type: result.issue_type,
      owner_id: ownerId,
      ...(priorityLocked ? {} : { priority: result.priority }),
      ...(statusLocked ? {} : { status: effectiveStatus }),
      ai_suggested_status: result.status,
      ai_summary: result.summary,
      ai_confidence: result.confidence,
      suggested_next_action: result.suggested_next_action,
      follow_up_at: result.suggested_follow_up_date,
      shopify_customer_id: result.shopify_customer_id,
      shopify_order_id: result.shopify_order_id,
      shopify_match_confidence: result.shopify_match_confidence,
      ai_checklist: checklist,
      ...(draftReply ? { draft_reply: draftReply, draft_generated_at: draftGeneratedAt } : {}),
      classification_version: CLASSIFICATION_VERSION,
      last_classified_message_id: newestMessageId,
    })
    .eq("id", threadId);
  if (error) throw new Error(`classification update failed: ${error.message}`);

  // Confident inbound artist application -> match or create the Artist
  // record and move the real conversation there, rather than leaving it
  // sitting in Communications as a mere category label (spec point 4).
  if (!lowConfidence && result.is_artist_application) {
    await routeArtistApplication(admin, threadId, threadForAI, senderRaw).catch((err) => {
      console.error("[sync] artist application routing failed for thread", threadId, err);
    });
  }

  // A case just got a real owner for the first time — that person needs to
  // know it exists rather than discovering it by chance. Only on genuine
  // fresh assignment, never on every reclassification of an already-owned case.
  if (ownerId && !existingOwnerId) {
    await admin.from("notifications").insert({
      user_id: ownerId,
      type: "case_assigned",
      title: "New case assigned to you",
      body: threadForAI.subject ?? "(no subject)",
      href: `/communication/${threadId}`,
    });
  }
}

/**
 * Moves a Communication thread's real conversation onto an Artist record
 * (existing match by email, or a freshly-created one) and suppresses the
 * Communication case — the work now lives in Artists, not as a label on a
 * case (spec point 4). Idempotent: if this thread is already linked to an
 * artist_outreach_threads row (e.g. a re-classification pass, or the reply
 * already came through the outreach path), this is a no-op.
 */
async function routeArtistApplication(admin: Admin, threadId: string, threadForAI: ThreadForAI, senderRaw: string | null): Promise<void> {
  const { data: thread } = await admin.from("email_threads").select("gmail_thread_id, subject").eq("id", threadId).single();
  if (!thread) return;

  const { data: alreadyLinked } = await admin
    .from("artist_outreach_threads")
    .select("id")
    .eq("gmail_thread_id", thread.gmail_thread_id)
    .maybeSingle();
  if (alreadyLinked) return;

  const senderEmail = senderRaw ? extractEmail(senderRaw) : null;
  if (!senderEmail) return;
  const senderName = extractSenderName(senderRaw) ?? senderEmail;

  const { data: existingArtist } = await admin.from("artists").select("id, status").eq("email", senderEmail).maybeSingle();

  let artistId: string;
  if (existingArtist) {
    artistId = existingArtist.id;
    if (existingArtist.status === "candidate" || existingArtist.status === "contacted") {
      await admin.from("artists").update({ status: "in_conversation" }).eq("id", artistId);
      await admin.from("artist_events").insert({ artist_id: artistId, event_type: "status_changed", from_value: existingArtist.status, to_value: "in_conversation" });
    }
  } else {
    const { data: newArtist, error } = await admin
      .from("artists")
      .insert({ full_name: senderName, email: senderEmail, source: "applied", status: "in_conversation" })
      .select("id")
      .single();
    if (error || !newArtist) {
      console.error("[sync] failed to create artist from application", error?.message);
      return;
    }
    artistId = newArtist.id;
    await admin.from("artist_events").insert({ artist_id: artistId, event_type: "created_from_application", from_value: null, to_value: "in_conversation" });
  }

  await linkThreadToArtist(admin, threadId, thread.gmail_thread_id, artistId, thread.subject);

  // Artist acquisition defaults to Ádám (matches DEFAULT_CATEGORY_OWNER_ROLE's
  // artist->adam routing) — best-effort, must never break the routing itself.
  const adamId = await resolveOwnerProfileId(admin, "adam");
  if (adamId) {
    await admin
      .from("notifications")
      .insert({
        user_id: adamId,
        type: "artist_application",
        title: `${senderName} — new Artist application`,
        body: threadForAI.subject ?? thread.subject,
        href: `/artists/${artistId}`,
      })
      .then(
        () => {},
        () => {}
      );
  }
}

/** Copies a Communication thread's already-fetched messages onto a real artist_outreach_threads/messages pair, then suppresses the original case — future replies on this gmail_thread_id are picked up by upsertThread's existing outreach-thread check, same as an Artbridge-initiated conversation. */
async function linkThreadToArtist(admin: Admin, emailThreadId: string, gmailThreadId: string, artistId: string, subject: string | null): Promise<void> {
  const { data: outreachThread, error } = await admin
    .from("artist_outreach_threads")
    .insert({ artist_id: artistId, gmail_thread_id: gmailThreadId, subject, last_message_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !outreachThread) {
    console.error("[sync] failed to create artist outreach thread for application", error?.message);
    return;
  }

  const { data: messages } = await admin
    .from("email_messages")
    .select("gmail_message_id, sender, sanitized_body, is_inbound, sent_at")
    .eq("thread_id", emailThreadId);

  if (messages && messages.length > 0) {
    await admin.from("artist_outreach_messages").upsert(
      messages.map((m) => ({
        thread_id: outreachThread.id,
        gmail_message_id: m.gmail_message_id,
        sender: m.sender,
        sanitized_body: m.sanitized_body,
        is_inbound: m.is_inbound,
        sent_at: m.sent_at,
      })),
      { onConflict: "gmail_message_id", ignoreDuplicates: true }
    );
  }

  await admin.from("email_threads").update({ suppressed: true }).eq("id", emailThreadId);
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
    .select("id, last_classified_message_id, status, owner_id, category, category_source, status_source, priority_source, suppressed, suppressed_by, classification_version")
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
      await admin.from("email_threads").update({ suppressed: true, suppressed_by: "ingestion_rule" }).eq("id", thread.id);
      return; // Deterministic rule match — genuinely permanent, no reconsideration needed.
    }
  } else if (existing.suppressed) {
    if (existing.suppressed_by === "ingestion_rule") return;
    // AI-suppressed (should_create_case=false from a possibly-since-improved
    // classifier) — worth reconsidering once CLASSIFICATION_VERSION bumps,
    // unlike a deterministic ingestion-rule suppression. Falls through to the
    // normal classification-staleness check below instead of exiting here.
  }

  const alreadyClassified =
    existing?.last_classified_message_id === newestMessageId && existing?.classification_version === CLASSIFICATION_VERSION;

  if (alreadyClassified || fetched.messages.length === 0) return;

  try {
    const threadForAI: ThreadForAI = {
      subject: fetched.subject,
      participants: fetched.participants,
      messages: fetched.messages.map((m) => ({
        sender: m.sender,
        body: m.body,
        sentAt: m.sentAt,
        isInbound: m.isInbound,
      })),
    };
    const result = await classifyThread(threadForAI, thread.id);

    await applyClassification(
      admin,
      thread.id,
      newestMessageId,
      existing?.owner_id ?? null,
      result,
      threadForAI,
      threadRow.sender,
      existing?.category_source === "human",
      existing?.status_source === "human",
      existing?.priority_source === "human"
    );
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

// Live-fetching + classifying each thread from Gmail is slow enough that an
// unbounded loop over a real 30-day backlog reliably exceeds Vercel's
// serverless time limit — which silently prevented last_history_id from
// EVER being set (the update ran after the loop, so a timeout meant it
// never ran at all), permanently trapping every sync in expensive
// full-rescan mode instead of graduating to cheap incremental syncs.
const INITIAL_SYNC_BOUND = 40;

/** One-time backfill for the last `days` days. Bounded and resumable — safe to re-run, upserts by gmail_thread_id. */
export async function runInitialSync(days = 30): Promise<SyncResult> {
  const startedAt = Date.now();
  const admin = createAdminClient();
  const myEmail = await getConnectedEmail(admin);

  const { data: integration } = await admin
    .from("gmail_integration")
    .select("id")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Capture historyId FIRST, before the (possibly-interrupted) backfill loop
  // runs, so future syncs can go straight to cheap incremental mode instead
  // of being stuck re-scanning the last `days` days forever. Gmail returns
  // threads for a plain date-range query most-recent-first, so a bounded
  // slice still reliably covers the newest activity (e.g. a reply that just
  // came in) even though older backlog threads may need another run.
  if (integration) {
    try {
      const historyId = await getCurrentHistoryId();
      const { error } = await admin.from("gmail_integration").update({ last_history_id: historyId }).eq("id", integration.id);
      if (error) console.error("[sync] failed to persist last_history_id", error.message);
    } catch (err) {
      console.error("[sync] failed to capture current historyId", err);
    }
  }

  const threadIds = await listRecentThreadIds(days);

  let processed = 0;
  let errors = 0;
  for (const id of threadIds.slice(0, INITIAL_SYNC_BOUND)) {
    if (Date.now() - startedAt > 45_000) break;
    try {
      const fetched = await getThread(id, myEmail);
      await upsertThread(admin, fetched);
      processed++;
    } catch (err) {
      console.error("[sync] failed to fetch thread", id, err);
      errors++;
    }
  }

  if (integration) {
    const { error } = await admin.from("gmail_integration").update({ last_synced_at: new Date().toISOString() }).eq("id", integration.id);
    if (error) console.error("[sync] failed to persist last_synced_at", error.message);
  }

  return { threadsProcessed: processed, errors };
}

/** Incremental sync via Gmail historyId — call this from the cron route. */
/**
 * Checkpointed/resumable (spec: "batch feldolgozás -> progress mentés ->
 * következő batch"). The old version only persisted last_history_id AFTER
 * the whole loop finished, so a run that timed out partway through made
 * literally zero permanent progress — the next run recomputed the same
 * diff and could get stuck reprocessing the same early threads forever on
 * a busy day. Now: capture "now" as the new checkpoint FIRST (safe because
 * upsertThread is itself idempotent — reprocessing an already-ingested
 * thread is a harmless no-op), then track exactly which threads from this
 * pass actually finished in a small durable queue (gmail_sync_pending) so
 * anything left over — timed out, or a transient per-thread error — is
 * retried by the very next run (cron or manual "Sync now"), regardless of
 * whether new Gmail history has arrived since.
 */
export async function runIncrementalSync(): Promise<SyncResult> {
  const startedAt = Date.now();
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

  const currentHistoryId = await getCurrentHistoryId();

  const { data: pendingRows } = await admin.from("gmail_sync_pending").select("gmail_thread_id");
  const pendingIds = (pendingRows ?? []).map((r) => r.gmail_thread_id);
  const queue = [...new Set([...pendingIds, ...changedIds])];

  // Advance the checkpoint before processing, not after — see doc comment above.
  await admin
    .from("gmail_integration")
    .update({ last_synced_at: new Date().toISOString(), last_history_id: currentHistoryId })
    .eq("id", integration.id);

  const myEmail = await getConnectedEmail(admin);
  let processed = 0;
  let errors = 0;
  const budgetMs = 40_000; // leaves headroom under Vercel's 60s maxDuration for the backfill pass below
  let i = 0;
  for (; i < queue.length; i++) {
    if (Date.now() - startedAt > budgetMs) break;
    const id = queue[i]!;
    try {
      const fetched = await getThread(id, myEmail);
      await upsertThread(admin, fetched);
      processed++;
      await admin.from("gmail_sync_pending").delete().eq("gmail_thread_id", id);
    } catch (err) {
      console.error("[sync] failed to fetch thread", id, err);
      errors++;
      await admin.from("gmail_sync_pending").upsert({ gmail_thread_id: id }, { onConflict: "gmail_thread_id" });
    }
  }
  // Ran out of time before even reaching these — they must stay queued too.
  const notReached = queue.slice(i);
  if (notReached.length > 0) {
    await admin
      .from("gmail_sync_pending")
      .upsert(
        notReached.map((gmail_thread_id) => ({ gmail_thread_id })),
        { onConflict: "gmail_thread_id", ignoreDuplicates: true }
      );
  }

  const remainingBudgetMs = 45_000 - (Date.now() - startedAt);
  const backfill = remainingBudgetMs > 5_000 ? await classifyBacklogBatch(remainingBudgetMs) : { processed: 0, errors: 0, remaining: 0 };

  return { threadsProcessed: processed + backfill.processed, errors: errors + backfill.errors };
}

export interface BackfillResult {
  processed: number;
  errors: number;
  remaining: number;
  errorSamples?: string[];
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
export async function classifyBacklogBatch(maxBudgetMs = 45_000): Promise<BackfillResult> {
  const admin = createAdminClient();
  const startedAt = Date.now();

  // Pull a generous pool up front (cheap — one query) rather than guessing a
  // fixed per-invocation count: real per-thread latency varies a lot (email
  // length, whether a Shopify lookup round trip happens), so pace by actual
  // elapsed time and stop with a safety margin before Vercel's hard cutoff
  // instead of risking a mid-call timeout that loses whatever didn't commit.
  // Reconsiders never-suppressed stale threads AND AI-suppressed ones (a
  // should_create_case=false verdict from a possibly-since-improved
  // classifier) — but never an ingestion_rule suppression, which is a
  // deterministic admin/heuristic match that stays permanent by design.
  const { data: threads } = await admin
    .from("email_threads")
    .select("id, subject, participants, owner_id, sender, category_source, status_source, priority_source")
    .or("suppressed.eq.false,suppressed_by.eq.ai")
    .neq("classification_version", CLASSIFICATION_VERSION)
    .order("created_at", { ascending: true })
    .limit(50);

  let processed = 0;
  let errors = 0;
  const errorSamples: string[] = [];

  for (const thread of threads ?? []) {
    if (Date.now() - startedAt > maxBudgetMs) break;
    try {
      const { data: messages } = await admin
        .from("email_messages")
        .select("gmail_message_id, sender, sanitized_body, sent_at, is_inbound")
        .eq("thread_id", thread.id)
        .order("sent_at", { ascending: true });

      if (!messages || messages.length === 0) continue;

      const participants = ((thread.participants as { email: string }[] | null) ?? []).map((p) => p.email);
      const newestMessageId = messages.at(-1)?.gmail_message_id ?? null;

      const threadForAI: ThreadForAI = {
        subject: thread.subject,
        participants,
        messages: messages.map((m) => ({
          sender: m.sender,
          body: m.sanitized_body ?? "",
          sentAt: m.sent_at,
          isInbound: m.is_inbound,
        })),
      };
      const result = await classifyThread(threadForAI, thread.id);

      await applyClassification(
        admin,
        thread.id,
        newestMessageId,
        thread.owner_id,
        result,
        threadForAI,
        thread.sender,
        thread.category_source === "human",
        thread.status_source === "human",
        thread.priority_source === "human"
      );
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[sync] backfill classification failed for thread", thread.id, err);
      if (errorSamples.length < 5) errorSamples.push(`${thread.id}: ${message}`);
      errors++;
    }
  }

  const { count: remaining } = await admin
    .from("email_threads")
    .select("id", { count: "exact", head: true })
    .or("suppressed.eq.false,suppressed_by.eq.ai")
    .neq("classification_version", CLASSIFICATION_VERSION);

  return {
    processed,
    errors,
    remaining: remaining ?? 0,
    errorSamples: errorSamples.length > 0 ? errorSamples : undefined,
  };
}

/**
 * One-off reconciliation helper: (re)classifies an explicit list of Gmail
 * thread IDs regardless of their current classification_version/suppressed
 * state — used for the starred-thread calibration pass (Communications V2
 * spec point 5/6), not part of any ongoing scheduled path. Skips any thread
 * whose sender already matches the deterministic automated-sender/domain
 * heuristics: those are known junk and shouldn't even be read in for AI
 * review, per Ádám's explicit instruction.
 */
export async function classifySpecificThreads(
  gmailThreadIds: string[]
): Promise<{ processed: number; skippedJunk: number; skippedMissing: number; errors: number; errorSamples: string[] }> {
  const admin = createAdminClient();
  let processed = 0;
  let skippedJunk = 0;
  let skippedMissing = 0;
  let errors = 0;
  const errorSamples: string[] = [];

  for (const gmailThreadId of gmailThreadIds) {
    try {
      const { data: thread } = await admin
        .from("email_threads")
        .select("id, subject, participants, owner_id, sender, category_source, status_source, priority_source")
        .eq("gmail_thread_id", gmailThreadId)
        .maybeSingle();

      if (!thread) {
        skippedMissing++;
        continue;
      }

      const ingestion = await decideIngestion({ sender: thread.sender, subject: thread.subject });
      if (ingestion.suppressed) {
        skippedJunk++;
        continue;
      }

      const { data: messages } = await admin
        .from("email_messages")
        .select("gmail_message_id, sender, sanitized_body, sent_at, is_inbound")
        .eq("thread_id", thread.id)
        .order("sent_at", { ascending: true });

      if (!messages || messages.length === 0) {
        skippedMissing++;
        continue;
      }

      const participants = ((thread.participants as { email: string }[] | null) ?? []).map((p) => p.email);
      const newestMessageId = messages.at(-1)?.gmail_message_id ?? null;

      const threadForAI: ThreadForAI = {
        subject: thread.subject,
        participants,
        messages: messages.map((m) => ({
          sender: m.sender,
          body: m.sanitized_body ?? "",
          sentAt: m.sent_at,
          isInbound: m.is_inbound,
        })),
      };
      const result = await classifyThread(threadForAI, thread.id);

      await applyClassification(
        admin,
        thread.id,
        newestMessageId,
        thread.owner_id,
        result,
        threadForAI,
        thread.sender,
        thread.category_source === "human",
        thread.status_source === "human",
        thread.priority_source === "human"
      );
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[sync] specific-thread classification failed for", gmailThreadId, err);
      if (errorSamples.length < 10) errorSamples.push(`${gmailThreadId}: ${message}`);
      errors++;
    }
  }

  return { processed, skippedJunk, skippedMissing, errors, errorSamples };
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
