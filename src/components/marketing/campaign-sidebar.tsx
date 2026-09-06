"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCampaign,
  reassignCampaign,
  setCampaignPriority,
  setCampaignStatus,
  updateCampaignField,
} from "@/actions/marketing";
import {
  CAMPAIGN_STATUS_LABELS,
  CASE_PRIORITY_LABELS,
  ROLE_LABELS,
  type CampaignStatus,
  type MarketingCampaignWithRelations,
  type Profile,
  type TaskPriority,
} from "@/lib/types";

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[14.5px] font-semibold text-[#12181f]">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function CampaignSidebar({
  campaign,
  profiles,
  canManage,
}: {
  campaign: MarketingCampaignWithRelations;
  profiles: Profile[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [startDate, setStartDate] = useState(campaign.start_date ?? "");
  const [endDate, setEndDate] = useState(campaign.end_date ?? "");

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <SidebarCard title="Campaign status">
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Status</label>
            <select
              defaultValue={campaign.status}
              disabled={pending || !canManage}
              onChange={(e) => run(() => setCampaignStatus(campaign.id, e.target.value as CampaignStatus, campaign.status))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              {Object.entries(CAMPAIGN_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Priority</label>
            <select
              defaultValue={campaign.priority}
              disabled={pending || !canManage}
              onChange={(e) => run(() => setCampaignPriority(campaign.id, e.target.value as TaskPriority, campaign.priority))}
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
              defaultValue={campaign.owner_id ?? ""}
              disabled={pending || !canManage}
              onChange={(e) => run(() => reassignCampaign(campaign.id, e.target.value, campaign.name, campaign.owner_id))}
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
              disabled={pending || !canManage}
              onChange={(e) => setStartDate(e.target.value)}
              onBlur={() => startDate !== (campaign.start_date ?? "") && run(() => updateCampaignField(campaign.id, { start_date: startDate || null }))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">End date</label>
            <input
              type="date"
              value={endDate}
              disabled={pending || !canManage}
              onChange={(e) => setEndDate(e.target.value)}
              onBlur={() => endDate !== (campaign.end_date ?? "") && run(() => updateCampaignField(campaign.id, { end_date: endDate || null }))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            />
          </div>
        </div>
      </SidebarCard>

      {campaign.goal_notes && (
        <SidebarCard title="Goal / notes">
          <p className="text-[13.5px] text-[#5a616c]">{campaign.goal_notes}</p>
        </SidebarCard>
      )}

      {canManage && (
        <SidebarCard title="Actions">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this campaign? Linked items in other modules are not affected.")) return;
              startTransition(() => deleteCampaign(campaign.id));
            }}
            className="text-[13.5px] font-medium text-[#e0353b] hover:underline"
          >
            Delete campaign
          </button>
        </SidebarCard>
      )}
    </div>
  );
}
