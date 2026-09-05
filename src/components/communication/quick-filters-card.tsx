import Link from "next/link";
import { CheckCircle2, Clock, MessageCircle, SearchCheck } from "lucide-react";
import { CASE_STATUS_STYLE } from "@/lib/communication-style";
import type { QuickFilterCounts } from "@/lib/queries-inbox";
import type { CaseStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROWS: { status: CaseStatus; label: string; icon: typeof MessageCircle }[] = [
  { status: "needs_reply", label: "Needs reply", icon: MessageCircle },
  { status: "needs_review", label: "Needs review", icon: SearchCheck },
  { status: "waiting", label: "Waiting", icon: Clock },
  { status: "resolved", label: "Resolved", icon: CheckCircle2 },
];

export function QuickFiltersCard({
  counts,
  active,
}: {
  counts: QuickFilterCounts;
  active?: CaseStatus;
}) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[14.5px] font-semibold text-[#12181f]">Quick filters</p>
      <div className="mt-2 flex flex-col">
        {ROWS.map((row) => {
          const style = CASE_STATUS_STYLE[row.status];
          const Icon = row.icon;
          return (
            <Link
              key={row.status}
              href={`/communication?status=${row.status}`}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-1.5 py-2 hover:bg-[#f9f9f9]",
                active === row.status && "bg-[#f4f4f4]"
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: style.bg }}>
                <Icon className="size-[14px]" style={{ color: style.color }} />
              </span>
              <span className="flex-1 text-[13.5px] text-[#3d4451]">{row.label}</span>
              <span className="text-[13.5px] font-medium text-[#12181f]">{counts[row.status]}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
