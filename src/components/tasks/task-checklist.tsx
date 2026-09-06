"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { addChecklistItem, removeChecklistItem, toggleChecklistItem } from "@/actions/tasks";
import type { ChecklistItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskChecklist({ taskId, items }: { taskId: string; items: ChecklistItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  function add() {
    if (!text.trim()) return;
    run(() => addChecklistItem(taskId, text));
    setText("");
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Checklist</p>
      <div className="mt-2 flex flex-col">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 py-1.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => toggleChecklistItem(taskId, item.id))}
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
            <button type="button" onClick={() => run(() => removeChecklistItem(taskId, item.id))} className="text-[#9aa0a8] hover:text-[#e0353b]">
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="py-1 text-[13px] text-[#9aa0a8]">No checklist items yet.</p>}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add an item…"
          className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-[13px]"
        />
        <button type="button" onClick={add} className="flex size-8 items-center justify-center rounded-md text-[#3b82f6] hover:bg-[#f4f4f4]">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
