import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getAiCapabilities, type AiCapabilityStatus } from "@/lib/ai/capabilities";
import { getAiUsageSummary } from "@/lib/ai/usage-query";
import { SettingsTabs } from "@/components/settings/settings-tabs";

const CAPABILITY_LABELS: Record<string, string> = {
  communication_classify: "Communication — triage/classify",
  communication_draft: "Communication — reply drafts",
  artist_research_turn: "Artist Research — discovery",
  artist_research_extract: "Artist Research — extraction",
  artist_research_deep_dive: "Artist Research — deep dive",
  artist_outreach_draft: "Artist Research — outreach draft",
};

function formatUsd(n: number): string {
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

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
  const usage = await getAiUsageSummary();

  return (
    <div className="max-w-3xl space-y-6 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Settings</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">External services, capabilities, and administrative control.</p>
      </div>

      <SettingsTabs active="/settings/ai" showAdmin={canManage} />

      <div>
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">AI usage</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
            <p className="text-[12.5px] text-[#9aa0a8]">Today</p>
            <p className="mt-1 text-[20px] font-semibold text-[#12181f]">
              {formatUsd(usage.today.estimatedCostUsd)}
              {usage.today.costIsPartial && <span className="text-[13px] font-normal text-[#9aa0a8]">+</span>}
            </p>
            <p className="text-[12.5px] text-[#8a909a]">{usage.today.calls} calls · {(usage.today.inputTokens + usage.today.outputTokens).toLocaleString()} tokens</p>
          </div>
          <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
            <p className="text-[12.5px] text-[#9aa0a8]">This month</p>
            <p className="mt-1 text-[20px] font-semibold text-[#12181f]">
              {formatUsd(usage.thisMonth.estimatedCostUsd)}
              {usage.thisMonth.costIsPartial && <span className="text-[13px] font-normal text-[#9aa0a8]">+</span>}
            </p>
            <p className="text-[12.5px] text-[#8a909a]">{usage.thisMonth.calls} calls · {(usage.thisMonth.inputTokens + usage.thisMonth.outputTokens).toLocaleString()} tokens</p>
          </div>
        </div>
        {usage.byCapability.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {usage.byCapability.map((c) => (
              <div key={c.capability} className="flex items-center justify-between rounded-lg border border-[#eeeeee] bg-white px-3 py-2 text-[13px]">
                <span className="text-[#3d4451]">{CAPABILITY_LABELS[c.capability] ?? c.capability}</span>
                <span className="text-[#8a909a]">
                  {formatUsd(c.estimatedCostUsd)}
                  {c.costIsPartial && "+"} · {c.calls} calls
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[12px] text-[#9aa0a8]">
          Estimated from token counts using approximate rates — verify exact spend at console.anthropic.com. A &quot;+&quot; means
          at least one call used a model this estimate doesn&apos;t have a rate for.
        </p>
      </div>

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
