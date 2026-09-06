"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateArtistDraft, generateArtistDraftFromBrief, replyArtistOutreach, sendArtistOutreach } from "@/actions/artists";
import { AiComposer } from "@/components/shared/ai-composer";
import { formatElapsedEn } from "@/lib/dates";
import type { ArtistOutreachMessage, ArtistOutreachThread } from "@/lib/types";

export function ArtistOutreachPanel({
  artistId,
  hasEmail,
  gmailConnected,
  thread,
  messages,
}: {
  artistId: string;
  hasEmail: boolean;
  gmailConnected: boolean;
  thread: ArtistOutreachThread | null;
  messages: ArtistOutreachMessage[];
}) {
  const router = useRouter();
  const [subject, setSubject] = useState(thread?.subject ?? "");
  const [subjectError, setSubjectError] = useState<string | null>(null);

  async function onSend(body: string, _mentionedProfileIds: string[]) {
    if (thread) {
      await replyArtistOutreach(thread.id, body);
    } else {
      if (!subject.trim()) {
        setSubjectError("Subject is required to start outreach.");
        throw new Error("Subject is required to start outreach.");
      }
      setSubjectError(null);
      try {
        await sendArtistOutreach(artistId, subject, body);
      } catch (err) {
        if (err instanceof Error && err.message === "GMAIL_NOT_CONNECTED") throw new Error("Gmail isn't connected — connect it in Settings first.");
        if (err instanceof Error && err.message === "NO_VERIFIED_EMAIL") throw new Error("No verified email found for this artist — add one to send outreach.");
        throw new Error("Something went wrong sending this.");
      }
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Conversation</p>

      {messages.length > 0 && (
        <div className="mt-2 space-y-2">
          {messages.map((m) => (
            <div key={m.id} className="rounded-lg border border-[#eeeeee] p-2.5">
              <div className="flex items-center justify-between text-[12px] text-[#9aa0a8]">
                <span className="font-medium text-[#12181f]">{m.is_inbound ? "Artist" : m.sender ?? "Artbridge"}</span>
                <span>{m.sent_at ? formatElapsedEn(m.sent_at) : ""}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-[#3d4451]">{m.sanitized_body}</p>
            </div>
          ))}
        </div>
      )}

      {!hasEmail ? (
        <p className="mt-2 text-[13px] text-[#b8860b]">No verified email found — add one in Contact before starting outreach.</p>
      ) : (
        <div className="mt-3">
          <AiComposer
            placeholder={thread ? "Write your reply…" : "Write your outreach message…"}
            sendLabel={thread ? "Send reply" : "Send outreach"}
            rows={4}
            disabledNotice={!gmailConnected ? "Gmail isn't connected — sending will fail until it's set up in Settings." : undefined}
            onGenerateDraft={() => generateArtistDraft(artistId, thread?.id ?? null)}
            onGenerateFromBrief={(brief) => generateArtistDraftFromBrief(artistId, thread?.id ?? null, brief)}
            onSend={onSend}
            header={
              !thread ? (
                <div className="mb-2">
                  <input
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      if (e.target.value.trim()) setSubjectError(null);
                    }}
                    placeholder="Subject"
                    className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-[13.5px]"
                  />
                  {subjectError && <p className="mt-1 text-[13px] text-destructive">{subjectError}</p>}
                </div>
              ) : undefined
            }
          />
        </div>
      )}
    </div>
  );
}
