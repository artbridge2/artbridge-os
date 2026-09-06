import { OpenButton } from "@/components/home/open-button";
import type { MarketingAttentionItem } from "@/lib/queries-marketing";

export function NeedsAttentionCard({ items }: { items: MarketingAttentionItem[] }) {
  return (
    <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[14.5px] font-semibold text-[#12181f]">Needs review / attention</p>
      <div className="mt-2 space-y-2">
        {items.length === 0 ? (
          <p className="py-4 text-[13.5px] text-[#9aa0a8]">Nothing needs action right now.</p>
        ) : (
          items.map((item) => (
            <div key={`${item.source_type}-${item.source_id}`} className="flex items-center gap-3 rounded-lg border border-[#eeeeee] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-[#12181f]">{item.title}</p>
                <p className="truncate text-[12.5px] text-[#8a909a]">
                  {item.reason}
                  {item.owner ? ` · ${item.owner}` : ""}
                </p>
              </div>
              <OpenButton href={item.href} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
