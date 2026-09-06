"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { replyArtistOutreach, sendArtistOutreach } from "@/actions/artists";
import { Button } from "@/components/ui/button";
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
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState(thread?.subject ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!body.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        if (thread) {
          await replyArtistOutreach(thread.id, body);
        } else {
          if (!subject.trim()) {
            setError("Subject is required to start outreach.");
            return;
          }
          await sendArtistOutreach(artistId, subject, body);
        }
        setBody("");
        router.refresh();
      } catch (err) {
        if (err instanceof Error && err.message === "GMAIL_NOT_CONNECTED") setError("Gmail isn't connected — connect it in Settings first.");
        else if (err instanceof Error && err.message === "NO_VERIFIED_EMAIL") setError("No verified email found for this artist — add one to send outreach.");
        else setError("Something went wrong sending this.");
      }
    });
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
        <div className="mt-3 space-y-2">
          {!thread && (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-[13.5px]"
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={thread ? "Write your reply…" : "Write your outreach message…"}
            rows={4}
            className="w-full resize-none rounded-md border border-input bg-transparent p-2.5 text-[13.5px]"
          />
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          {!gmailConnected && <p className="text-[12.5px] text-[#9aa0a8]">Gmail isn&apos;t connected — sending will fail until it&apos;s set up in Settings.</p>}
          <div className="flex items-center justify-end">
            <Button type="button" size="sm" disabled={pending || !body.trim()} onClick={submit} className="bg-[#12181f] hover:bg-[#12181f]/90">
              <Send className="size-3.5" />
              {thread ? "Send reply" : "Send outreach"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
