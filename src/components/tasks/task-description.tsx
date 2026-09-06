"use client";

import { useState, useTransition } from "react";
import { updateTask } from "@/actions/tasks";

export function TaskDescription({ taskId, description }: { taskId: string; description: string | null }) {
  const [value, setValue] = useState(description ?? "");
  const [, startTransition] = useTransition();

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== (description ?? "")) startTransition(() => updateTask(taskId, { description: value || null }));
      }}
      placeholder="Add a description…"
      rows={4}
      className="w-full resize-none rounded-xl border border-[#eeeeee] bg-white p-4 text-[14px] text-[#3d4451] placeholder:text-[#9aa0a8] focus:outline-none focus:ring-1 focus:ring-[#12181f]"
    />
  );
}
