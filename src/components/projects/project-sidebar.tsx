"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AutosaveIndicator } from "@/components/autosave-indicator";
import { deleteProject, reassignProject, setProjectPriority, setProjectStatus, updateProjectField } from "@/actions/projects";
import {
  CASE_PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  ROLE_LABELS,
  type ProjectStatus,
  type ProjectWithRelations,
  type Profile,
  type TaskPriority,
} from "@/lib/types";

function SidebarCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[14.5px] font-semibold text-[#12181f]">{title}</p>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function ProjectSidebar({ project, profiles }: { project: ProjectWithRelations; profiles: Profile[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [startDate, setStartDate] = useState(project.start_date ?? "");
  const [endDate, setEndDate] = useState(project.end_date ?? "");

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="space-y-4">
      <SidebarCard title="Project status" action={<AutosaveIndicator pending={pending} saved={saved} />}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Status</label>
            <select
              defaultValue={project.status}
              disabled={pending}
              onChange={(e) => run(() => setProjectStatus(project.id, e.target.value as ProjectStatus, project.status))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Priority</label>
            <select
              defaultValue={project.priority}
              disabled={pending}
              onChange={(e) => run(() => setProjectPriority(project.id, e.target.value as TaskPriority, project.priority))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              {Object.entries(CASE_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Owner</label>
            <select
              defaultValue={project.owner_id ?? ""}
              disabled={pending}
              onChange={(e) => run(() => reassignProject(project.id, e.target.value, project.name, project.owner_id))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{ROLE_LABELS[p.role]}</option>
              ))}
            </select>
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Dates">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Start date</label>
            <input
              type="date"
              value={startDate}
              disabled={pending}
              onChange={(e) => setStartDate(e.target.value)}
              onBlur={() => startDate !== (project.start_date ?? "") && run(() => updateProjectField(project.id, { start_date: startDate || null }))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">End date</label>
            <input
              type="date"
              value={endDate}
              disabled={pending}
              onChange={(e) => setEndDate(e.target.value)}
              onBlur={() => endDate !== (project.end_date ?? "") && run(() => updateProjectField(project.id, { end_date: endDate || null }))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            />
          </div>
        </div>
      </SidebarCard>

      <SidebarCard title="Actions">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("Delete this project? Linked tasks are kept — only unlinked.")) return;
            startTransition(() => deleteProject(project.id));
          }}
          className="text-[13.5px] font-medium text-[#e0353b] hover:underline"
        >
          Delete project
        </button>
      </SidebarCard>
    </div>
  );
}
