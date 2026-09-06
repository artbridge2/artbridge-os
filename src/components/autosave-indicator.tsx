"use client";

/** Shared "Saving…/Saved" feedback for autosaving fields (task/case sidebars) — silent otherwise. */
export function AutosaveIndicator({ pending, saved }: { pending: boolean; saved: boolean }) {
  if (!pending && !saved) return null;
  return <span className="text-[12px] font-medium text-[#9aa0a8]">{pending ? "Saving…" : "Saved"}</span>;
}
