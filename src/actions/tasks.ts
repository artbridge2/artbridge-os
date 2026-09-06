"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { notifyUser, notifyMentions } from "@/lib/notify";
import { computeNextDueDate } from "@/lib/recurring";
import { parseDateOnly, formatDateOnly, todayInBudapest } from "@/lib/dates";
import type { ChecklistItem, RecurringRule, TaskPriority, TaskStatus } from "@/lib/types";

export type TaskFormState = { error?: string } | undefined;

function revalidateTaskViews() {
  revalidatePath("/", "layout");
}

async function logTaskEvent(taskId: string, eventType: string, fromValue: string | null, toValue: string | null) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("task_events").insert({
    task_id: taskId,
    actor_id: me.id,
    event_type: eventType,
    from_value: fromValue,
    to_value: toValue,
  });
}

export async function createTask(
  _prevState: TaskFormState,
  formData: FormData
): Promise<TaskFormState> {
  const me = await getCurrentProfile();
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "");
  const areaId = String(formData.get("area_id") ?? "") || null;
  const projectId = String(formData.get("project_id") ?? "") || null;
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const recurringFreq = String(formData.get("recurring_freq") ?? "") || null;
  const recurringEndDate = String(formData.get("recurring_end_date") ?? "") || null;

  if (!title || !ownerId) {
    return { error: "Title and assignee are required." };
  }

  const recurringRule = recurringFreq ? { freq: recurringFreq } : null;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title,
      owner_id: ownerId,
      area_id: areaId,
      project_id: projectId,
      priority,
      due_date: dueDate,
      description,
      status: "todo",
      created_by: me.id,
      recurring_rule: recurringRule,
      recurring_end_date: recurringRule ? recurringEndDate : null,
    })
    .select("id")
    .single();

  if (error || !task) {
    return { error: "Could not create the task." };
  }

  if (ownerId !== me.id) {
    await notifyUser(ownerId, "task_assigned", "New task assigned to you", title, `/tasks/${task.id}`);
  }

  revalidateTaskViews();
  redirect(projectId ? `/projects/${projectId}` : "/tasks");
}

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    owner_id?: string;
    area_id?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    due_date?: string | null;
    due_time?: string | null;
    next_action?: string | null;
    notes?: string | null;
  }
) {
  const supabase = await createClient();
  await supabase.from("tasks").update(patch).eq("id", id);
  revalidateTaskViews();
}

export async function changeStatus(id: string, status: TaskStatus) {
  if (status === "completed") {
    await completeTask(id);
    return;
  }
  const supabase = await createClient();
  const { data: before } = await supabase.from("tasks").select("status").eq("id", id).single();
  await supabase
    .from("tasks")
    .update({ status, completed_at: null })
    .eq("id", id);
  await logTaskEvent(id, "status_changed", before?.status ?? null, status);
  revalidateTaskViews();
}

export async function reassignTask(id: string, ownerId: string) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("tasks").select("owner_id, title").eq("id", id).single();

  await supabase.from("tasks").update({ owner_id: ownerId }).eq("id", id);
  await logTaskEvent(id, "reassigned", before?.owner_id ?? null, ownerId);

  if (ownerId !== before?.owner_id) {
    await notifyUser(ownerId, "task_assigned", "Task reassigned to you", before?.title ?? null, `/tasks/${id}`);
  }
  revalidateTaskViews();
}

export async function changeDueDate(id: string, dueDate: string | null) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ due_date: dueDate }).eq("id", id);
  revalidateTaskViews();
}

export async function changePriority(id: string, priority: TaskPriority) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ priority }).eq("id", id);
  revalidateTaskViews();
}

/**
 * Creates the single next occurrence for a recurring task that was just
 * completed or skipped — never a backlog of future copies. Guards against
 * duplicates (e.g. a double-submit) by checking no sibling already exists at
 * the computed date, and honors an optional recurring_end_date by simply not
 * generating past it (the series just quietly ends, series data stays intact).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateNextOccurrence(supabase: any, task: Record<string, any>) {
  const rule = task.recurring_rule as RecurringRule | null;
  if (!rule) return;

  const anchor = task.due_date ? parseDateOnly(task.due_date) : parseDateOnly(todayInBudapest());
  const nextDate = computeNextDueDate(rule, anchor, false);
  const nextDateStr = formatDateOnly(nextDate);

  if (task.recurring_end_date && nextDateStr > task.recurring_end_date) return;

  const rootId = task.recurring_parent_id ?? task.id;

  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .or(`id.eq.${rootId},recurring_parent_id.eq.${rootId}`)
    .eq("due_date", nextDateStr)
    .limit(1)
    .maybeSingle();
  if (existing) return;

  await supabase.from("tasks").insert({
    title: task.title,
    description: task.description,
    owner_id: task.owner_id,
    area_id: task.area_id,
    priority: task.priority,
    status: "todo",
    due_date: nextDateStr,
    recurring_rule: rule,
    recurring_parent_id: rootId,
    recurring_end_date: task.recurring_end_date,
    created_by: task.created_by,
  });
}

/**
 * Marks a task Completed and, if it's recurring, creates exactly one follow-up
 * occurrence — never a backlog of future copies (see lib/recurring.ts).
 */
export async function completeTask(id: string) {
  const supabase = await createClient();

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (!task) return;

  await supabase
    .from("tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", id);
  await logTaskEvent(id, "completed", task.status, "completed");

  await generateNextOccurrence(supabase, task);

  revalidateTaskViews();
}

/**
 * Skips this one occurrence of a recurring task — it never happened, so it
 * doesn't count as completed work, but it stays in the series' history
 * (spec §13: "skip one occurrence" without breaking the series).
 */
export async function skipRecurringOccurrence(id: string) {
  const supabase = await createClient();

  const { data: task } = await supabase.from("tasks").select("*").eq("id", id).single();
  if (!task || !task.recurring_rule) return;

  await supabase.from("tasks").update({ skipped_at: new Date().toISOString() }).eq("id", id);
  await logTaskEvent(id, "skipped", task.status, "skipped");

  await generateNextOccurrence(supabase, task);

  revalidateTaskViews();
}

export async function reopenTask(id: string) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status: "todo", completed_at: null })
    .eq("id", id);
  await logTaskEvent(id, "reopened", "completed", "todo");
  revalidateTaskViews();
}

export async function stopRecurrence(id: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ recurring_rule: null }).eq("id", id);
  revalidateTaskViews();
}

// ---------------------------------------------------------------------------
// Checklist — lightweight, lives on the task row (spec §7)
// ---------------------------------------------------------------------------

export async function addChecklistItem(taskId: string, text: string) {
  if (!text.trim()) return;
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("checklist").eq("id", taskId).single();
  const checklist: ChecklistItem[] = [...((task?.checklist as ChecklistItem[]) ?? []), { id: crypto.randomUUID(), text: text.trim(), done: false }];
  await supabase.from("tasks").update({ checklist }).eq("id", taskId);
  revalidateTaskViews();
}

export async function toggleChecklistItem(taskId: string, itemId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("checklist").eq("id", taskId).single();
  const checklist: ChecklistItem[] = ((task?.checklist as ChecklistItem[]) ?? []).map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item
  );
  await supabase.from("tasks").update({ checklist }).eq("id", taskId);
  revalidateTaskViews();
}

export async function removeChecklistItem(taskId: string, itemId: string) {
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("checklist").eq("id", taskId).single();
  const checklist: ChecklistItem[] = ((task?.checklist as ChecklistItem[]) ?? []).filter((item) => item.id !== itemId);
  await supabase.from("tasks").update({ checklist }).eq("id", taskId);
  revalidateTaskViews();
}

// ---------------------------------------------------------------------------
// Comments + @mentions (spec §8)
// ---------------------------------------------------------------------------

export async function postTaskComment(taskId: string, body: string, mentionedProfileIds: string[] = []) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single();

  const { error } = await supabase.from("task_comments").insert({ task_id: taskId, author_id: me.id, body, mentioned_profile_ids: mentionedProfileIds });
  if (error) throw new Error("Could not post comment.");
  await notifyMentions(mentionedProfileIds, me.id, me.full_name, task?.title ?? null, `/tasks/${taskId}`);

  revalidateTaskViews();
}

// ---------------------------------------------------------------------------
// Attachments — v1 is a name + external URL (e.g. a Drive link), see spec §9
// ---------------------------------------------------------------------------

export async function addTaskAttachment(taskId: string, name: string, url: string) {
  if (!name.trim() || !url.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("task_attachments").insert({ task_id: taskId, name: name.trim(), url: url.trim(), added_by: me.id });
  revalidateTaskViews();
}

export async function removeTaskAttachment(id: string) {
  const supabase = await createClient();
  await supabase.from("task_attachments").delete().eq("id", id);
  revalidateTaskViews();
}

// ---------------------------------------------------------------------------
// Linked object (spec §11)
// ---------------------------------------------------------------------------

export async function setLinkedObject(
  taskId: string,
  linked: { linked_type: string; linked_id: string; linked_href: string; linked_title: string } | null
) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update(
      linked ?? { linked_type: null, linked_id: null, linked_href: null, linked_title: null }
    )
    .eq("id", taskId);
  revalidateTaskViews();
}

export async function deleteTask(id: string) {
  const supabase = await createClient();
  await supabase.from("tasks").delete().eq("id", id);
  revalidateTaskViews();
  redirect("/tasks");
}
