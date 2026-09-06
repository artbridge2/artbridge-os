import Link from "next/link";
import { getArtistResearchSessions, getPendingApplicationCount } from "@/lib/queries-artists";
import { ArtistsSubnav } from "@/components/artists/artists-subnav";
import { NewResearchSession } from "@/components/artists/new-research-session";
import { isResearchProviderConfigured } from "@/lib/ai/artist-research";
import { formatElapsedEn } from "@/lib/dates";

export default async function ResearchPage() {
  const [sessions, pendingApplications] = await Promise.all([getArtistResearchSessions(), getPendingApplicationCount()]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Artists</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">AI-assisted artist discovery — conversational, not a name lookup.</p>
      </div>

      <ArtistsSubnav active="research" counts={{ applications: pendingApplications }} />

      <NewResearchSession providerConfigured={isResearchProviderConfigured()} />

      <div className="space-y-2.5">
        {sessions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">No research sessions yet.</p>
        ) : (
          sessions.map((s) => (
            <Link key={s.id} href={`/artists/research/${s.id}`} className="flex items-center justify-between gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5 hover:border-[#d8dade]">
              <p className="min-w-0 flex-1 truncate text-[14.5px] font-medium text-[#12181f]">{s.title}</p>
              <span className="shrink-0 text-[13px] text-[#9aa0a8]">{formatElapsedEn(s.updated_at)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
