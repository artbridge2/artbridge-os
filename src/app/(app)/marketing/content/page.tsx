import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { hasCapability } from "@/lib/permissions";
import { getProfiles } from "@/lib/queries";
import { getCampaigns } from "@/lib/queries-marketing";
import { getContentItems, getContentStatusCounts } from "@/lib/queries-content";
import { ContentRow } from "@/components/marketing/content-row";
import { NewContentDialog } from "@/components/marketing/new-content-dialog";
import { SearchBox } from "@/components/communication/search-box";
import { NotAuthorized } from "@/components/home/not-authorized";
import { CONTENT_STATUS_LABELS, type ContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_STATUSES: ContentStatus[] = ["idea", "drafting", "in_review", "scheduled", "published"];

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();
  if (!(await hasCapability(profile, "content"))) return <NotAuthorized title="Content" />;

  const params = await searchParams;
  // Content has a single capability (unlike Campaigns' view/manage split) — passing the page gate above already means manage access too.
  const canManage = true;

  const statusParam = typeof params.status === "string" ? (params.status as ContentStatus) : undefined;
  const status = statusParam && ALL_STATUSES.includes(statusParam) ? statusParam : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;

  const [items, statusCounts, profiles, campaigns] = await Promise.all([
    getContentItems({ status, search }),
    getContentStatusCounts(),
    getProfiles(),
    getCampaigns(),
  ]);

  const total = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0);

  const tabHref = (s?: ContentStatus) => (s ? `/marketing/content?status=${s}` : "/marketing/content");

  return (
    <div className="pt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Content</h1>
          <p className="mt-1 text-[14px] text-[#5a616c]">Blog posts, social, video and product-page copy — ideas through publish.</p>
        </div>
        {canManage && <NewContentDialog profiles={profiles} campaigns={campaigns.map((c) => ({ id: c.id, name: c.name }))} defaultOwnerId={profile.id} />}
      </div>

      <div className="mt-4 max-w-sm">
        <SearchBox basePath="/marketing/content" placeholder="Search content…" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
        <Link
          href={tabHref()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            !status ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          All <span className="opacity-80">{total}</span>
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
              status === s ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
            )}
          >
            {CONTENT_STATUS_LABELS[s]} <span className="opacity-80">{statusCounts[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <p className="mt-4 text-[13.5px] text-[#9aa0a8]">
        {items.length} item{items.length === 1 ? "" : "s"}
      </p>

      <div className="mt-2.5 space-y-2.5">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
            No content matches this filter.
          </p>
        ) : (
          items.map((item) => <ContentRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
