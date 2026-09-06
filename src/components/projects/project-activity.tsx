import { formatElapsedEn } from "@/lib/dates";
import type { Profile, ProjectEvent } from "@/lib/types";

const EVENT_LABELS: Record<string, string> = {
  created: "Project created",
  status_changed: "Status changed",
  priority_changed: "Priority changed",
  owner_changed: "Owner changed",
};

export function ProjectActivity({ events, profiles }: { events: ProjectEvent[]; profiles: Profile[] }) {
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Activity</p>
      <div className="mt-2 flex flex-col gap-2">
        {events.length === 0 && <p className="text-[13px] text-[#9aa0a8]">No activity yet.</p>}
        {events.map((e) => {
          const actor = e.actor_id ? profileById.get(e.actor_id)?.full_name ?? "Someone" : "System";
          const label = EVENT_LABELS[e.event_type] ?? e.event_type;
          return (
            <div key={e.id} className="flex items-center justify-between text-[13px]">
              <p className="text-[#3d4451]">
                <span className="font-medium text-[#12181f]">{actor}</span> — {label}
                {e.from_value && e.to_value && (
                  <span className="text-[#9aa0a8]"> ({e.from_value} → {e.to_value})</span>
                )}
              </p>
              <span className="shrink-0 text-[12px] text-[#9aa0a8]">{formatElapsedEn(e.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
