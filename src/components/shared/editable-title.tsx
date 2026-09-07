"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/** Click-to-edit title, shared by Communication case titles and Artist outreach thread subjects. */
export function EditableTitle({
  title,
  onSave,
  className,
}: {
  title: string;
  onSave: (next: string) => Promise<void>;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const next = inputRef.current?.value ?? title;
    setEditing(false);
    if (next.trim() === title.trim()) return;
    startTransition(async () => {
      await onSave(next);
      router.refresh();
    });
  }

  const base = className ?? "text-[19px] font-semibold text-[#12181f]";

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
        className={`w-full rounded-md border border-input bg-white px-1.5 py-0.5 outline-none ${base}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={pending}
      title="Click to rename"
      className={`truncate text-left underline decoration-dotted decoration-from-font underline-offset-4 hover:opacity-70 disabled:opacity-60 ${base}`}
    >
      {pending ? "Saving…" : title}
    </button>
  );
}
