"use client";

import { postArtistComment } from "@/actions/artists";
import { Discussion } from "@/components/shared/discussion";
import type { ArtistComment, Profile } from "@/lib/types";

export function ArtistDiscussion({
  artistId,
  comments,
  profiles,
}: {
  artistId: string;
  comments: (ArtistComment & { author: Profile | null })[];
  profiles: Profile[];
}) {
  return (
    <Discussion
      placeholder="Discuss this artist…"
      comments={comments}
      profiles={profiles}
      onPost={(body, mentionedProfileIds) => postArtistComment(artistId, body, mentionedProfileIds)}
    />
  );
}
