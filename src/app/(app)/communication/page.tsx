import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getGmailConnectionStatus } from "@/lib/gmail/status";
import {
  getCommunicationCategoryCounts,
  getCommunicationStats,
  getEmailThreads,
  getQuickFilterCounts,
} from "@/lib/queries-inbox";
import { ConversationRow } from "@/components/communication/conversation-row";
import { StatsCard } from "@/components/communication/stats-card";
import { QuickFiltersCard } from "@/components/communication/quick-filters-card";
import { NewConversationDialog } from "@/components/communication/new-conversation-dialog";
import { CATEGORY_LABELS, COMMUNICATION_CATEGORY_GROUPS, type CaseStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const CASE_STATUSES: CaseStatus[] = ["needs_reply", "needs_review", "waiting", "resolved"];

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const category = typeof params.category === "string" ? params.category : undefined;
  const statusParam = typeof params.status === "string" ? (params.status as CaseStatus) : undefined;
  const caseStatus = statusParam && CASE_STATUSES.includes(statusParam) ? statusParam : undefined;

  const [threads, categoryCounts, quickCounts, stats, profiles, gmailStatus] = await Promise.all([
    getEmailThreads({ category, caseStatus }),
    getCommunicationCategoryCounts(),
    getQuickFilterCounts(),
    getCommunicationStats(30),
    getProfiles(),
    getGmailConnectionStatus(),
  ]);
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tabHref = (cat?: string) => {
    const qs = new URLSearchParams();
    if (cat) qs.set("category", cat);
    if (caseStatus) qs.set("status", caseStatus);
    const s = qs.toString();
    return `/communication${s ? `?${s}` : ""}`;
  };

  return (
    <div className="grid grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_300px]">
      <div className="min-w-0 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[13.5px] text-[#9aa0a8]">{today}</p>
            <h1 className="mt-0.5 text-[26px] font-bold tracking-tight text-[#12181f]">Communication</h1>
            <p className="mt-1 text-[14px] text-[#5a616c]">
              Customer, artist, developer and supplier conversations.
            </p>
          </div>
          <NewConversationDialog profiles={profiles} currentUserId={profile.id} gmailConnected={gmailStatus.connected} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
          <Link
            href={tabHref(undefined)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
              !category ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
            )}
          >
            All <span className="opacity-80">{categoryCounts.total}</span>
          </Link>
          {COMMUNICATION_CATEGORY_GROUPS.map((cat) => (
            <Link
              key={cat}
              href={tabHref(cat)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
                category === cat ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
              )}
            >
              {CATEGORY_LABELS[cat]} <span className="opacity-80">{categoryCounts.byCategory[cat] ?? 0}</span>
            </Link>
          ))}
        </div>

        <p className="text-[13.5px] text-[#9aa0a8]">
          {threads.length} conversation{threads.length === 1 ? "" : "s"}
        </p>

        <div className="space-y-2.5">
          {threads.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
              No conversations match this filter.
            </p>
          ) : (
            threads.map((thread) => <ConversationRow key={thread.id} thread={thread} />)
          )}
        </div>
      </div>

      <div className="space-y-4">
        <StatsCard stats={stats} />
        <QuickFiltersCard counts={quickCounts} active={caseStatus} />
      </div>
    </div>
  );
}
