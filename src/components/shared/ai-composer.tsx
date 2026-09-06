"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Sparkles, PenLine, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MentionInput, resolveMentions } from "@/components/shared/mention-input";
import type { Profile } from "@/lib/types";

/**
 * Shared compose box for anywhere the app sends AI-assisted text (Communication
 * replies, Artist outreach, and future Content/Newsletter/Influencer copy).
 * Two AI paths — "Use AI draft" (context only) and "Write from brief" (a short
 * human instruction on top of that same context) — both just fill the same
 * editable textarea; sending is always the separate, explicit human action.
 */
export function AiComposer({
  initialText = "",
  initialIsAiDraft = false,
  placeholder,
  sendLabel,
  rows = 5,
  header,
  disabledNotice,
  aiDraftBanner = "AI-drafted — review and edit before sending.",
  onGenerateDraft,
  onGenerateFromBrief,
  onSend,
  mentionable = false,
  profiles = [],
}: {
  initialText?: string;
  initialIsAiDraft?: boolean;
  placeholder: string;
  sendLabel: string;
  rows?: number;
  /** Rendered above the textarea — mode toggles, a subject field, etc. */
  header?: ReactNode;
  disabledNotice?: string;
  aiDraftBanner?: string;
  /** Omit to hide "Use AI draft". */
  onGenerateDraft?: () => Promise<string>;
  /** Omit to hide "Write from brief". */
  onGenerateFromBrief?: (brief: string) => Promise<string>;
  onSend: (text: string, mentionedProfileIds: string[]) => Promise<void>;
  /** Internal notes/comments support @mentions; outgoing email doesn't. */
  mentionable?: boolean;
  profiles?: Profile[];
}) {
  const [text, setText] = useState(initialText);
  const [isAiDraft, setIsAiDraft] = useState(initialIsAiDraft);
  const [error, setError] = useState<string | null>(null);
  const [showBrief, setShowBrief] = useState(false);
  const [brief, setBrief] = useState("");
  const [picks, setPicks] = useState<{ id: string; name: string }[]>([]);
  const [pending, startTransition] = useTransition();
  const [draftPending, startDraftTransition] = useTransition();

  function runDraft(fn: () => Promise<string>) {
    setError(null);
    startDraftTransition(async () => {
      try {
        const draft = await fn();
        if (draft) {
          setText(draft);
          setIsAiDraft(true);
          setShowBrief(false);
          setBrief("");
        } else {
          setError("Couldn't generate a draft — the AI returned nothing usable. Try again.");
        }
      } catch {
        setError("Couldn't generate a draft — check that AI is configured in Settings, then retry.");
      }
    });
  }

  function submit() {
    if (!text.trim()) return;
    setError(null);
    const mentionedProfileIds = mentionable ? resolveMentions(text, picks) : [];
    startTransition(async () => {
      try {
        await onSend(text, mentionedProfileIds);
        setText("");
        setIsAiDraft(false);
        setPicks([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      }
    });
  }

  const busy = pending || draftPending;

  return (
    <div>
      {header}

      {isAiDraft && <p className="mt-2 px-1 text-[12px] font-medium text-[#7c6fe0]">{aiDraftBanner}</p>}

      {mentionable ? (
        <div className="mt-1">
          <MentionInput
            value={text}
            onValueChange={(v) => {
              setText(v);
              if (!v.trim()) setIsAiDraft(false);
            }}
            picks={picks}
            onPicksChange={setPicks}
            profiles={profiles}
            placeholder={placeholder}
            disabled={busy}
            multiline
            rows={rows}
          />
        </div>
      ) : (
        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (!e.target.value.trim()) setIsAiDraft(false);
          }}
          placeholder={placeholder}
          rows={rows}
          disabled={busy}
          className="mt-1 resize-none border-0 px-1 shadow-none focus-visible:ring-0"
        />
      )}

      {showBrief && onGenerateFromBrief && (
        <div className="mt-1 space-y-1.5 rounded-lg border border-[#eeeeee] bg-[#fafafa] p-2">
          <Textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            placeholder="Tell the AI what to say, e.g. “Tell her we love the work, but ask whether she already works with another print shop first.”"
            rows={2}
            disabled={busy}
            className="resize-none border-0 bg-white px-2 py-1.5 text-[13.5px] shadow-none focus-visible:ring-0"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !brief.trim()}
              onClick={() => runDraft(() => onGenerateFromBrief(brief))}
            >
              {draftPending ? "Generating…" : "Generate"}
            </Button>
            <button type="button" onClick={() => setShowBrief(false)} className="text-[13px] text-[#9aa0a8] hover:underline">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1 px-1 text-[13px] text-destructive">{error}</p>}
      {disabledNotice && <p className="mt-1 px-1 text-[13px] text-muted-foreground">{disabledNotice}</p>}

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {onGenerateDraft && (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => runDraft(onGenerateDraft)}>
              <Sparkles className="size-3.5" />
              {draftPending && !showBrief ? "Generating…" : isAiDraft ? "Regenerate draft" : "Use AI draft"}
            </Button>
          )}
          {onGenerateFromBrief && (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => setShowBrief((v) => !v)}>
              <PenLine className="size-3.5" />
              Write from brief
            </Button>
          )}
        </div>
        <Button type="button" size="sm" disabled={busy || !text.trim()} onClick={submit} className="bg-[#12181f] hover:bg-[#12181f]/90">
          <Send className="size-3.5" />
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}
