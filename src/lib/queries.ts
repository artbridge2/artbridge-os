import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Area, Profile, TaskWithRelations } from "@/lib/types";

const TASK_SELECT = `
  *,
  owner:profiles!tasks_owner_id_fkey(id, full_name, role, email),
  area:areas(id, name, sort_order)
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
  status?: string;
  priority?: string;
  overdueOnly?: boolean;
  search?: string;
  excludeDone?: boolean;
}

export async function getTasks(filters: TaskFilters = {}): Promise<TaskWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("tasks").select(TASK_SELECT);

  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.areaId) query = query.eq("area_id", filters.areaId);
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.priority) query = query.eq("priority", filters.priority);
  if (filters.excludeDone) query = query.neq("status", "done");
  if (filters.overdueOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.lt("due_date", today).neq("status", "done");
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
    .neq("status", "done")
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
