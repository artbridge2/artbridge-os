import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentProfile, getViewedProfile } from "@/lib/dal";
import { canAccessCommunication } from "@/lib/permissions";
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
import { SearchBox } from "@/components/communication/search-box";
import { CATEGORY_LABELS, COMMUNICATION_CATEGORY_GROUPS, CASE_STATUS_LABELS, type CaseStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_STATUSES: CaseStatus[] = ["new", "needs_reply", "needs_review", "in_progress", "waiting", "resolved"];

export default async function CommunicationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  if (!(await canAccessCommunication(profile))) redirect("/");
  const viewedProfile = await getViewedProfile();

  const category = typeof params.category === "string" ? params.category : undefined;
  const statusParam = typeof params.status === "string" ? (params.status as CaseStatus) : undefined;
  const status = statusParam && ALL_STATUSES.includes(statusParam) ? statusParam : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;
  const scope = params.scope === "all" ? "all" : "mine";
  const ownerId = scope === "mine" ? viewedProfile.id : undefined;

  const [threads, categoryCounts, quickCounts, stats, profiles, gmailStatus] = await Promise.all([
    getEmailThreads({ category, status, search, ownerId, activeOnly: !status }),
    getCommunicationCategoryCounts(ownerId),
    getQuickFilterCounts(ownerId),
    getCommunicationStats(ownerId),
    getProfiles(),
    getGmailConnectionStatus(),
  ]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const tabHref = (overrides: { category?: string; status?: string }) => {
    const qs = new URLSearchParams();
    const cat = "category" in overrides ? overrides.category : category;
    const st = "status" in overrides ? overrides.status : status;
    if (cat) qs.set("category", cat);
    if (st) qs.set("status", st);
    if (scope === "all") qs.set("scope", "all");
    if (search) qs.set("q", search);
    const s = qs.toString();
    return `/communication${s ? `?${s}` : ""}`;
  };

  const scopeHref = (s: "mine" | "all") => {
    const qs = new URLSearchParams();
    if (category) qs.set("category", category);
    if (status) qs.set("status", status);
    if (s === "all") qs.set("scope", "all");
    if (search) qs.set("q", search);
    const str = qs.toString();
    return `/communication${str ? `?${str}` : ""}`;
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
          <NewConversationDialog
            profiles={profiles.filter((p) => p.role !== "kurator")}
            currentUserId={profile.id}
            gmailConnected={gmailStatus.connected}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg bg-[#f4f4f4] p-1">
            <Link
              href={scopeHref("mine")}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium",
                scope === "mine" ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]"
              )}
            >
              My queue
            </Link>
            <Link
              href={scopeHref("all")}
              className={cn(
                "rounded-md px-3 py-1.5 text-[13px] font-medium",
                scope === "all" ? "bg-white text-[#12181f] shadow-sm" : "text-[#8a909a]"
              )}
            >
              All team
            </Link>
          </div>
          <SearchBox />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
          <Link
            href={tabHref({ category: undefined })}
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
              href={tabHref({ category: cat })}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
                category === cat ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
              )}
            >
              {CATEGORY_LABELS[cat]} <span className="opacity-80">{categoryCounts.byCategory[cat] ?? 0}</span>
            </Link>
          ))}
          {status && (
            <Link
              href={tabHref({ status: undefined })}
              className="ml-auto flex items-center gap-1 rounded-lg bg-[#f4f4f4] px-3 py-1.5 text-[13px] font-medium text-[#5a616c]"
            >
              {CASE_STATUS_LABELS[status]} ✕
            </Link>
          )}
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
        <QuickFiltersCard counts={quickCounts} active={status} />
      </div>
    </div>
  );
}
