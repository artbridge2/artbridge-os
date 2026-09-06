import Link from "next/link";
import { getArtistApplications, getPendingApplicationCount } from "@/lib/queries-artists";
import { ArtistsSubnav } from "@/components/artists/artists-subnav";
import { LogApplicationDialog } from "@/components/artists/log-application-dialog";
import { APPLICATION_REVIEW_LABELS } from "@/lib/types";
import { formatElapsedEn } from "@/lib/dates";

export default async function ApplicationsPage() {
  const [applications, pendingCount] = await Promise.all([getArtistApplications(), getPendingApplicationCount()]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-[#12181f]">Artists</h1>
          <p className="mt-1 text-[14px] text-[#5a616c]">Incoming applications for review.</p>
        </div>
        <LogApplicationDialog />
      </div>

      <ArtistsSubnav active="applications" counts={{ applications: pendingCount }} />

      <div className="space-y-2.5">
        {applications.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#e4e4e4] py-10 text-center text-sm text-muted-foreground">No applications yet.</p>
        ) : (
          applications.map((app) => (
            <Link
              key={app.id}
              href={`/artists/applications/${app.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-[#eeeeee] bg-white px-4 py-3.5 hover:border-[#d8dade]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[#12181f]">{app.raw_name ?? "(no name)"}</p>
                <p className="truncate text-[13px] text-[#8a909a]">{app.raw_email ?? "No email provided"}</p>
              </div>
              <span className="shrink-0 text-[13px] text-[#9aa0a8]">{formatElapsedEn(app.submitted_at)}</span>
              <span className="shrink-0 rounded-md bg-[#f0f0f0] px-2 py-1 text-[12.5px] font-medium text-[#5a616c]">
                {APPLICATION_REVIEW_LABELS[app.review_status]}
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
