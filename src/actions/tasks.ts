"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { computeNextDueDate } from "@/lib/recurring";
import { parseDateOnly, formatDateOnly, todayInBudapest } from "@/lib/dates";
import type { RecurringRule, TaskPriority, TaskStatus } from "@/lib/types";

export type TaskFormState = { error?: string } | undefined;

function revalidateTaskViews() {
  revalidatePath("/", "layout");
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
  const priority = String(formData.get("priority") ?? "normal") as TaskPriority;
  const dueDate = String(formData.get("due_date") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title || !ownerId) {
    return { error: "Cím és felelős megadása kötelező." };
  }

  const { error } = await supabase.from("tasks").insert({
    title,
    owner_id: ownerId,
    area_id: areaId,
    priority,
    due_date: dueDate,
    description,
    status: "todo",
    created_by: me.id,
  });

  if (error) {
    return { error: "Nem sikerült létrehozni a taskot." };
  }

  revalidateTaskViews();
  redirect("/tasks");
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
  if (status === "done") {
    await completeTask(id);
    return;
  }
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status, completed_at: null })
    .eq("id", id);
  revalidateTaskViews();
}

export async function reassignTask(id: string, ownerId: string) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ owner_id: ownerId }).eq("id", id);
  revalidateTaskViews();
}

export async function changeDueDate(id: string, dueDate: string | null) {
  const supabase = await createClient();
  await supabase.from("tasks").update({ due_date: dueDate }).eq("id", id);
  revalidateTaskViews();
}

/**
 * Marks a task Done and, if it's recurring, creates exactly one follow-up
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
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", id);

  const rule = task.recurring_rule as RecurringRule | null;
  if (rule) {
    const anchor = task.due_date ? parseDateOnly(task.due_date) : parseDateOnly(todayInBudapest());
    const nextDate = computeNextDueDate(rule, anchor, false);
    const rootId = task.recurring_parent_id ?? task.id;

    await supabase.from("tasks").insert({
      title: task.title,
      description: task.description,
      owner_id: task.owner_id,
      area_id: task.area_id,
      priority: task.priority,
      status: "todo",
      due_date: formatDateOnly(nextDate),
      recurring_rule: rule,
      recurring_parent_id: rootId,
      created_by: task.created_by,
    });
  }

  revalidateTaskViews();
}

export async function reopenTask(id: string) {
  const supabase = await createClient();
  await supabase
    .from("tasks")
    .update({ status: "todo", completed_at: null })
    .eq("id", id);
  revalidateTaskViews();
}
