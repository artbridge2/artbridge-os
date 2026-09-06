import Link from "next/link";
import { ArrowRight, Search, ShoppingBag } from "lucide-react";
import { getShopifyConnectionStatus } from "@/lib/shopify/status";
import { runShopifyProductSeoAudit, type SeoSeverity } from "@/lib/seo/audit";
import { SeoFindingRow } from "@/components/marketing/seo-finding-row";
import { cn } from "@/lib/utils";

const SEVERITIES: SeoSeverity[] = ["high", "medium"];

export default async function MarketingSeoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const severityParam = typeof params.severity === "string" ? (params.severity as SeoSeverity) : undefined;
  const severity = severityParam && SEVERITIES.includes(severityParam) ? severityParam : undefined;

  const shopify = await getShopifyConnectionStatus();

  return (
    <div className="pt-6">
      <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">SEO</h1>
      <p className="mt-1 text-[14px] text-[#5a616c]">Real findings from your live Shopify catalog — no fabricated data.</p>

      {!shopify.connected ? (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-dashed border-[#e4e4e4] p-8">
          <span className="flex size-10 items-center justify-center rounded-full bg-[#f0f0f0]">
            <ShoppingBag className="size-5 text-[#8a909a]" />
          </span>
          <p className="text-[14.5px] font-semibold text-[#12181f]">Connect Shopify to run an SEO audit</p>
          <p className="text-[13.5px] text-[#8a909a]">
            This audit reads your real product catalog — titles, meta descriptions, image alt text — directly from Shopify. Nothing to
            configure beyond connecting the store.
          </p>
          <Link href="/settings" className="flex items-center gap-1 text-[13.5px] font-medium text-[#3b82f6]">
            Connect Shopify <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : (
        <SeoAuditSection severity={severity} />
      )}

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-[#eeeeee] bg-[#fafafa] p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white">
          <Search className="size-4 text-[#8a909a]" />
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-[#12181f]">Google Search Console — not connected yet</p>
          <p className="mt-0.5 text-[13px] text-[#8a909a]">
            Real search performance (queries, clicks, impressions, ranking pages) needs its own connection — this isn&apos;t built yet,
            so nothing here is a placeholder pretending otherwise.
          </p>
        </div>
      </div>
    </div>
  );
}

async function SeoAuditSection({ severity }: { severity?: SeoSeverity }) {
  let audit;
  let error: string | null = null;
  try {
    audit = await runShopifyProductSeoAudit();
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not reach Shopify.";
  }

  if (error || !audit) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
        Couldn&apos;t run the audit right now — {error}
      </p>
    );
  }

  const counts: Record<SeoSeverity, number> = { high: 0, medium: 0 };
  for (const f of audit.findings) counts[f.severity]++;

  const filtered = severity ? audit.findings.filter((f) => f.severity === severity) : audit.findings;
  const tabHref = (s?: SeoSeverity) => (s ? `/marketing/seo?severity=${s}` : "/marketing/seo");

  return (
    <>
      <p className="mt-5 text-[13.5px] text-[#9aa0a8]">
        Scanned {audit.scannedCount} active product{audit.scannedCount === 1 ? "" : "s"} · {audit.findings.length} finding
        {audit.findings.length === 1 ? "" : "s"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-b border-[#eeeeee] pb-3">
        <Link
          href={tabHref()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            !severity ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          All <span className="opacity-80">{audit.findings.length}</span>
        </Link>
        <Link
          href={tabHref("high")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            severity === "high" ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          High <span className="opacity-80">{counts.high}</span>
        </Link>
        <Link
          href={tabHref("medium")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            severity === "medium" ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          Medium <span className="opacity-80">{counts.medium}</span>
        </Link>
      </div>

      <div className="mt-3 space-y-2.5">
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
            {audit.findings.length === 0 ? "No issues found — your active catalog looks clean." : "No findings match this filter."}
          </p>
        ) : (
          filtered.map((f) => <SeoFindingRow key={`${f.type}-${f.productId}`} finding={f} />)
        )}
      </div>
    </>
  );
}
