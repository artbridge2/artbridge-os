"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Send } from "lucide-react";
import { generateDraft, postInternalNote, sendReply } from "@/actions/inbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function ReplyComposer({ threadId, gmailConnected }: { threadId: string; gmailConnected: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    startTransition(async () => {
      const draft = await generateDraft(threadId);
      if (draft) setText(draft);
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

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={mode === "reply" ? "Write your reply…" : "Write an internal note (never sent externally)…"}
        rows={5}
        disabled={pending}
        className="mt-2 resize-none border-0 px-1 shadow-none focus-visible:ring-0"
      />

      {error && <p className="mt-1 px-1 text-[13px] text-destructive">{error}</p>}
      {mode === "reply" && !gmailConnected && (
        <p className="mt-1 px-1 text-[13px] text-muted-foreground">
          Gmail isn't connected — sending will fail until it's set up in Settings.
        </p>
      )}

      <div className="mt-2 flex items-center justify-between">
        {mode === "reply" ? (
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={useAiDraft}>
            <Sparkles className="size-3.5" />
            Use AI draft
          </Button>
        ) : (
          <span />
        )}
        <Button type="button" size="sm" disabled={pending || !text.trim()} onClick={submit} className="bg-[#12181f] hover:bg-[#12181f]/90">
          <Send className="size-3.5" />
          {mode === "reply" ? "Send reply" : "Add note"}
        </Button>
      </div>
    </div>
  );
}
