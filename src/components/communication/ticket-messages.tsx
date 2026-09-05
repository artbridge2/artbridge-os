import { initials } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import type { EmailMessage } from "@/lib/types";

export function TicketMessages({ messages }: { messages: EmailMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div
          key={m.id}
          className="rounded-xl border p-4"
          style={{
            borderColor: "#eeeeee",
            backgroundColor: m.is_internal_note ? "#fdf8e8" : "white",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[11.5px] font-semibold text-[#5a616c]">
              {initials(m.sender ?? "?")}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[14px] font-semibold text-[#12181f]">{m.sender ?? "Unknown"}</p>
                {m.is_internal_note && (
                  <span className="rounded-md bg-[#f5e6a8] px-1.5 py-0.5 text-[11px] font-medium text-[#8a6d1a]">
                    Internal note
                  </span>
                )}
                <span className="text-[12.5px] text-[#9aa0a8]">{m.sent_at ? formatElapsedEn(m.sent_at) : ""}</span>
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[14px] text-[#3d4451]">
                {m.sanitized_body || "(empty message)"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
