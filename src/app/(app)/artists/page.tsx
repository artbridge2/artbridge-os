import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getArtists, getPendingApplicationCount } from "@/lib/queries-artists";
import { ArtistRow } from "@/components/artists/artist-row";
import { ArtistsSubnav } from "@/components/artists/artists-subnav";
import { NewArtistDialog } from "@/components/artists/new-artist-dialog";
import type { ArtistStatus } from "@/lib/types";

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const status = typeof params.status === "string" ? (params.status as ArtistStatus) : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;

  const [artists, applicationCount, profiles] = await Promise.all([
    getArtists({ status, search, excludeRejected: !status }),
    getPendingApplicationCount(),
    getProfiles(),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Artists</h1>
          <p className="mt-1 text-[14px] text-[#5a616c]">Acquisition, curation and onboarding.</p>
        </div>
        <NewArtistDialog profiles={profiles} defaultOwnerId={profile.id} />
      </div>

      <ArtistsSubnav active="all" counts={{ applications: applicationCount }} />

      <form className="flex items-center gap-2" action="/artists" method="get">
        <input name="q" defaultValue={search} placeholder="Search name, email, website, Instagram…" className="h-9 w-72 rounded-lg border border-[#e4e4e4] bg-white px-3 text-[13.5px]" />
        <select name="status" defaultValue={status ?? ""} className="h-9 rounded-lg border border-[#e4e4e4] bg-white px-2 text-[13.5px]">
          <option value="">All statuses</option>
          <option value="candidate">Candidate</option>
          <option value="contacted">Contacted</option>
          <option value="in_conversation">In conversation</option>
          <option value="maybe_later">Maybe / Later</option>
          <option value="accepted">Accepted</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="rejected">Rejected</option>
        </select>
        <button type="submit" className="h-9 rounded-lg bg-[#12181f] px-3 text-[13.5px] font-medium text-white">
          Apply
        </button>
      </form>

      <div className="space-y-2.5">
        {artists.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">No artists match this filter.</p>
        ) : (
          artists.map((artist) => <ArtistRow key={artist.id} artist={artist} />)
        )}
      </div>
    </div>
  );
}
