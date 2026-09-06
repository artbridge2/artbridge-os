"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { notifyUser, notifyMentions } from "@/lib/notify";
import type { ProjectStatus, TaskPriority } from "@/lib/types";

function revalidateProjectViews() {
  revalidatePath("/", "layout");
}

async function requireAdmin() {
  const me = await getCurrentProfile();
  if (!(await hasCapability(me, "projects"))) throw new Error("NOT_AUTHORIZED");
  return me;
}

async function logProjectEvent(projectId: string, eventType: string, fromValue: string | null, toValue: string | null) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("project_events").insert({ project_id: projectId, actor_id: me.id, event_type: eventType, from_value: fromValue, to_value: toValue });
}

export interface CreateProjectInput {
  name: string;
  description?: string | null;
  ownerId: string;
  startDate?: string | null;
  endDate?: string | null;
  priority?: TaskPriority;
}

export async function createProject(input: CreateProjectInput) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      description: input.description || null,
      owner_id: input.ownerId,
      start_date: input.startDate || null,
      end_date: input.endDate || null,
      priority: input.priority ?? "normal",
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create project");

  await logProjectEvent(data.id, "created", null, null);
  if (input.ownerId !== me.id) {
    await notifyUser(input.ownerId, "project_assigned", `${me.full_name} made you the owner of a project`, input.name, `/projects/${data.id}`);
  }

  revalidateProjectViews();
  redirect(`/projects/${data.id}`);
}

export interface UpdateProjectFieldInput {
  name?: string;
  description?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

export async function updateProjectField(projectId: string, field: UpdateProjectFieldInput) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("projects").update(field).eq("id", projectId);
  revalidateProjectViews();
}

export async function setProjectStatus(projectId: string, status: ProjectStatus, previousStatus: ProjectStatus) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase
    .from("projects")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null })
    .eq("id", projectId);
  await logProjectEvent(projectId, "status_changed", previousStatus, status);
  revalidateProjectViews();
}

export async function setProjectPriority(projectId: string, priority: TaskPriority, previousPriority: TaskPriority) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("projects").update({ priority }).eq("id", projectId);
  await logProjectEvent(projectId, "priority_changed", previousPriority, priority);
  revalidateProjectViews();
}

export async function reassignProject(projectId: string, ownerId: string, projectName: string, previousOwnerId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("projects").update({ owner_id: ownerId }).eq("id", projectId);
  await logProjectEvent(projectId, "owner_changed", previousOwnerId, ownerId);
  if (ownerId !== me.id) {
    await notifyUser(ownerId, "project_assigned", `${me.full_name} made you the owner of a project`, projectName, `/projects/${projectId}`);
  }
  revalidateProjectViews();
}

export async function deleteProject(projectId: string) {
  await requireAdmin();
  const supabase = await createClient();
  // Tasks linked to this project are kept — only the link is cleared (project_id -> null via the FK's on delete set null).
  await supabase.from("projects").delete().eq("id", projectId);
  revalidateProjectViews();
  redirect("/projects");
}

export async function postProjectComment(projectId: string, body: string, projectName: string, mentionedProfileIds: string[] = []) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const { error } = await supabase.from("project_comments").insert({ project_id: projectId, author_id: me.id, body, mentioned_profile_ids: mentionedProfileIds });
  if (error) throw new Error("Could not post comment.");
  await notifyMentions(mentionedProfileIds, me.id, me.full_name, projectName, `/projects/${projectId}`);
  revalidateProjectViews();
}

/** Links/unlinks an existing Task to this Project — the Task keeps its own owner/status/priority, only gains a project grouping. */
export async function setTaskProject(taskId: string, projectId: string | null) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("tasks").update({ project_id: projectId }).eq("id", taskId);
  revalidateProjectViews();
}
