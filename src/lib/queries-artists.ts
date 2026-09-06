import "server-only";
import { createClient } from "@/lib/supabase/server";
import type {
  ArtistApplicationWithRelations,
  ArtistComment,
  ArtistDocument,
  ArtistEvent,
  ArtistOutreachMessage,
  ArtistOutreachThread,
  ArtistStatus,
  ArtistWithRelations,
  Profile,
} from "@/lib/types";

const ARTIST_SELECT = `*, owner:profiles!artists_owner_id_fkey(id, full_name, role, email)`;

export interface ArtistFilters {
  status?: ArtistStatus;
  source?: string;
  ownerId?: string;
  fitAssessment?: string;
  search?: string;
  /** All-Artists view excludes application/research pipeline noise unless asked for explicitly. */
  excludeRejected?: boolean;
}

export async function getArtists(filters: ArtistFilters = {}): Promise<ArtistWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("artists").select(ARTIST_SELECT).is("deleted_at", null);

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.ownerId) query = query.eq("owner_id", filters.ownerId);
  if (filters.fitAssessment) query = query.eq("fit_assessment", filters.fitAssessment);
  if (filters.excludeRejected) query = query.neq("status", "rejected");
  if (filters.search) {
    const term = filters.search;
    query = query.or(
      `full_name.ilike.%${term}%,artist_name.ilike.%${term}%,email.ilike.%${term}%,website.ilike.%${term}%,instagram.ilike.%${term}%`
    );
  }

  const { data } = await query.order("updated_at", { ascending: false });
  return (data ?? []) as unknown as ArtistWithRelations[];
}

export async function getArtistById(id: string): Promise<ArtistWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select(ARTIST_SELECT).eq("id", id).is("deleted_at", null).single();
  return (data as unknown as ArtistWithRelations) ?? null;
}

export async function getArtistStatusCounts(): Promise<Partial<Record<ArtistStatus, number>>> {
  const supabase = await createClient();
  const { data } = await supabase.from("artists").select("status").is("deleted_at", null);
  const counts: Partial<Record<ArtistStatus, number>> = {};
  for (const row of data ?? []) {
    const status = row.status as ArtistStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

const APPLICATION_SELECT = `*, artist:artists(*)`;

export async function getArtistApplications(reviewStatus?: string): Promise<ArtistApplicationWithRelations[]> {
  const supabase = await createClient();
  let query = supabase.from("artist_applications").select(APPLICATION_SELECT);
  if (reviewStatus) query = query.eq("review_status", reviewStatus);
  const { data } = await query.order("submitted_at", { ascending: false });
  return (data ?? []) as unknown as ArtistApplicationWithRelations[];
}

export async function getArtistApplicationById(id: string): Promise<ArtistApplicationWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_applications").select(APPLICATION_SELECT).eq("id", id).single();
  return (data as unknown as ArtistApplicationWithRelations) ?? null;
}

export async function getPendingApplicationCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("artist_applications")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "pending");
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Outreach — real email thread storage/read only (AI research/discovery
// removed; see actions/artists.ts). Kept for the Artist detail page's
// Conversation card and the auto Contacted->In conversation transition.
// ---------------------------------------------------------------------------

export async function getArtistOutreachThreads(artistId: string): Promise<ArtistOutreachThread[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artist_outreach_threads")
    .select("*")
    .eq("artist_id", artistId)
    .order("last_message_at", { ascending: false });
  return (data ?? []) as ArtistOutreachThread[];
}

export async function getArtistOutreachMessages(threadId: string): Promise<ArtistOutreachMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("artist_outreach_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true });
  return (data ?? []) as ArtistOutreachMessage[];
}

// ---------------------------------------------------------------------------
// Discussion, documents, events
// ---------------------------------------------------------------------------

const COMMENT_SELECT = `*, author:profiles!artist_comments_author_id_fkey(id, full_name, role, email)`;

export async function getArtistComments(artistId: string): Promise<(ArtistComment & { author: Profile | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_comments").select(COMMENT_SELECT).eq("artist_id", artistId).order("created_at", { ascending: true });
  return (data ?? []) as unknown as (ArtistComment & { author: Profile | null })[];
}

export async function getArtistDocuments(artistId: string): Promise<ArtistDocument[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_documents").select("*").eq("artist_id", artistId).order("created_at", { ascending: true });
  return (data ?? []) as ArtistDocument[];
}

export async function getArtistEvents(artistId: string): Promise<ArtistEvent[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("artist_events").select("*").eq("artist_id", artistId).order("created_at", { ascending: false });
  return (data ?? []) as ArtistEvent[];
}
