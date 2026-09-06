"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MentionInput, resolveMentions } from "@/components/shared/mention-input";
import { initials } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import type { Profile } from "@/lib/types";

export interface DiscussionComment {
  id: string;
  body: string;
  created_at: string;
  author: Profile | null;
  mentioned_profile_ids?: string[] | null;
}

/** Renders "@Name" runs that resolved to a real mentioned profile as bold — a light visual echo of the structured mention, not a re-parse of the text. */
function renderBody(body: string, mentionedProfiles: Profile[]) {
  if (mentionedProfiles.length === 0) return body;
  const names = mentionedProfiles.map((p) => p.full_name).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(@(?:${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  return body.split(pattern).map((part, i) => (pattern.test(part) ? <strong key={i} className="font-semibold text-[#3d3aa8]">{part}</strong> : <span key={i}>{part}</span>));
}

/**
 * Shared "Internal discussion" card — one implementation instead of the 4
 * near-byte-identical ones (Tasks/Artists/Campaigns/Projects) that existed
 * before (spec §9).
 */
export function Discussion({
  title = "Internal discussion",
  placeholder = "Write a comment…",
  emptyLabel = "No discussion yet.",
  comments,
  profiles,
  onPost,
}: {
  title?: string;
  placeholder?: string;
  emptyLabel?: string;
  comments: DiscussionComment[];
  profiles: Profile[];
  onPost: (body: string, mentionedProfileIds: string[]) => Promise<void>;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [picks, setPicks] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  function submit() {
    if (!text.trim()) return;
    setError(null);
    const mentionedProfileIds = resolveMentions(text, picks);
    startTransition(async () => {
      try {
        await onPost(text, mentionedProfileIds);
        setText("");
        setPicks([]);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">{title}</p>
      <div className="mt-2 flex flex-col gap-3">
        {comments.map((c) => {
          const mentioned = (c.mentioned_profile_ids ?? []).map((id) => profileById.get(id)).filter((p): p is Profile => !!p);
          return (
            <div key={c.id} className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[11px] font-semibold text-[#5a616c]">
                {initials(c.author?.full_name ?? "?")}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-semibold text-[#12181f]">{c.author?.full_name ?? "Unknown"}</p>
                  <span className="text-[12px] text-[#9aa0a8]">{formatElapsedEn(c.created_at)}</span>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-[#3d4451]">{renderBody(c.body, mentioned)}</p>
              </div>
            </div>
          );
        })}
        {comments.length === 0 && <p className="text-[13px] text-[#9aa0a8]">{emptyLabel}</p>}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        <MentionInput
          value={text}
          onValueChange={setText}
          picks={picks}
          onPicksChange={setPicks}
          profiles={profiles}
          placeholder={placeholder}
          disabled={pending}
          onEnter={submit}
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
      {error && <p className="mt-1 text-[13px] text-destructive">{error}</p>}
    </div>
  );
}
