"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSubjectOverride } from "@/actions/inbox";

/** Click-to-edit case title — see subject_override on EmailThread for why this is a separate field from the raw Gmail subject. */
export function EditableSubject({ threadId, title }: { threadId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const next = inputRef.current?.value ?? title;
    setEditing(false);
    if (next.trim() === title.trim()) return;
    startTransition(async () => {
      await setSubjectOverride(threadId, next);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        defaultValue={title}
        disabled={pending}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full rounded-md border border-input bg-white px-1.5 py-0.5 text-[19px] font-semibold text-[#12181f] outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={pending}
      title="Click to rename"
      className="truncate text-left text-[19px] font-semibold text-[#12181f] underline decoration-dotted decoration-from-font underline-offset-4 hover:opacity-70 disabled:opacity-60"
    >
      {pending ? "Saving…" : title}
    </button>
  );
}
