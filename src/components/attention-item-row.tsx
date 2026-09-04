import Link from "next/link";
import { PriorityBadge } from "@/components/priority-badge";
import type { AttentionItem } from "@/lib/attention";

export function AttentionItemRow({ item }: { item: AttentionItem }) {
  return (
    <Link
      href={item.href}
      className="block rounded-lg border border-border bg-card px-4 py-3 hover:border-foreground/20"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <PriorityBadge priority={item.priority} />
      </div>
      {item.summary && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.summary}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">{item.attention_reason}</p>
    </Link>
  );
}
