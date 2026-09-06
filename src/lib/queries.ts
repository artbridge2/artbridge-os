import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Area, Profile, TaskAttachment, TaskComment, TaskWithRelations } from "@/lib/types";

const TASK_SELECT = `
  *,
  owner:profiles!tasks_owner_id_fkey(id, full_name, role, email),
  area:areas(id, name, sort_order),
  project:projects(id, name)
`;

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, email")
    .order("role");
  return data ?? [];
}

export async function getAreas(): Promise<Area[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("areas")
    .select("id, name, sort_order")
    .order("sort_order");
  return data ?? [];
}

export interface TaskFilters {
  ownerId?: string;
  areaId?: string;
  projectId?: string;
  status?: string;
  priority?: string;
  overdueOnly?: boolean;
  search?: string;
  excludeDone?: boolean;
  /** Global Tasks board/list only (spec §16) — a task linked to a Project stays scoped to that Project's own views by default, not the Global board, until explicitly promoted. */
  excludeProjectLinked?: boolean;
}

export async function getTasks(filters: TaskFilters = {}): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  // Skipped recurring occurrences never happened — they stay in the DB for
  // series history/idempotency but never show in any active view.
  let query = supabase.from("tasks").select(TASK_SELECT).is("skipped_at", null);

  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.excludeProjectLinked) query = query.or("project_id.is.null,promoted_to_global.eq.true");
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.excludeDone) query = query.neq("status", "completed");
  if (filters.overdueOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.lt("due_date", today).neq("status", "completed");
  }
  if (filters.search) query = query.ilike("title", `%${filters.search}%`);

  const { data } = await query
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority", { ascending: false });

  return (data ?? []) as unknown as TaskWithRelations[];
}

/** All open tasks (any owner) due within [startDate, endDate], inclusive, YYYY-MM-DD. */
export async function getTasksInDateRange(
  startDate: string,
  endDate: string
): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .gte("due_date", startDate)
    .lte("due_date", endDate)
    .neq("status", "completed")
    .is("skipped_at", null)
    .order("due_date", { ascending: true });
  return (data ?? []) as unknown as TaskWithRelations[];
}

export async function getTaskById(id: string): Promise<TaskWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("id", id)
    .single();
  return (data as unknown as TaskWithRelations) ?? null;
}

/** All non-done occurrences that share a recurring root with `taskId`. */
export async function getRecurringSiblings(rootId: string): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .or(`id.eq.${rootId},recurring_parent_id.eq.${rootId}`)
    .order("due_date", { ascending: true });
  return (data ?? []) as unknown as TaskWithRelations[];
}

const COMMENT_SELECT = `*, author:profiles!task_comments_author_id_fkey(id, full_name, role, email)`;

export async function getTaskComments(taskId: string): Promise<(TaskComment & { author: Profile | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_comments")
    .select(COMMENT_SELECT)
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as (TaskComment & { author: Profile | null })[];
}

export async function getTaskAttachments(taskId: string): Promise<TaskAttachment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_attachments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return (data ?? []) as TaskAttachment[];
}
