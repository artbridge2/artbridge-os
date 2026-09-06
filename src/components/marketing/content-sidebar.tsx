"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AutosaveIndicator } from "@/components/autosave-indicator";
import {
  deleteContentItem,
  reassignContentItem,
  setContentCampaign,
  setContentPublishDate,
  setContentPublishedUrl,
  setContentStatus,
  setContentType,
} from "@/actions/content";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  ROLE_LABELS,
  type ContentItemWithRelations,
  type ContentStatus,
  type ContentType,
  type Profile,
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

export function ContentSidebar({
  item,
  profiles,
  campaigns,
  canManage,
}: {
  item: ContentItemWithRelations;
  profiles: Profile[];
  campaigns: { id: string; name: string }[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [publishDate, setPublishDate] = useState(item.publish_date ?? "");
  const [publishedUrl, setPublishedUrl] = useState(item.published_url ?? "");

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
      <SidebarCard title="Details" action={<AutosaveIndicator pending={pending} saved={saved} />}>
        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Status</label>
            <select
              defaultValue={item.status}
              disabled={pending || !canManage}
              onChange={(e) => run(() => setContentStatus(item.id, e.target.value as ContentStatus))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              {Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Type</label>
            <select
              defaultValue={item.content_type}
              disabled={pending || !canManage}
              onChange={(e) => run(() => setContentType(item.id, e.target.value as ContentType))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Owner</label>
            <select
              defaultValue={item.owner_id ?? ""}
              disabled={pending || !canManage}
              onChange={(e) => run(() => reassignContentItem(item.id, e.target.value, item.title, item.owner_id))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{ROLE_LABELS[p.role]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Campaign</label>
            <select
              defaultValue={item.campaign_id ?? ""}
              disabled={pending || !canManage}
              onChange={(e) => run(() => setContentCampaign(item.id, e.target.value || null))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            >
              <option value="">No campaign</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[12px] text-[#9aa0a8]">Publish date</label>
            <input
              type="date"
              value={publishDate}
              disabled={pending || !canManage}
              onChange={(e) => setPublishDate(e.target.value)}
              onBlur={() => publishDate !== (item.publish_date ?? "") && run(() => setContentPublishDate(item.id, publishDate || null))}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
            />
          </div>
          {(item.status === "scheduled" || item.status === "published") && (
            <div>
              <label className="text-[12px] text-[#9aa0a8]">Published URL</label>
              <input
                type="url"
                value={publishedUrl}
                disabled={pending || !canManage}
                placeholder="https://…"
                onChange={(e) => setPublishedUrl(e.target.value)}
                onBlur={() => publishedUrl !== (item.published_url ?? "") && run(() => setContentPublishedUrl(item.id, publishedUrl || null))}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-[13px] disabled:opacity-60"
              />
            </div>
          )}
        </div>
      </SidebarCard>

      {canManage && (
        <SidebarCard title="Actions">
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this content item? This can't be undone.")) return;
              startTransition(() => deleteContentItem(item.id));
            }}
            className="text-[13.5px] font-medium text-[#e0353b] hover:underline"
          >
            Delete content
          </button>
        </SidebarCard>
      )}
    </div>
  );
}
