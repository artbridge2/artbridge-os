"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, X } from "lucide-react";
import { removeChecklistItem, toggleChecklistItem } from "@/actions/inbox";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/types";

export function AiCasePanel({
  threadId,
  summary,
  checklist,
}: {
  threadId: string;
  summary: string | null;
  checklist: ChecklistItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  if (!summary && checklist.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-[#fafafa] p-4">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-[#7c6fe0]" />
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9aa0a8]">AI summary</p>
      </div>
      {summary && <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#3d4451]">{summary}</p>}

      {checklist.length > 0 && (
        <div className="mt-3 border-t border-[#e8e8e8] pt-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Suggested next actions</p>
          <div className="mt-1.5 flex flex-col">
            {checklist.map((item) => (
              <div key={item.id} className="group flex items-center gap-2.5 py-1">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => toggleChecklistItem(threadId, item.id))}
                  className={cn(
                    "flex size-4.5 shrink-0 items-center justify-center rounded border transition-colors",
                    item.done ? "border-transparent bg-[#12181f]" : "border-[#d8dade]"
                  )}
                >
                  {item.done && <div className="size-2 rounded-[1px] bg-white" />}
                </button>
                <span className={cn("flex-1 text-[13.5px] text-[#3d4451]", item.done && "text-[#9aa0a8] line-through")}>
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => run(() => removeChecklistItem(threadId, item.id))}
                  className="text-[#c7c9cc] opacity-0 hover:text-[#e0353b] group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
