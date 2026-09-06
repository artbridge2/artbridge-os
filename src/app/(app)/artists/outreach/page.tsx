import { getOutreachArtists, getPendingApplicationCount } from "@/lib/queries-artists";
import { ArtistsSubnav } from "@/components/artists/artists-subnav";
import { ArtistRow } from "@/components/artists/artist-row";

export default async function OutreachPage() {
  const [artists, pendingApplications] = await Promise.all([getOutreachArtists(), getPendingApplicationCount()]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-6">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Artists</h1>
        <p className="mt-1 text-[14px] text-[#5a616c]">Acquisition outreach and replies.</p>
      </div>

      <ArtistsSubnav active="outreach" counts={{ applications: pendingApplications }} />

      <div className="space-y-2.5">
        {artists.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">
            No outreach sent yet — start one from an artist&apos;s profile.
          </p>
        ) : (
          artists.map((artist) => <ArtistRow key={artist.id} artist={artist} />)
        )}
      </div>
    </div>
  );
}
