import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { canAccessCommunication } from "@/lib/permissions";
import { getEmailThreads } from "@/lib/queries-inbox";
import { ConversationRow } from "@/components/communication/conversation-row";

export default async function ArchivePage() {
  const profile = await getCurrentProfile();
  if (!(await canAccessCommunication(profile))) redirect("/");

  const threads = await getEmailThreads({ archived: true });

  return (
    <div className="max-w-3xl space-y-5 pt-6">
      <Link href="/communication" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
        <ArrowLeft className="size-4" />
        Back to Communication
      </Link>

      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Archive</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">
          Cases resolved for more than 3 days move here automatically. Open one to restore it.
        </p>
      </div>

      <div className="space-y-2.5">
        {threads.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
            Nothing archived yet.
          </p>
        ) : (
          threads.map((thread) => <ConversationRow key={thread.id} thread={thread} />)
        )}
      </div>
    </div>
  );
}
