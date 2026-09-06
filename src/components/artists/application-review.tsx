"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkDuplicates, reviewApplication } from "@/actions/artists";
import { Button } from "@/components/ui/button";
import type { ArtistApplicationWithRelations, DuplicateArtistMatch, Profile } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

export function ApplicationReview({ application, profiles, defaultOwnerId }: { application: ArtistApplicationWithRelations; profiles: Profile[]; defaultOwnerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [duplicates, setDuplicates] = useState<DuplicateArtistMatch[] | null>(null);
  const [ownerId, setOwnerId] = useState(defaultOwnerId);

  const isReviewed = application.review_status !== "pending";

  function decide(decision: "accepted" | "rejected" | "maybe_later") {
    startTransition(async () => {
      if (decision !== "rejected" && !application.artist_id) {
        const matches = await checkDuplicates({ fullName: application.raw_name, email: application.raw_email });
        if (matches.length > 0) {
          setDuplicates(matches);
          return;
        }
      }
      const artistId = await reviewApplication(application.id, decision, { ownerId });
      router.refresh();
      if (artistId) router.push(`/artists/${artistId}`);
    });
  }

  function decideLinked(decision: "accepted" | "rejected" | "maybe_later", linkToArtistId?: string) {
    startTransition(async () => {
      const artistId = await reviewApplication(application.id, decision, { ownerId, linkToArtistId });
      router.refresh();
      if (artistId) router.push(`/artists/${artistId}`);
    });
  }

  if (isReviewed) {
    return <p className="text-sm text-muted-foreground">This application was already reviewed.</p>;
  }

  if (duplicates) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Possible existing artist — link instead of creating a duplicate, or continue anyway.</p>
        {duplicates.map((d) => (
          <div key={d.artist.id} className="flex items-center justify-between rounded-lg border border-border p-2.5">
            <div>
              <p className="text-sm font-medium">{d.artist.artist_name || d.artist.full_name}</p>
              <p className="text-xs text-muted-foreground">matched on: {d.matchedOn.join(", ")}</p>
            </div>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => decideLinked("accepted", d.artist.id)}>
              Link &amp; accept
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => decideLinked("accepted")}>
            Create new anyway
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setDuplicates(null)}>
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Assign curator</label>
        <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm">
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {ROLE_LABELS[p.role]}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => decide("accepted")} className="bg-[#1c9a52] hover:bg-[#1c9a52]/90">
          Accept
        </Button>
        <Button disabled={pending} variant="outline" onClick={() => decide("maybe_later")}>
          Maybe / Later
        </Button>
        <Button disabled={pending} variant="outline" onClick={() => decide("rejected")} className="text-[#e0353b]">
          Reject
        </Button>
      </div>
    </div>
  );
}
