import Link from "next/link";
import { PriorityBadge } from "@/components/priority-badge";
import { formatElapsed, isOlderThanHours } from "@/lib/dates";
import { ACTION_LABELS, CATEGORY_LABELS, ROLE_LABELS, type EmailThreadWithRelations } from "@/lib/types";
import { cn } from "@/lib/utils";

export function InboxCard({ thread }: { thread: EmailThreadWithRelations }) {
  const waitingSince = thread.last_inbound_at ?? thread.last_message_at;
  const isStale =
    thread.status === "needs_attention" && !!waitingSince && isOlderThanHours(waitingSince, 48);

  return (
    <Link
      href={`/communication/${thread.id}`}
      className="block rounded-lg border border-border bg-card px-4 py-3 hover:border-foreground/20"
    >
      <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {thread.category && <span>{CATEGORY_LABELS[thread.category]}</span>}
        {thread.owner && (
          <>
            <span>·</span>
            <span>{ROLE_LABELS[thread.owner.role]}</span>
          </>
        )}
        {!thread.owner_id && (
          <>
            <span>·</span>
            <span>Needs assignment</span>
          </>
        )}
      </div>

      <div className="mt-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{thread.sender ?? "Unknown sender"}</p>
          <p className="truncate text-sm text-foreground/80">{thread.subject ?? "(no subject)"}</p>
        </div>
        <PriorityBadge priority={thread.priority} />
      </div>

      {thread.ai_summary && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{thread.ai_summary}</p>
      )}

      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        {waitingSince && (
          <span className={cn(isStale && "font-medium text-red-600 dark:text-red-400")}>
            Waiting: {formatElapsed(waitingSince)}
          </span>
        )}
        {thread.action && <span>{ACTION_LABELS[thread.action]}</span>}
      </div>
    </Link>
  );
}
