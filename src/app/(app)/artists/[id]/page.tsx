import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getProfiles } from "@/lib/queries";
import { getGmailConnectionStatus } from "@/lib/gmail/status";
import {
  getArtistById,
  getArtistComments,
  getArtistDocuments,
  getArtistOutreachMessages,
  getArtistOutreachThreads,
} from "@/lib/queries-artists";
import { ArtistHeader } from "@/components/artists/artist-header";
import { ArtistDetailsCard } from "@/components/artists/artist-details-card";
import { ArtistDiscussion } from "@/components/artists/artist-discussion";
import { ArtistOutreachPanel } from "@/components/artists/artist-outreach-panel";
import { ArtistOnboarding } from "@/components/artists/artist-onboarding";
import { ArtistDocuments } from "@/components/artists/artist-documents";
import { ArtistSidebar } from "@/components/artists/artist-sidebar";

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [artist, profiles, comments, documents, threads, gmailStatus] = await Promise.all([
    getArtistById(id),
    getProfiles(),
    getArtistComments(id),
    getArtistDocuments(id),
    getArtistOutreachThreads(id),
    getGmailConnectionStatus(),
  ]);

  if (!artist) notFound();

  const latestThread = threads[0] ?? null;
  const messages = latestThread ? await getArtistOutreachMessages(latestThread.id) : [];
  // Onboarding milestones (Commission -> Registration -> Upload -> Published) start once there's
  // an active conversation, since Registration itself is one of the steps that moves them further.
  const showOnboarding = artist.status === "in_conversation" || artist.status === "registered" || artist.status === "active";

  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-6 pt-6 lg:grid-cols-[1fr_280px]">
      <div className="min-w-0 space-y-4">
        <Link href="/artists" className="inline-flex items-center gap-1 text-sm text-[#8a909a] hover:text-[#12181f]">
          <ArrowLeft className="size-4" />
          Artists
        </Link>

        <ArtistHeader artist={artist} />

        <ArtistDetailsCard artist={artist} />

        {showOnboarding && <ArtistOnboarding artist={artist} />}

        <ArtistOutreachPanel
          artistId={artist.id}
          hasEmail={!!artist.email}
          gmailConnected={gmailStatus.connected}
          thread={latestThread}
          messages={messages}
        />

        <ArtistDiscussion artistId={artist.id} comments={comments} />

        <ArtistDocuments artistId={artist.id} documents={documents} />
      </div>

      <ArtistSidebar artist={artist} profiles={profiles} />
    </div>
  );
}
