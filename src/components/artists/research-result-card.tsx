"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dismissResult, researchDeeper, saveResultAsCandidate, checkDuplicates } from "@/actions/artists";
import { FitBadge } from "@/components/artists/artist-badges";
import { Button } from "@/components/ui/button";
import type { ArtistResearchResult, DuplicateArtistMatch, Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

export function ResearchResultCard({ sessionId, result, profiles, defaultOwnerId }: { sessionId: string; result: ArtistResearchResult; profiles: Profile[]; defaultOwnerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<DuplicateArtistMatch[] | null>(null);
  const [ownerId, setOwnerId] = useState(defaultOwnerId);

  if (result.state === "dismissed") return null;

  function save(linkToArtistId?: string) {
    startTransition(async () => {
      const artistId = await saveResultAsCandidate(result.id, ownerId, linkToArtistId);
      router.push(`/artists/${artistId}`);
    });
  }

  function checkThenSave() {
    startTransition(async () => {
      const matches = await checkDuplicates({ fullName: result.full_name, artistName: result.artist_name, email: result.email, instagram: result.instagram, website: result.website });
      if (matches.length > 0) setDuplicates(matches);
      else save();
    });
  }

  return (
    <div className="rounded-xl border border-[#eeeeee] bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-semibold text-[#12181f]">{result.artist_name || result.full_name}</p>
          <p className="text-[13px] text-[#8a909a]">{[result.location, result.technique].filter(Boolean).join(" · ")}</p>
        </div>
        <FitBadge fit={result.fit_assessment} />
      </div>

      {result.bio && <p className="mt-2 line-clamp-3 text-[13.5px] text-[#3d4451]">{result.bio}</p>}
      {result.fit_rationale && <p className="mt-2 text-[12.5px] italic text-[#8a909a]">{result.fit_rationale}</p>}

      <div className="mt-2 flex flex-wrap gap-2 text-[12.5px]">
        {result.website && <a href={result.website} target="_blank" rel="noreferrer" className="text-[#3b82f6] hover:underline">Website</a>}
        {result.instagram && <span className="text-[#8a909a]">{result.instagram}</span>}
        {result.email ? <span className="text-[#8a909a]">{result.email}</span> : <span className="text-[#b8860b]">No verified email found</span>}
      </div>

      {result.source_links.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-2">
          {result.source_links.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer" className="text-[11.5px] text-[#9aa0a8] hover:underline">
              source ↗
            </a>
          ))}
        </div>
      )}

      {duplicates ? (
        <div className="mt-3 space-y-2 rounded-lg bg-[#fdf3d9] p-2.5">
          <p className="text-[12.5px] font-medium text-[#8a6d1a]">Possible existing artist</p>
          {duplicates.map((d) => (
            <div key={d.artist.id} className="flex items-center justify-between text-[12.5px]">
              <span>{d.artist.artist_name || d.artist.full_name} ({d.matchedOn.join(", ")})</span>
              <button className="font-medium text-[#3b82f6]" onClick={() => save(d.artist.id)}>Link</button>
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => save()}>Save anyway</Button>
            <Button size="sm" variant="ghost" onClick={() => setDuplicates(null)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="h-8 rounded-md border border-input bg-transparent px-1.5 text-[12px]">
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>{ROLE_LABELS[p.role]}</option>
            ))}
          </select>
          <Button size="sm" disabled={pending} onClick={checkThenSave}>Save as candidate</Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => researchDeeper(sessionId, result.id))}>
            Research deeper
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(() => dismissResult(result.id))}>
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
