import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, formatDateOnly, todayInBudapest } from "@/lib/dates";
import type { Profile, ProjectComment, ProjectStatus, ProjectWithRelations } from "@/lib/types";

const PROJECT_SELECT = `*, owner:profiles!projects_owner_id_fkey(id, full_name, role, email)`;

export interface ProjectFilters {
  status?: ProjectStatus;
  ownerId?: string;
  search?: string;
}

export async function getProjects(filters: ProjectFilters = {}): Promise<ProjectWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("projects").select(PROJECT_SELECT);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.search) query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);

  const { data } = await query.order("start_date", { ascending: true, nullsFirst: false });
  return (data ?? []) as unknown as ProjectWithRelations[];
}

export async function getProjectById(id: string): Promise<ProjectWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select(PROJECT_SELECT).eq("id", id).single();
  return (data as unknown as ProjectWithRelations) ?? null;
}

export async function getProjectStatusCounts(): Promise<Partial<Record<ProjectStatus, number>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("status");
  const counts: Partial<Record<ProjectStatus, number>> = {};
  for (const row of data ?? []) {
    const status = row.status as ProjectStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

export async function getProjectComments(projectId: string): Promise<(ProjectComment & { author: Profile | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_comments")
    .select("*, author:profiles!project_comments_author_id_fkey(id, full_name, role, email)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  return (data ?? []) as unknown as (ProjectComment & { author: Profile | null })[];
}

export interface ProjectAttentionItem {
  source_id: string;
  title: string;
  reason: string;
  owner: string | null;
  ownerId: string | null;
  date: string | null;
  href: string;
  overdue: boolean;
}

/** A launch/end decision the Project object itself needs — mirrors getCampaignAttentionItems. */
export async function getProjectAttentionItems(ownerId?: string): Promise<ProjectAttentionItem[]> {
  const projects = await getProjects(ownerId ? { ownerId } : {});
  const today = todayInBudapest();
  const soon = formatDateOnly(addDays(new Date(today), 3));

  const items: ProjectAttentionItem[] = [];
  for (const p of projects) {
    if (p.status === "planning" && p.start_date && p.start_date < today) {
      items.push({
        source_id: p.id,
        title: p.name,
        reason: "Start date passed — still in Planning",
        owner: p.owner?.full_name ?? null,
        ownerId: p.owner_id,
        date: p.start_date,
        href: `/projects/${p.id}`,
        overdue: true,
      });
    } else if (p.status === "planning" && p.start_date && p.start_date <= soon) {
      items.push({
        source_id: p.id,
        title: p.name,
        reason: "Start date approaching — not yet Active",
        owner: p.owner?.full_name ?? null,
        ownerId: p.owner_id,
        date: p.start_date,
        href: `/projects/${p.id}`,
        overdue: false,
      });
    } else if (p.status === "active" && p.end_date && p.end_date < today) {
      items.push({
        source_id: p.id,
        title: p.name,
        reason: "End date passed — still Active",
        owner: p.owner?.full_name ?? null,
        ownerId: p.owner_id,
        date: p.end_date,
        href: `/projects/${p.id}`,
        overdue: true,
      });
    }
  }
  return items;
}
