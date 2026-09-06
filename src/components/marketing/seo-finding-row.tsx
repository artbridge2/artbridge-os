import { ExternalLink } from "lucide-react";
import { SEO_FINDING_LABELS, type SeoFinding } from "@/lib/seo/audit";

const SEVERITY_STYLE: Record<SeoFinding["severity"], { bg: string; color: string; label: string }> = {
  high: { bg: "#fde8ea", color: "#e0353b", label: "High" },
  medium: { bg: "#fdf3d9", color: "#b8860b", label: "Medium" },
};

export function SeoFindingRow({ finding }: { finding: SeoFinding }) {
  const style = SEVERITY_STYLE[finding.severity];
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold" style={{ backgroundColor: style.bg, color: style.color }}>
            {style.label}
          </span>
          <p className="text-[13.5px] font-medium text-[#8a909a]">{SEO_FINDING_LABELS[finding.type]}</p>
        </div>
        <p className="mt-1 truncate text-[15px] font-semibold text-[#12181f]">{finding.productTitle}</p>
        <p className="mt-0.5 text-[13px] text-[#5a616c]">{finding.detail}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <a
          href={finding.adminUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[13px] font-medium text-[#3b82f6] hover:underline"
        >
          Fix in Shopify <ExternalLink className="size-3.5" />
        </a>
        {finding.storeUrl && (
          <a href={finding.storeUrl} target="_blank" rel="noreferrer" className="text-[12.5px] text-[#9aa0a8] hover:underline">
            View live page
          </a>
        )}
      </div>
    </div>
  );
}
