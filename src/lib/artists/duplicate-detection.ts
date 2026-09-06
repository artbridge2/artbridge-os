import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Artist, DuplicateArtistMatch } from "@/lib/types";

function normalizeInstagram(handle: string | null | undefined): string | null {
  if (!handle) return null;
  return handle.trim().toLowerCase().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "");
}

function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const withProtocol = url.match(/^https?:\/\//) ? url : `https://${url}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export interface DuplicateCandidateInput {
  fullName?: string | null;
  artistName?: string | null;
  email?: string | null;
  instagram?: string | null;
  website?: string | null;
}

/**
 * Rule-based entity resolution (spec §12) — never merges automatically.
 * Checks name/artist-name/email/Instagram/website-domain, each a real
 * independent signal, and returns every artist matched on at least one.
 */
export async function findPossibleDuplicates(input: DuplicateCandidateInput): Promise<DuplicateArtistMatch[]> {
  const supabase = await createClient();
  const matches = new Map<string, DuplicateArtistMatch>();

  function addMatch(artist: Artist, reason: string) {
    const existing = matches.get(artist.id);
    if (existing) {
      if (!existing.matchedOn.includes(reason)) existing.matchedOn.push(reason);
    } else {
      matches.set(artist.id, { artist, matchedOn: [reason] });
    }
  }

  const email = input.email?.trim().toLowerCase() || null;
  if (email) {
    const { data } = await supabase.from("artists").select("*").ilike("email", email).is("deleted_at", null);
    for (const a of data ?? []) addMatch(a as Artist, "email");
  }

  const instagram = normalizeInstagram(input.instagram);
  if (instagram) {
    const { data } = await supabase.from("artists").select("*").ilike("instagram", `%${instagram}%`).is("deleted_at", null);
    for (const a of data ?? []) {
      if (normalizeInstagram(a.instagram) === instagram) addMatch(a as Artist, "instagram");
    }
  }

  const domain = extractDomain(input.website);
  if (domain) {
    const { data } = await supabase.from("artists").select("*").ilike("website", `%${domain}%`).is("deleted_at", null);
    for (const a of data ?? []) {
      if (extractDomain(a.website) === domain) addMatch(a as Artist, "website");
    }
  }

  const names = [input.fullName, input.artistName].filter((n): n is string => !!n?.trim());
  for (const name of names) {
    const { data } = await supabase
      .from("artists")
      .select("*")
      .or(`full_name.ilike.%${name}%,artist_name.ilike.%${name}%`)
      .is("deleted_at", null);
    for (const a of data ?? []) {
      const matchesFull = a.full_name?.toLowerCase() === name.toLowerCase();
      const matchesArtist = a.artist_name?.toLowerCase() === name.toLowerCase();
      if (matchesFull || matchesArtist) addMatch(a as Artist, "name");
    }
  }

  return [...matches.values()];
}
