"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send } from "lucide-react";
import { generateDraft, postInternalNote, sendReply } from "@/actions/inbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ReplyComposer({
  threadId,
  gmailConnected,
  initialDraft,
}: {
  threadId: string;
  gmailConnected: boolean;
  initialDraft?: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState(initialDraft ?? "");
  const [isAiDraft, setIsAiDraft] = useState(!!initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draftPending, startDraftTransition] = useTransition();

  function submit() {
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        if (mode === "note") {
          await postInternalNote(threadId, text);
        } else {
          await sendReply(threadId, text);
        }
        setText("");
        router.refresh();
      } catch (err) {
        if (err instanceof Error && err.message === "GMAIL_NOT_CONNECTED") {
          setError("Gmail isn't connected yet — connect it in Settings to send external replies.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    });
  }

  function useAiDraft() {
    setError(null);
    startDraftTransition(async () => {
      try {
        const draft = await generateDraft(threadId);
        if (draft) {
          setText(draft);
          setIsAiDraft(true);
        } else {
          setError("Couldn't generate a draft — the AI returned nothing usable. Try again.");
        }
      } catch {
        setError("Couldn't generate a draft — check that AI is configured in Settings, then retry.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setMode("reply")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            mode === "reply" ? "bg-[#12181f] text-white" : "text-[#8a909a] hover:bg-[#f4f4f4]"
          )}
        >
          Reply
        </button>
        <button
          type="button"
          onClick={() => setMode("note")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            mode === "note" ? "bg-[#12181f] text-white" : "text-[#8a909a] hover:bg-[#f4f4f4]"
          )}
        >
          Internal note
        </button>
      </div>

      {mode === "reply" && isAiDraft && (
        <p className="mt-2 px-1 text-[12px] font-medium text-[#7c6fe0]">AI-drafted from this case — review and edit before sending.</p>
      )}

      <Textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (!e.target.value.trim()) setIsAiDraft(false);
        }}
        placeholder={mode === "reply" ? "Write your reply…" : "Write an internal note (never sent externally)…"}
        rows={5}
        disabled={pending || draftPending}
        className="mt-1 resize-none border-0 px-1 shadow-none focus-visible:ring-0"
      />

      {error && <p className="mt-1 px-1 text-[13px] text-destructive">{error}</p>}
      {mode === "reply" && !gmailConnected && (
        <p className="mt-1 px-1 text-[13px] text-muted-foreground">
          Gmail isn't connected — sending will fail until it's set up in Settings.
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        {mode === "reply" ? (
          <Button type="button" variant="outline" size="sm" disabled={pending || draftPending} onClick={useAiDraft}>
            <Sparkles className="size-3.5" />
            {draftPending ? "Generating draft…" : isAiDraft ? "Regenerate draft" : "Use AI draft"}
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" size="sm" disabled={pending || draftPending || !text.trim()} onClick={submit} className="bg-[#12181f] hover:bg-[#12181f]/90">
          <Send className="size-3.5" />
          {mode === "reply" ? "Send reply" : "Add note"}
        </Button>
      </div>
    </div>
  );
}
