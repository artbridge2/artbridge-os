import "server-only";
import { getEmailThreads } from "@/lib/queries-inbox";
import { getTasks, getProfiles } from "@/lib/queries";
import { getArtists, getArtistApplications } from "@/lib/queries-artists";
import { getCampaignAttentionItems as getCampaignAttentionItemsRaw } from "@/lib/queries-marketing";
import { formatDateOnly, todayInBudapest, weekBounds } from "@/lib/dates";
import { CASE_STATUS_LABELS, type TaskPriority, type TaskWithRelations } from "@/lib/types";

/**
 * Home's normalized cross-module attention item (spec §6). Source modules
 * remain the source of truth for status/assignment/completion — Home never
 * persists a copy, it just reads and ranks. A future module (Artists,
 * Marketing) plugs in by adding its own `get*AttentionItems()` here and
 * contributing to the merge below; Home itself doesn't change.
 */
export interface AttentionItem {
  source_type: "communication" | "task" | "artist" | "campaign";
  source_id: string;
  owner_id: string | null;
  title: string;
  context: string | null;
  priority: TaskPriority;
  due_at: string | null;
  follow_up_at: string | null;
  attention_reason: string;
  href: string;
  updated_at: string;
  /** Overdue relative to due_at/follow_up_at — drives ranking band 2. */
  overdue: boolean;
  /** Human-blocking state (Needs reply/review/approval) — drives ranking band 3. */
  needsHumanDecision: boolean;
}

function isPast(iso: string | null): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

async function getCommunicationAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const threads = await getEmailThreads({ activeOnly: true, ownerId });

  return threads
    .filter((t) => {
      // Waiting cases only re-enter attention once their follow-up is due (spec §7/§11).
      if (t.status === "waiting") return !!t.follow_up_at && t.follow_up_at <= todayInBudapest();
      return true;
    })
    .map((t) => {
      const dueAt = t.follow_up_at ? new Date(t.follow_up_at).toISOString() : null;
      return {
        source_type: "communication" as const,
        source_id: t.id,
        owner_id: t.owner_id,
        title: t.subject || t.sender || "(no subject)",
        context: t.ai_summary,
        priority: t.priority,
        due_at: null,
        follow_up_at: dueAt,
        attention_reason: t.draft_reply ? "AI reply ready for review" : CASE_STATUS_LABELS[t.status],
        href: `/communication/${t.id}`,
        updated_at: t.updated_at,
        overdue: isPast(dueAt),
        needsHumanDecision: t.status === "needs_reply" || t.status === "needs_review" || t.status === "new",
      };
    });
}

function taskIsAttentionWorthy(task: TaskWithRelations, weekEnd: string): boolean {
  if (task.status === "completed") return false;
  const overdue = !!task.due_date && task.due_date < todayInBudapest();
  const dueThisWeek = !!task.due_date && task.due_date <= weekEnd;
  const highPriority = task.priority === "high" || task.priority === "urgent";
  return overdue || dueThisWeek || highPriority;
}

async function getTaskAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const weekEnd = formatDateOnly(weekBounds().end);
  const tasks = await getTasks({ ownerId, excludeDone: true });

  return tasks
    .filter((t) => taskIsAttentionWorthy(t, weekEnd))
    .map((t) => {
      const dueAt = t.due_date ? new Date(t.due_date).toISOString() : null;
      return {
        source_type: "task" as const,
        source_id: t.id,
        owner_id: t.owner_id,
        title: t.title,
        context: t.area?.name ?? null,
        priority: t.priority,
        due_at: dueAt,
        follow_up_at: null,
        attention_reason: t.due_date && t.due_date < todayInBudapest() ? "Overdue" : "Due this week",
        href: `/tasks/${t.id}`,
        updated_at: t.updated_at,
        overdue: !!t.due_date && t.due_date < todayInBudapest(),
        needsHumanDecision: false,
      };
    });
}

export async function getArtistAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const [ownedArtists, profiles] = await Promise.all([
    getArtists({ ownerId }),
    getProfiles(),
  ]);

  const items: AttentionItem[] = ownedArtists
    .filter((a) => a.status === "in_conversation")
    .map((a) => ({
      source_type: "artist" as const,
      source_id: a.id,
      owner_id: a.owner_id,
      title: a.artist_name || a.full_name,
      context: "Artist replied to outreach",
      priority: "normal" as TaskPriority,
      due_at: null,
      follow_up_at: null,
      attention_reason: "Awaiting your response",
      href: `/artists/${a.id}`,
      updated_at: a.updated_at,
      overdue: false,
      needsHumanDecision: true,
    }));

  // Application review is Lili's (Curator) primary responsibility — only surface
  // pending applications in the attention list of whoever is viewed as kurator.
  const viewedProfile = profiles.find((p) => p.id === ownerId);
  if (viewedProfile?.role === "kurator") {
    const pending = await getArtistApplications("pending");
    for (const app of pending) {
      items.push({
        source_type: "artist" as const,
        source_id: app.id,
        owner_id: ownerId,
        title: app.raw_name || app.raw_email || "New artist application",
        context: "Application awaiting review",
        priority: "normal",
        due_at: null,
        follow_up_at: null,
        attention_reason: "Application awaiting review",
        href: `/artists/applications/${app.id}`,
        updated_at: app.submitted_at,
        overdue: false,
        needsHumanDecision: true,
      });
    }
  }

  return items;
}

/** Genuinely Campaign-level attention only (spec §16) — Content/Email/SEO items would qualify independently once those modules exist. */
async function getCampaignAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const items = await getCampaignAttentionItemsRaw(ownerId);
  return items.map((item) => ({
    source_type: "campaign" as const,
    source_id: item.source_id,
    owner_id: item.ownerId,
    title: item.title,
    context: item.context,
    priority: "normal" as TaskPriority,
    due_at: item.date ? new Date(item.date).toISOString() : null,
    follow_up_at: null,
    attention_reason: item.reason,
    href: item.href,
    updated_at: item.date ? new Date(item.date).toISOString() : new Date().toISOString(),
    overdue: item.overdue,
    needsHumanDecision: true,
  }));
}

/** Band per spec §8 — lower sorts first. AI relevance may only reorder within the same band (not implemented — no scoring signal available without an AI key). */
function rankBand(item: AttentionItem): number {
  if (item.priority === "urgent") return 1;
  if (item.overdue) return 2;
  if (item.needsHumanDecision) return 3;
  if (item.follow_up_at) return 4; // follow-up due (already filtered to "due" above)
  if (item.priority === "high") return 5;
  return 6;
}

function rankItems(items: AttentionItem[]): AttentionItem[] {
  return [...items].sort((a, b) => {
    const bandDiff = rankBand(a) - rankBand(b);
    if (bandDiff !== 0) return bandDiff;
    const aDue = a.due_at ?? a.follow_up_at;
    const bDue = b.due_at ?? b.follow_up_at;
    if (aDue && bDue && aDue !== bDue) return aDue < bDue ? -1 : 1;
    if (aDue && !bDue) return -1;
    if (bDue && !aDue) return 1;
    return a.updated_at > b.updated_at ? -1 : 1;
  });
}

/** Home's "Needs your attention" — at most 10, ranked, real. */
export async function getAttentionItems(ownerId: string): Promise<AttentionItem[]> {
  const [communication, tasks, artists, campaigns] = await Promise.all([
    getCommunicationAttentionItems(ownerId).catch((err) => {
      console.error("[attention] communication source failed", err);
      return [];
    }),
    getTaskAttentionItems(ownerId).catch((err) => {
      console.error("[attention] task source failed", err);
      return [];
    }),
    getArtistAttentionItems(ownerId).catch((err) => {
      console.error("[attention] artist source failed", err);
      return [];
    }),
    getCampaignAttentionItems(ownerId).catch((err) => {
      console.error("[attention] campaign source failed", err);
      return [];
    }),
  ]);

  return rankItems([...communication, ...tasks, ...artists, ...campaigns]).slice(0, 10);
}

export interface HomeStats {
  completedThisWeek: number;
  pending: number;
  needsAttention: number;
  dueThisWeek: number;
}

/** Spec §5 — real, cross-module, scoped to the viewed user. */
export async function getHomeStats(ownerId: string): Promise<HomeStats> {
  const weekStart = formatDateOnly(weekBounds().start);
  const weekEndDate = formatDateOnly(weekBounds().end);
  const weekStartIso = new Date(weekStart).toISOString();

  const [activeThreads, allThreadsForCompletion, tasks, attentionItems] = await Promise.all([
    getEmailThreads({ activeOnly: true, ownerId }).catch(() => []),
    getEmailThreads({ status: "resolved", ownerId }).catch(() => []),
    getTasks({ ownerId }).catch(() => []),
    getAttentionItemsUncapped(ownerId),
  ]);

  const completedCommunication = allThreadsForCompletion.filter(
    (t) => t.resolved_at && t.resolved_at >= weekStartIso
  ).length;
  const completedTasks = tasks.filter((t) => t.status === "completed" && t.completed_at && t.completed_at >= weekStartIso).length;

  const pendingCommunication = activeThreads.length;
  const pendingTasks = tasks.filter((t) => t.status !== "completed").length;

  const dueTasksThisWeek = tasks.filter(
    (t) => t.status !== "completed" && t.due_date && t.due_date >= todayInBudapest() && t.due_date <= weekEndDate
  ).length;

  return {
    completedThisWeek: completedCommunication + completedTasks,
    pending: pendingCommunication + pendingTasks,
    needsAttention: attentionItems.length,
    dueThisWeek: dueTasksThisWeek,
  };
}

/** Same eligibility/ranking as the Home queue, but uncapped — used for the "Needs attention" stat (and the Team card's per-member count), which counts everything eligible, not just the visible top 10. */
export async function getAttentionItemsUncapped(ownerId: string): Promise<AttentionItem[]> {
  const [communication, tasks, artists, campaigns] = await Promise.all([
    getCommunicationAttentionItems(ownerId).catch(() => []),
    getTaskAttentionItems(ownerId).catch(() => []),
    getArtistAttentionItems(ownerId).catch(() => []),
    getCampaignAttentionItems(ownerId).catch(() => []),
  ]);
  return [...communication, ...tasks, ...artists, ...campaigns];
}
