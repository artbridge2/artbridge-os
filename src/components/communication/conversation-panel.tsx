"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { initials } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import type { EmailMessage } from "@/lib/types";

function MessageCard({ message, highlighted }: { message: EmailMessage; highlighted?: boolean }) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{
        borderColor: highlighted ? "#e0545c" : "#eeeeee",
        backgroundColor: message.is_internal_note ? "#fdf8e8" : "white",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[11.5px] font-semibold text-[#5a616c]">
          {initials(message.sender ?? "?")}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold text-[#12181f]">{message.sender ?? "Unknown"}</p>
            {message.is_internal_note && (
              <span className="rounded-md bg-[#f5e6a8] px-1.5 py-0.5 text-[11px] font-medium text-[#8a6d1a]">Internal note</span>
            )}
            <span className="text-[12.5px] text-[#9aa0a8]">{message.sent_at ? formatElapsedEn(message.sent_at) : ""}</span>
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-[14px] text-[#3d4451]">{message.sanitized_body || "(empty message)"}</p>
        </div>
      </div>
    </div>
  );
}

export function ConversationPanel({ messages }: { messages: EmailMessage[] }) {
  const [expanded, setExpanded] = useState(false);

  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
        No messages yet.
      </div>
    );
  }

  const latestInbound = [...messages].reverse().find((m) => m.is_inbound && !m.is_internal_note);
  // Nothing inbound yet (e.g. we sent first, no reply) — fall back to the most recent message overall.
  const highlight = latestInbound ?? messages[messages.length - 1]!;
  const rest = messages.filter((m) => m.id !== highlight.id);

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-[#9aa0a8]">
          {latestInbound ? "Latest incoming email" : "Latest message"}
        </p>
        <MessageCard message={highlight} highlighted={!!latestInbound} />
      </div>

      {rest.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[13px] font-medium text-[#5a616c] hover:text-[#12181f]"
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {expanded ? "Hide full conversation" : `View full conversation (${messages.length} messages)`}
          </button>
          {expanded && (
            <div className="mt-2.5 space-y-2.5">
              {messages.map((m) => (
                <MessageCard key={m.id} message={m} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
