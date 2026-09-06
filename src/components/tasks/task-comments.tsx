"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { postTaskComment } from "@/actions/tasks";
import { initials } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import type { Profile, TaskComment } from "@/lib/types";

export function TaskComments({ taskId, comments }: { taskId: string; comments: (TaskComment & { author: Profile | null })[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    startTransition(async () => {
      await postTaskComment(taskId, text);
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Comments</p>
      <div className="mt-2 flex flex-col gap-3">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[11px] font-semibold text-[#5a616c]">
              {initials(c.author?.full_name ?? "?")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[13.5px] font-semibold text-[#12181f]">{c.author?.full_name ?? "Unknown"}</p>
                <span className="text-[12px] text-[#9aa0a8]">{formatElapsedEn(c.created_at)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-[#3d4451]">{c.body}</p>
            </div>
          </div>
        ))}
        {comments.length === 0 && <p className="text-[13px] text-[#9aa0a8]">No comments yet.</p>}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Write a comment… use @Name to mention someone"
          disabled={pending}
          className="h-9 flex-1 rounded-md border border-input bg-transparent px-2.5 text-[13.5px]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending || !text.trim()}
          className="h-9 rounded-md bg-[#12181f] px-3 text-[13px] font-medium text-white disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </div>
  );
}
