import { setArtistDisplayName } from "@/actions/artists";
import { ArtistStatusBadge, FitBadge } from "@/components/artists/artist-badges";
import { EditableTitle } from "@/components/shared/editable-title";
import { initials } from "@/lib/communication-style";
import { ARTIST_SOURCE_LABELS, type ArtistWithRelations } from "@/lib/types";

export function ArtistHeader({ artist }: { artist: ArtistWithRelations }) {
  const name = artist.artist_name || artist.full_name;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eeecfd] text-[15px] font-semibold text-[#7c6fe0]">
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#7c6fe0]">{ARTIST_SOURCE_LABELS[artist.source]}</p>
          <EditableTitle title={name} onSave={setArtistDisplayName.bind(null, artist.id)} />
          {artist.artist_name && <p className="text-[13.5px] text-[#8a909a]">{artist.full_name}</p>}
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <FitBadge fit={artist.fit_assessment} />
          <ArtistStatusBadge status={artist.status} />
        </div>
        {artist.owner && <p className="text-[12.5px] text-[#9aa0a8]">Owner: {artist.owner.full_name}</p>}
      </div>
    </div>
  );
}
