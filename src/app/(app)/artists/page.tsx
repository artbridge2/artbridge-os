import Link from "next/link";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getArtists, getArtistStatusCounts, getPendingApplicationCount } from "@/lib/queries-artists";
import { ArtistRow } from "@/components/artists/artist-row";
import { ArtistsSubnav } from "@/components/artists/artists-subnav";
import { NewArtistDialog } from "@/components/artists/new-artist-dialog";
import { ARTIST_STATUS_LABELS, type ArtistStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const ALL_STATUSES: ArtistStatus[] = ["candidate", "contacted", "in_conversation", "maybe_later", "registered", "active", "rejected"];

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const profile = await getCurrentProfile();

  const statusParam = typeof params.status === "string" ? (params.status as ArtistStatus) : undefined;
  const status = statusParam && ALL_STATUSES.includes(statusParam) ? statusParam : undefined;
  const search = typeof params.q === "string" ? params.q : undefined;

  const [artists, statusCounts, applicationCount, profiles] = await Promise.all([
    getArtists({ status, search, excludeRejected: !status }),
    getArtistStatusCounts(),
    getPendingApplicationCount(),
    getProfiles(),
  ]);

  const total = Object.values(statusCounts).reduce((a, b) => a + (b ?? 0), 0);
  const tabHref = (s?: ArtistStatus) => (s ? `/artists?status=${s}` : "/artists");

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

      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          href={tabHref()}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
            !status ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
          )}
        >
          All <span className="opacity-80">{total}</span>
        </Link>
        {ALL_STATUSES.map((s) => (
          <Link
            key={s}
            href={tabHref(s)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13.5px] font-medium",
              status === s ? "bg-[#12181f] text-white" : "text-[#5a616c] hover:bg-[#f4f4f4]"
            )}
          >
            {ARTIST_STATUS_LABELS[s]} <span className="opacity-80">{statusCounts[s] ?? 0}</span>
          </Link>
        ))}
      </div>

      <form className="flex items-center gap-2" action="/artists" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" defaultValue={search} placeholder="Search name, email, website, Instagram…" className="h-9 w-72 rounded-lg border border-[#e4e4e4] bg-white px-3 text-[13.5px]" />
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
