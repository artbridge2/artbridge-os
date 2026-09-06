"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateContentBody } from "@/actions/content";
import { AutosaveIndicator } from "@/components/autosave-indicator";

export function ContentBodyEditor({ contentItemId, initialBody, canEdit }: { contentItemId: string; initialBody: string | null; canEdit: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState(initialBody ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    if (body === (initialBody ?? "")) return;
    startTransition(async () => {
      await updateContentBody(contentItemId, body);
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Draft</p>
        <AutosaveIndicator pending={pending} saved={saved} />
      </div>
      <textarea
        value={body}
        disabled={!canEdit}
        onChange={(e) => setBody(e.target.value)}
        onBlur={save}
        rows={14}
        placeholder="Write the draft here…"
        className="mt-3 w-full resize-y rounded-lg border border-[#eeeeee] bg-transparent p-3 text-[14px] leading-relaxed text-[#3d4451] placeholder:text-[#9aa0a8] disabled:opacity-60"
      />
    </div>
  );
}
