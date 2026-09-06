import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getAiCapabilities, type AiCapabilityStatus } from "@/lib/ai/capabilities";
import { SettingsTabs } from "@/components/settings/settings-tabs";

const STATUS_STYLE: Record<AiCapabilityStatus, { bg: string; color: string; label: string }> = {
  available: { bg: "#e5f7ed", color: "#1c9a52", label: "Available" },
  needs_configuration: { bg: "#fdf3d9", color: "#b8860b", label: "Needs configuration" },
  not_built: { bg: "#f0f0f0", color: "#6b7280", label: "Not built yet" },
};

export default async function AiSettingsPage() {
  const profile = await getCurrentProfile();
  const canManage = await hasCapability(profile, "settings_ai");
  if (!canManage) redirect("/settings");

  const capabilities = getAiCapabilities();

  return (
    <div className="max-w-3xl space-y-6 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">External services, capabilities, and administrative control.</p>
      </div>

      <SettingsTabs active="/settings/ai" showAdmin={canManage} />

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">AI capabilities</p>
        <Link href="/settings/ai/instructions" className="text-[13px] font-medium text-[#3b82f6]">
          Edit AI instructions
        </Link>
      </div>

      <div className="space-y-2">
        {capabilities.map((cap) => {
          const style = STATUS_STYLE[cap.status];
          return (
            <div key={cap.key} className="rounded-xl border border-[#eeeeee] bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[14px] font-medium text-[#12181f]">{cap.label}</p>
                  <p className="text-[12.5px] text-[#8a909a]">{cap.module}{cap.provider ? ` · ${cap.provider}` : ""}</p>
                </div>
                <span className="inline-flex h-6 shrink-0 items-center rounded-md px-2 text-[12.5px] font-medium" style={{ backgroundColor: style.bg, color: style.color }}>
                  {style.label}
                </span>
              </div>
              {cap.note && <p className="mt-1.5 text-[12.5px] text-[#9aa0a8]">{cap.note}</p>}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-[#e4e4e4] p-3 text-[12.5px] text-[#9aa0a8]">
        Approval boundaries are enforced by each module, not here: Communication drafts but never auto-sends, Artist research
        drafts outreach but never sends automatically. There is no global &quot;AI can do everything&quot; switch.
      </div>
    </div>
  );
}
