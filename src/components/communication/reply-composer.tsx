"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateDraft, generateDraftFromBrief, postInternalNote, sendReply } from "@/actions/inbox";
import { AiComposer } from "@/components/shared/ai-composer";
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

  async function onSend(text: string) {
    try {
      if (mode === "note") {
        await postInternalNote(threadId, text);
      } else {
        await sendReply(threadId, text);
      }
      router.refresh();
    } catch (err) {
      if (err instanceof Error && err.message === "GMAIL_NOT_CONNECTED") {
        throw new Error("Gmail isn't connected yet — connect it in Settings to send external replies.");
      }
      throw new Error("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-3">
      <AiComposer
        key={mode}
        initialText={mode === "reply" ? initialDraft ?? "" : ""}
        initialIsAiDraft={mode === "reply" && !!initialDraft}
        placeholder={mode === "reply" ? "Write your reply…" : "Write an internal note (never sent externally)…"}
        sendLabel={mode === "reply" ? "Send reply" : "Add note"}
        aiDraftBanner="AI-drafted from this case — review and edit before sending."
        disabledNotice={mode === "reply" && !gmailConnected ? "Gmail isn't connected — sending will fail until it's set up in Settings." : undefined}
        onGenerateDraft={mode === "reply" ? () => generateDraft(threadId) : undefined}
        onGenerateFromBrief={mode === "reply" ? (brief) => generateDraftFromBrief(threadId, brief) : undefined}
        onSend={onSend}
        header={
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
        }
      />
    </div>
  );
}
