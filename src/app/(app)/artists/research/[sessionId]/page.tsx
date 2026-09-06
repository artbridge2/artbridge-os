import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getArtistResearchMessages, getArtistResearchResults, getArtistResearchSessionById } from "@/lib/queries-artists";
import { ResearchConversation } from "@/components/artists/research-conversation";
import { ResearchResultCard } from "@/components/artists/research-result-card";

export default async function ResearchSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const [session, messages, results, profile, profiles] = await Promise.all([
    getArtistResearchSessionById(sessionId),
    getArtistResearchMessages(sessionId),
    getArtistResearchResults(sessionId),
    getCurrentProfile(),
    getProfiles(),
  ]);

  if (!session) notFound();

  const activeResults = results.filter((r) => r.state !== "dismissed");

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 pt-6 lg:grid-cols-[360px_1fr]">
      <div className="min-w-0 space-y-3">
        <Link href="/artists/research" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
          <ArrowLeft className="size-4" />
          Research
        </Link>
        <p className="text-[16px] font-semibold text-[#12181f]">{session.title}</p>
        <ResearchConversation sessionId={session.id} messages={messages} />
      </div>

      <div className="min-w-0 space-y-2.5">
        <p className="text-[13.5px] text-[#9aa0a8]">{activeResults.length} result{activeResults.length === 1 ? "" : "s"}</p>
        {activeResults.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">No results yet — send a research instruction to get started.</p>
        ) : (
          activeResults.map((r) => <ResearchResultCard key={r.id} sessionId={session.id} result={r} profiles={profiles} defaultOwnerId={profile.id} />)
        )}
      </div>
    </div>
  );
}
