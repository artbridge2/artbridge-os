import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { getArtistApplicationById } from "@/lib/queries-artists";
import { ApplicationReview } from "@/components/artists/application-review";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [application, profile, profiles] = await Promise.all([getArtistApplicationById(id), getCurrentProfile(), getProfiles()]);

  if (!application) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5 pt-6">
      <Link href="/artists/applications" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
        <ArrowLeft className="size-4" />
        Applications
      </Link>

      <div className="rounded-2xl border border-[#eeeeee] bg-white p-5">
        <h1 className="text-[20px] font-bold text-[#12181f]">{application.raw_name ?? "(no name)"}</h1>
        <p className="text-[13.5px] text-[#8a909a]">{application.raw_email ?? "No email provided"}</p>

        {application.raw_links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {application.raw_links.map((link) => (
              <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="text-[13px] text-[#3b82f6] hover:underline">
                {link.label}
              </a>
            ))}
          </div>
        )}

        {application.raw_message && (
          <div className="mt-4 rounded-lg bg-[#fafafa] p-3">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[#9aa0a8]">Application message</p>
            <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-[#3d4451]">{application.raw_message}</p>
          </div>
        )}

        {application.artist && (
          <Link href={`/artists/${application.artist.id}`} className="mt-4 block text-[13.5px] font-medium text-[#3b82f6] hover:underline">
            View linked artist →
          </Link>
        )}
      </div>

      <div className="rounded-2xl border border-[#eeeeee] bg-white p-5">
        <p className="mb-3 text-[14.5px] font-semibold text-[#12181f]">Review decision</p>
        <ApplicationReview application={application} profiles={profiles} defaultOwnerId={profile.id} />
      </div>
    </div>
  );
}
