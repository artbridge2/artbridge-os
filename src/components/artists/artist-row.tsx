import { User } from "lucide-react";
import { ArtistStatusBadge, FitBadge } from "@/components/artists/artist-badges";
import { OpenButton } from "@/components/home/open-button";
import { initials } from "@/lib/communication-style";
import { formatElapsedEn } from "@/lib/dates";
import type { ArtistWithRelations } from "@/lib/types";

export function ArtistRow({ artist }: { artist: ArtistWithRelations }) {
  const name = artist.artist_name || artist.full_name;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#eeecfd] text-[#7c6fe0]">
        {name ? (
          <span className="text-[13px] font-semibold">{initials(name)}</span>
        ) : (
          <User className="size-[18px]" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold text-[#12181f]">{name}</p>
          <FitBadge fit={artist.fit_assessment} />
        </div>
        <p className="truncate text-[13px] text-[#8a909a]">
          {[artist.location, artist.technique].filter(Boolean).join(" · ") || artist.email || "No details yet"}
        </p>
      </div>

      <div className="w-28 shrink-0 text-right text-[13px] text-[#9aa0a8]">{formatElapsedEn(artist.updated_at)}</div>

      <ArtistStatusBadge status={artist.status} />

      <OpenButton href={`/artists/${artist.id}`} />
    </div>
  );
}
