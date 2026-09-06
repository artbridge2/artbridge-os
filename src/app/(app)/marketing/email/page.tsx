import { ArrowRight, Mail, Users } from "lucide-react";
import Link from "next/link";
import { isKlaviyoConfigured } from "@/lib/klaviyo/client";
import { listAudiences, listRecentCampaigns, type KlaviyoCampaignSummary, type KlaviyoListSummary } from "@/lib/klaviyo/campaigns";

export default async function EmailMarketingPage() {
  const configured = isKlaviyoConfigured();

  return (
    <div className="pt-6">
      <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Email Marketing</h1>
      <p className="mt-1 text-[14px] text-[#5a616c]">Klaviyo campaigns and audiences — real data once connected, nothing fabricated.</p>

      {!configured ? (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#e4e4e4] p-8">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#f0f0f0]">
            <Mail className="size-5 text-[#8a909a]" />
          </span>
          <p className="text-[14.5px] font-semibold text-[#12181f]">Connect Klaviyo to see campaigns and audiences here</p>
          <p className="max-w-lg text-[13.5px] text-[#8a909a]">
            This uses a read-only Klaviyo private API key, not OAuth — generate one in Klaviyo under{" "}
            <span className="font-medium text-[#5a616c]">Settings → API Keys</span> (read-only scopes are enough), then send it over so
            it can be set as the <code className="rounded bg-[#f4f4f4] px-1 py-0.5 text-[12.5px]">KLAVIYO_API_KEY</code> environment
            variable.
          </p>
          <Link href="/settings" className="flex items-center gap-1 text-[13.5px] font-medium text-[#3b82f6]">
            View integration status <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <EmailMarketingData />
      )}

      <div className="mt-6 rounded-2xl border border-[#eeeeee] bg-[#fafafa] p-4">
        <p className="text-[13.5px] font-semibold text-[#12181f]">Drafting email copy</p>
        <p className="mt-0.5 text-[13px] text-[#8a909a]">
          Writing and reviewing the actual email content happens in{" "}
          <Link href="/marketing/content" className="font-medium text-[#3b82f6] hover:underline">
            Content
          </Link>{" "}
          (type: Email copy) — this page is for the Klaviyo side: what&apos;s sent, to whom, and how it performed.
        </p>
      </div>
    </div>
  );
}

async function EmailMarketingData() {
  let campaigns: KlaviyoCampaignSummary[] = [];
  let audiences: KlaviyoListSummary[] = [];
  let error: string | null = null;

  try {
    [campaigns, audiences] = await Promise.all([listRecentCampaigns(20), listAudiences()]);
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not reach Klaviyo.";
  }

  if (error) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
        Couldn&apos;t reach Klaviyo right now — {error}
      </p>
    );
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
      <div className="space-y-2.5">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Recent campaigns</p>
        {campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">No campaigns yet.</p>
        ) : (
          campaigns.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e3f0fd] text-[#3b82f6]">
                <Mail className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[#12181f]">{c.name}</p>
                <p className="truncate text-[13px] text-[#8a909a]">{c.channel}</p>
              </div>
              <span className="shrink-0 rounded-md bg-[#f4f4f4] px-2 py-1 text-[12.5px] font-medium capitalize text-[#5a616c]">{c.status}</span>
              <div className="w-28 shrink-0 text-right text-[13px] text-[#9aa0a8]">
                {c.sendTime ? new Date(c.sendTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Not sent"}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-[#8a909a]" />
          <p className="text-[14.5px] font-semibold text-[#12181f]">Audiences</p>
        </div>
        <div className="mt-3 space-y-1.5">
          {audiences.length === 0 ? (
            <p className="text-[13px] text-[#9aa0a8]">No lists found.</p>
          ) : (
            audiences.map((a) => (
              <div key={a.id} className="rounded-lg border border-[#eeeeee] px-3 py-2 text-[13.5px] text-[#3d4451]">
                {a.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
