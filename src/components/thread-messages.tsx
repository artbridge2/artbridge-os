import { formatElapsed } from "@/lib/dates";
import type { EmailMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ThreadMessages({ messages }: { messages: EmailMessage[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground">Nincs betöltött üzenet ehhez a threadhez.</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => (
        <div
          key={m.id}
          className={cn(
            "rounded-lg border px-4 py-3",
            m.is_inbound ? "border-border bg-card" : "border-border bg-secondary/40"
          )}
        >
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{m.sender ?? "Unknown"}</span>
            <span>{m.sent_at ? formatElapsed(m.sent_at) : ""}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">
            {m.sanitized_body || "(empty message)"}
          </p>
        </div>
      ))}
    </div>
  );
}
