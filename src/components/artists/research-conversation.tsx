"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { continueResearchSession } from "@/actions/artists";
import type { ArtistResearchMessage } from "@/lib/types";

export function ResearchConversation({ sessionId, messages }: { sessionId: string; messages: ArtistResearchMessage[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!text.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await continueResearchSession(sessionId, text);
        setText("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error && err.message === "RESEARCH_PROVIDER_FAILED" ? "Research failed — your message was saved, try again." : "Something went wrong.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div key={m.id} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-xl bg-[#12181f] px-3.5 py-2.5 text-white" : "max-w-[85%] rounded-xl border border-[#eeeeee] bg-white px-3.5 py-2.5"}>
          <p className="whitespace-pre-wrap text-[13.5px]">{m.content}</p>
        </div>
      ))}
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Refine the research… e.g. “these are too commercial, find more characterful artists”"
          disabled={pending}
          className="h-10 flex-1 rounded-lg border border-[#e4e4e4] bg-white px-3 text-[13.5px]"
        />
        <button type="button" onClick={submit} disabled={pending || !text.trim()} className="flex h-10 items-center gap-1.5 rounded-lg bg-[#12181f] px-3 text-[13px] font-medium text-white disabled:opacity-40">
          <Send className="size-3.5" />
          {pending ? "Researching…" : "Send"}
        </button>
      </div>
    </div>
  );
}
