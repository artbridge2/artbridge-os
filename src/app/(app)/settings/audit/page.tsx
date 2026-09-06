import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getAuditLog } from "@/lib/queries-settings";
import { SettingsTabs } from "@/components/settings/settings-tabs";
import { formatElapsedEn } from "@/lib/dates";

const ACTION_LABELS: Record<string, string> = {
  role_capability_changed: "Role capability changed",
  permission_override_changed: "Permission override changed",
  permission_override_removed: "Permission override removed",
  role_changed: "Role changed",
  ai_instruction_changed: "AI instruction changed",
  general_settings_changed: "General settings changed",
  integration_disconnected: "Integration disconnected",
};

export default async function AuditLogPage() {
  const profile = await getCurrentProfile();
  const canView = await hasCapability(profile, "settings_audit_log");
  if (!canView) redirect("/settings");

  const entries = await getAuditLog(100);

  return (
    <div className="max-w-2xl space-y-6 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">External services, capabilities, and administrative control.</p>
      </div>

      <SettingsTabs active="/settings/audit" showAdmin={true} />

      <div className="rounded-2xl border border-[#eeeeee] bg-white">
        {entries.length === 0 ? (
          <p className="p-4 text-[13.5px] text-[#9aa0a8]">No administrative changes recorded yet.</p>
        ) : (
          <div className="divide-y divide-[#f2f2f2]">
            {entries.map((e) => (
              <div key={e.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13.5px] font-medium text-[#12181f]">{ACTION_LABELS[e.action] ?? e.action}</p>
                  <p className="text-[12px] text-[#9aa0a8]">{formatElapsedEn(e.created_at)}</p>
                </div>
                <p className="mt-0.5 text-[13px] text-[#5a616c]">
                  {e.actor?.full_name ?? "Unknown"} · {e.target_label ?? e.target_type}
                  {e.before_summary && e.after_summary ? ` · ${e.before_summary} → ${e.after_summary}` : e.after_summary ? ` · ${e.after_summary}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
