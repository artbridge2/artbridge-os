import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getEmailThreads, getInboxCounts, type InboxView } from "@/lib/queries-inbox";
import { InboxFilters } from "@/components/inbox-filters";
import { InboxCard } from "@/components/inbox-card";
import { cn } from "@/lib/utils";

const TABS: { view: InboxView; label: string }[] = [
  { view: "attention", label: "Needs attention" },
  { view: "waiting", label: "Waiting" },
  { view: "fyi", label: "FYI" },
];

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const view = (typeof params.view === "string" ? params.view : "attention") as InboxView;
  const owner = typeof params.owner === "string" ? params.owner : undefined;
  const category = typeof params.category === "string" ? params.category : undefined;
  const priority = typeof params.priority === "string" ? params.priority : undefined;

  const [threads, counts, profiles] = await Promise.all([
    getEmailThreads({ view, ownerId: owner, category, priority }),
    getInboxCounts(),
    getProfiles(),
  ]);

  const otherParams = new URLSearchParams();
  if (owner) otherParams.set("owner", owner);
  if (category) otherParams.set("category", category);
  if (priority) otherParams.set("priority", priority);
  const qs = otherParams.toString();

  const tabCount: Record<InboxView, number> = {
    attention: counts.attention,
    waiting: counts.waiting,
    fyi: counts.fyi,
    all: counts.attention + counts.waiting + counts.fyi,
    noise: 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
      </div>

      <div className="flex items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t.view}
            href={`/inbox?view=${t.view}${qs ? `&${qs}` : ""}`}
            className={cn(
              "border-b-2 px-3 py-2 text-sm",
              view === t.view
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label} <span className="text-muted-foreground">{tabCount[t.view]}</span>
          </Link>
        ))}
      </div>

      <InboxFilters profiles={profiles} currentUserId={profile.id} />

      <div className="space-y-2">
        {threads.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nincs a szűrésnek megfelelő email.
          </p>
        ) : (
          threads.map((thread) => <InboxCard key={thread.id} thread={thread} />)
        )}
      </div>

      {view !== "noise" && (
        <Link
          href={`/inbox?view=noise${qs ? `&${qs}` : ""}`}
          className="block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          Noise / Ignore megtekintése
        </Link>
      )}
    </div>
  );
}
