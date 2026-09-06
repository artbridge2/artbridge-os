"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCategory } from "@/actions/inbox";
import { CATEGORY_LABELS_SINGULAR, COMMUNICATION_CATEGORY_GROUPS, type EmailCategory } from "@/lib/types";

/**
 * Click-to-edit category tag on the ticket header. AI classifications are
 * intelligent defaults, not locked decisions — see setCategory in
 * actions/inbox.ts for what a correction actually triggers (routing,
 * Shopify re-match, AI refresh, and feeding the correction back into future
 * classification).
 */
export function CategoryEditor({ threadId, category }: { threadId: string; category: EmailCategory }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleChange(next: EmailCategory) {
    setEditing(false);
    if (next === category) return;
    startTransition(async () => {
      await setCategory(threadId, next);
      router.refresh();
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  if (editing) {
    return (
      <select
        autoFocus
        defaultValue={category}
        disabled={pending}
        onBlur={() => setEditing(false)}
        onChange={(e) => handleChange(e.target.value as EmailCategory)}
        className="h-6 rounded-md border border-input bg-white px-1 text-[13px] font-medium text-[#12181f]"
      >
        {COMMUNICATION_CATEGORY_GROUPS.map((c) => (
          <option key={c} value={c}>
            {CATEGORY_LABELS_SINGULAR[c]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={pending}
      className="underline decoration-dotted decoration-from-font underline-offset-2 hover:opacity-70 disabled:opacity-60"
      title="Click to correct the category"
    >
      {pending ? "Saving…" : saved ? "Saved" : CATEGORY_LABELS_SINGULAR[category]}
    </button>
  );
}
