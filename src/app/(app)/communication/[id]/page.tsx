import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getEmailMessages, getEmailThreadById } from "@/lib/queries-inbox";
import { getAreas, getProfiles } from "@/lib/queries";
import { ThreadMessages } from "@/components/thread-messages";
import { InboxDetailControls } from "@/components/inbox-detail-controls";
import { PriorityBadge } from "@/components/priority-badge";
import { CATEGORY_LABELS } from "@/lib/types";

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [thread, messages, profiles, areas] = await Promise.all([
    getEmailThreadById(id),
    getEmailMessages(id),
    getProfiles(),
    getAreas(),
  ]);

  if (!thread) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 pt-6">
      <Link
        href="/communication"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Communication
      </Link>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_280px]">
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {thread.category && <span>{CATEGORY_LABELS[thread.category]}</span>}
            </div>
            <div className="mt-1 flex items-center justify-between gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                {thread.subject ?? "(no subject)"}
              </h1>
              <PriorityBadge priority={thread.priority} />
            </div>
            {thread.participants.length > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {thread.participants.map((p) => p.email).join(", ")}
              </p>
            )}
          </div>

          {thread.ai_summary && (
            <div className="rounded-lg bg-secondary/50 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">AI summary</p>
              <p className="mt-1 text-sm">{thread.ai_summary}</p>
            </div>
          )}

          <ThreadMessages messages={messages} />
        </div>

        <InboxDetailControls thread={thread} profiles={profiles} areas={areas} />
      </div>
    </div>
  );
}
