"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/dal";
import { getProfiles } from "@/lib/queries";
import { sendNewMessage, sendReply as sendGmailReply } from "@/lib/gmail/client";
import { extractCandidates, generateOutreachDraft, researchCandidateContact, runResearchTurn, type CandidateExtraction } from "@/lib/ai/artist-research";
import { findPossibleDuplicates, type DuplicateCandidateInput } from "@/lib/artists/duplicate-detection";
import type { ArtistLink, ArtistStatus, FitAssessment } from "@/lib/types";

const MAX_DEEP_DIVE_CANDIDATES = 5;

function revalidateArtistViews() {
  revalidatePath("/", "layout");
}

async function logArtistEvent(artistId: string, eventType: string, fromValue: string | null, toValue: string | null) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("artist_events").insert({ artist_id: artistId, actor_id: me.id, event_type: eventType, from_value: fromValue, to_value: toValue });
}

async function notifyUser(userId: string, type: string, title: string, body: string | null, href: string) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({ user_id: userId, type, title, body, href });
}

async function notifyMentions(body: string, title: string | null, href: string) {
  const profiles = await getProfiles();
  const me = await getCurrentProfile();
  for (const p of profiles) {
    if (p.id === me.id) continue;
    if (body.toLowerCase().includes(`@${p.full_name.toLowerCase()}`)) {
      await notifyUser(p.id, "mention", `${me.full_name} mentioned you`, title, href);
    }
  }
}

// ---------------------------------------------------------------------------
// Duplicate check (spec §12) — called before any canonical creation
// ---------------------------------------------------------------------------

export async function checkDuplicates(input: DuplicateCandidateInput) {
  return findPossibleDuplicates(input);
}

// ---------------------------------------------------------------------------
// Direct add
// ---------------------------------------------------------------------------

export interface CreateArtistInput {
  fullName: string;
  artistName?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  bio?: string | null;
  ownerId: string;
  source: "direct" | "application" | "research";
}

export async function createArtist(input: CreateArtistInput): Promise<string> {
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: artist, error } = await supabase
    .from("artists")
    .insert({
      full_name: input.fullName,
      artist_name: input.artistName || null,
      email: input.email || null,
      website: input.website || null,
      instagram: input.instagram || null,
      bio: input.bio || null,
      source: input.source,
      status: "candidate",
      owner_id: input.ownerId,
      created_by: me.id,
    })
    .select("id")
    .single();

  if (error || !artist) throw new Error("Failed to create artist");
  await logArtistEvent(artist.id, "created", null, input.source);
  revalidateArtistViews();
  return artist.id as string;
}

export type CreateArtistFormState = { error?: string } | undefined;

export async function submitCreateArtist(_prev: CreateArtistFormState, formData: FormData): Promise<CreateArtistFormState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const ownerId = String(formData.get("owner_id") ?? "");
  if (!fullName || !ownerId) return { error: "Name and owner are required." };

  const id = await createArtist({
    fullName,
    artistName: String(formData.get("artist_name") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    instagram: String(formData.get("instagram") ?? "").trim() || null,
    bio: String(formData.get("bio") ?? "").trim() || null,
    ownerId,
    source: "direct",
  });

  revalidatePath("/artists");
  redirect(`/artists/${id}`);
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export async function setArtistStatus(artistId: string, status: ArtistStatus) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("artists").select("status, owner_id, full_name").eq("id", artistId).single();
  await supabase.from("artists").update({ status }).eq("id", artistId);
  await logArtistEvent(artistId, "status_changed", before?.status ?? null, status);

  if (status === "maybe_later" && before?.owner_id) {
    await notifyUser(before.owner_id, "artist_status", "Candidate needs a decision", before.full_name, `/artists/${artistId}`);
  }
  revalidateArtistViews();
}

export async function reassignArtist(artistId: string, ownerId: string) {
  const supabase = await createClient();
  const { data: before } = await supabase.from("artists").select("owner_id, full_name").eq("id", artistId).single();
  await supabase.from("artists").update({ owner_id: ownerId }).eq("id", artistId);
  await logArtistEvent(artistId, "reassigned", before?.owner_id ?? null, ownerId);
  if (ownerId !== before?.owner_id) {
    await notifyUser(ownerId, "artist_assigned", "Artist assigned to you", before?.full_name ?? null, `/artists/${artistId}`);
  }
  revalidateArtistViews();
}

export async function setFitAssessment(artistId: string, fit: FitAssessment | null, rationale: string | null) {
  const supabase = await createClient();
  await supabase.from("artists").update({ fit_assessment: fit, fit_rationale: rationale }).eq("id", artistId);
  revalidateArtistViews();
}

export async function updateArtistField(
  artistId: string,
  patch: Partial<{ bio: string | null; technique: string | null; location: string | null; website: string | null; instagram: string | null; phone: string | null; email: string | null }>
) {
  const supabase = await createClient();
  await supabase.from("artists").update(patch).eq("id", artistId);
  revalidateArtistViews();
}

export async function deleteArtist(artistId: string) {
  const supabase = await createClient();
  await supabase.from("artists").update({ deleted_at: new Date().toISOString() }).eq("id", artistId);
  revalidateArtistViews();
  redirect("/artists");
}

// ---------------------------------------------------------------------------
// Discussion (@mentions)
// ---------------------------------------------------------------------------

export async function postArtistComment(artistId: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const { data: artist } = await supabase.from("artists").select("full_name").eq("id", artistId).single();

  await supabase.from("artist_comments").insert({ artist_id: artistId, author_id: me.id, body });
  await notifyMentions(body, artist?.full_name ?? null, `/artists/${artistId}`);
  revalidateArtistViews();
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function addArtistDocument(artistId: string, name: string, url: string) {
  if (!name.trim() || !url.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();
  await supabase.from("artist_documents").insert({ artist_id: artistId, name: name.trim(), url: url.trim(), added_by: me.id });
  revalidateArtistViews();
}

export async function removeArtistDocument(id: string) {
  const supabase = await createClient();
  await supabase.from("artist_documents").delete().eq("id", id);
  revalidateArtistViews();
}

// ---------------------------------------------------------------------------
// Onboarding (spec §16-17)
// ---------------------------------------------------------------------------

const ONBOARDING_FIELD_MAP = {
  commission: ["onboarding_commission_at", "onboarding_commission_by"],
  registration: ["onboarding_registration_at", "onboarding_registration_by"],
  upload: ["onboarding_upload_at", "onboarding_upload_by"],
  published: ["onboarding_published_at", "onboarding_published_by"],
} as const;

export async function completeOnboardingStep(artistId: string, step: keyof typeof ONBOARDING_FIELD_MAP, commissionTerms?: string) {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const [atField, byField] = ONBOARDING_FIELD_MAP[step];

  const patch: Record<string, unknown> = { [atField]: new Date().toISOString(), [byField]: me.id };
  if (step === "commission" && commissionTerms) patch.commission_terms = commissionTerms;

  await supabase.from("artists").update(patch).eq("id", artistId);
  await logArtistEvent(artistId, "onboarding_step_completed", null, step);

  if (step === "published") {
    await supabase.from("artists").update({ status: "active" }).eq("id", artistId);
    await logArtistEvent(artistId, "status_changed", "accepted", "active");
  }
  revalidateArtistViews();
}

export async function reopenOnboardingStep(artistId: string, step: keyof typeof ONBOARDING_FIELD_MAP) {
  const supabase = await createClient();
  const [atField, byField] = ONBOARDING_FIELD_MAP[step];
  await supabase.from("artists").update({ [atField]: null, [byField]: null }).eq("id", artistId);
  revalidateArtistViews();
}

// ---------------------------------------------------------------------------
// Applications (spec §6)
// ---------------------------------------------------------------------------

export async function logApplication(input: { name: string; email: string | null; message: string | null; links: ArtistLink[] }) {
  const supabase = await createClient();
  const { data: application, error } = await supabase
    .from("artist_applications")
    .insert({ raw_name: input.name, raw_email: input.email, raw_message: input.message, raw_links: input.links })
    .select("id")
    .single();
  if (error || !application) throw new Error("Failed to log application");
  revalidateArtistViews();
  return application.id as string;
}

export async function reviewApplication(
  applicationId: string,
  decision: "accepted" | "rejected" | "maybe_later",
  input: { linkToArtistId?: string; ownerId?: string }
) {
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: application } = await supabase.from("artist_applications").select("*").eq("id", applicationId).single();
  if (!application) throw new Error("Application not found");

  let artistId = input.linkToArtistId ?? application.artist_id ?? null;

  if (!artistId && decision !== "rejected") {
    const { data: artist, error } = await supabase
      .from("artists")
      .insert({
        full_name: application.raw_name ?? "Unknown",
        email: application.raw_email,
        other_links: application.raw_links,
        source: "application",
        status: decision === "accepted" ? "accepted" : "maybe_later",
        owner_id: input.ownerId ?? me.id,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (error || !artist) throw new Error("Failed to create artist from application");
    artistId = artist.id as string;
  } else if (artistId) {
    await supabase
      .from("artists")
      .update({ status: decision === "accepted" ? "accepted" : decision === "maybe_later" ? "maybe_later" : "rejected" })
      .eq("id", artistId);
  }

  await supabase
    .from("artist_applications")
    .update({ review_status: decision, reviewed_by: me.id, reviewed_at: new Date().toISOString(), artist_id: artistId })
    .eq("id", applicationId);

  if (artistId) await logArtistEvent(artistId, "application_reviewed", application.review_status, decision);

  revalidateArtistViews();
  return artistId;
}

// ---------------------------------------------------------------------------
// Research (spec §8-11)
// ---------------------------------------------------------------------------

function toResultRow(sessionId: string, c: CandidateExtraction) {
  return {
    session_id: sessionId,
    full_name: c.full_name,
    artist_name: c.artist_name,
    location: c.location,
    bio: c.bio,
    technique: c.technique,
    website: c.website,
    instagram: c.instagram,
    email: c.email,
    source_links: c.source_links.map((url) => ({ label: url, url })),
    fit_assessment: c.fit_assessment,
    fit_rationale: c.fit_rationale,
  };
}

/** Deep-dive values win when present; otherwise fall back to the broad discovery pass. Never drops a field the broad pass already found. */
function mergeDeepDive(shallow: CandidateExtraction, deep: CandidateExtraction | undefined): CandidateExtraction {
  if (!deep) return shallow;
  return {
    full_name: deep.full_name || shallow.full_name,
    artist_name: deep.artist_name ?? shallow.artist_name,
    location: deep.location ?? shallow.location,
    bio: deep.bio ?? shallow.bio,
    technique: deep.technique ?? shallow.technique,
    website: deep.website ?? shallow.website,
    instagram: deep.instagram ?? shallow.instagram,
    email: deep.email ?? shallow.email,
    source_links: [...new Set([...shallow.source_links, ...deep.source_links])],
    fit_assessment: deep.fit_assessment ?? shallow.fit_assessment,
    fit_rationale: deep.fit_rationale ?? shallow.fit_rationale,
  };
}

/**
 * One full discovery turn: broad web-search pass -> extract candidate names
 * -> drop ones already known (real artists DB or already surfaced in this
 * session) -> targeted per-candidate deep dive (parallel, bounded) for
 * contact info specifically -> persist. This is the actual multi-step
 * workflow — not a single completion hoping the model does all of it itself.
 */
async function runDiscoveryTurn(sessionId: string, history: { role: "user" | "assistant"; content: string }[], message: string) {
  const supabase = await createClient();

  const reply = await runResearchTurn({ history, message, sessionId });
  await supabase.from("artist_research_messages").insert({ session_id: sessionId, role: "assistant", content: reply });

  const shallowCandidates = await extractCandidates(reply, sessionId).catch(() => []);
  if (shallowCandidates.length === 0) return;

  const { data: existingResults } = await supabase.from("artist_research_results").select("full_name").eq("session_id", sessionId);
  const existingNames = new Set((existingResults ?? []).map((r) => r.full_name.toLowerCase()));

  const newCandidates: CandidateExtraction[] = [];
  const alreadyKnown: string[] = [];

  for (const c of shallowCandidates) {
    if (existingNames.has(c.full_name.toLowerCase())) {
      alreadyKnown.push(c.full_name);
      continue;
    }
    const duplicates = await findPossibleDuplicates({ fullName: c.full_name, email: c.email, instagram: c.instagram, website: c.website });
    if (duplicates.length > 0) {
      alreadyKnown.push(c.full_name);
      continue;
    }
    newCandidates.push(c);
  }

  const toDeepDive = newCandidates.slice(0, MAX_DEEP_DIVE_CANDIDATES);
  const skippedForBudget = newCandidates.slice(MAX_DEEP_DIVE_CANDIDATES);

  const deepDived = await Promise.all(
    toDeepDive.map(async (candidate) => {
      try {
        const text = await researchCandidateContact(candidate.full_name, candidate.bio ?? candidate.fit_rationale ?? "", sessionId);
        const [deep] = await extractCandidates(text, sessionId);
        return mergeDeepDive(candidate, deep);
      } catch (err) {
        console.error("[artists] deep-dive research failed for", candidate.full_name, err);
        return candidate;
      }
    })
  );

  const finalCandidates = [...deepDived, ...skippedForBudget];
  if (finalCandidates.length > 0) {
    await supabase.from("artist_research_results").insert(finalCandidates.map((c) => toResultRow(sessionId, c)));
  }

  const summaryParts: string[] = [];
  if (deepDived.length > 0) summaryParts.push(`Researched ${deepDived.length} new candidate${deepDived.length === 1 ? "" : "s"} in depth, including contact info where publicly available.`);
  if (skippedForBudget.length > 0) summaryParts.push(`Found ${skippedForBudget.length} more candidate(s) but didn't deep-dive them yet this turn — ask to continue and I'll research them too.`);
  if (alreadyKnown.length > 0) summaryParts.push(`Already known, not re-added: ${alreadyKnown.join(", ")}.`);
  if (summaryParts.length > 0) {
    await supabase.from("artist_research_messages").insert({ session_id: sessionId, role: "assistant", content: summaryParts.join(" ") });
  }
}

export async function startResearchSession(brief: string): Promise<string> {
  if (!brief.trim()) throw new Error("A research brief is required.");
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: session, error } = await supabase
    .from("artist_research_sessions")
    .insert({ title: brief.slice(0, 80), brief, created_by: me.id })
    .select("id")
    .single();
  if (error || !session) throw new Error("Failed to start research session");

  await supabase.from("artist_research_messages").insert({ session_id: session.id, role: "user", content: brief });

  try {
    await runDiscoveryTurn(session.id, [], brief);
  } catch (err) {
    console.error("[artists] research turn failed", err);
  }

  revalidatePath(`/artists/research/${session.id}`);
  return session.id as string;
}

export async function continueResearchSession(sessionId: string, message: string) {
  if (!message.trim()) return;
  const supabase = await createClient();

  const { data: history } = await supabase
    .from("artist_research_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  await supabase.from("artist_research_messages").insert({ session_id: sessionId, role: "user", content: message });

  try {
    await runDiscoveryTurn(sessionId, (history ?? []) as { role: "user" | "assistant"; content: string }[], message);
  } catch (err) {
    console.error("[artists] research turn failed", err);
    throw new Error("RESEARCH_PROVIDER_FAILED");
  }

  await supabase.from("artist_research_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId);
  revalidatePath(`/artists/research/${sessionId}`);
}

/** Re-researches one existing result in place (not a new discovery turn) — the whole point is a deeper, targeted pass on a candidate already found. */
export async function researchDeeper(sessionId: string, resultId: string) {
  const supabase = await createClient();
  const { data: result } = await supabase.from("artist_research_results").select("*").eq("id", resultId).single();
  if (!result) return;

  try {
    const text = await researchCandidateContact(result.full_name, result.bio ?? result.fit_rationale ?? "", sessionId);
    const [deep] = await extractCandidates(text, sessionId);

    if (deep) {
      const existingLinks = ((result.source_links as ArtistLink[] | null) ?? []).map((l) => l.url);
      const mergedLinks = [...new Set([...existingLinks, ...deep.source_links])];
      await supabase
        .from("artist_research_results")
        .update({
          artist_name: deep.artist_name ?? result.artist_name,
          location: deep.location ?? result.location,
          bio: deep.bio ?? result.bio,
          technique: deep.technique ?? result.technique,
          website: deep.website ?? result.website,
          instagram: deep.instagram ?? result.instagram,
          email: deep.email ?? result.email,
          source_links: mergedLinks.map((url) => ({ label: url, url })),
          fit_assessment: deep.fit_assessment ?? result.fit_assessment,
          fit_rationale: deep.fit_rationale ?? result.fit_rationale,
        })
        .eq("id", resultId);
    }

    await supabase.from("artist_research_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content: deep
        ? `Did a deeper pass on ${result.full_name} — updated with anything new I found.`
        : `Searched further for ${result.full_name} but didn't find additional verified details.`,
    });
  } catch (err) {
    console.error("[artists] researchDeeper failed", err);
  }
  revalidatePath(`/artists/research/${sessionId}`);
}

export async function dismissResult(resultId: string) {
  const supabase = await createClient();
  await supabase.from("artist_research_results").update({ state: "dismissed" }).eq("id", resultId);
  revalidatePath("/artists/research");
}

export async function saveResultAsCandidate(resultId: string, ownerId: string, linkToArtistId?: string): Promise<string> {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const { data: result } = await supabase.from("artist_research_results").select("*").eq("id", resultId).single();
  if (!result) throw new Error("Research result not found");

  let artistId = linkToArtistId ?? null;
  if (!artistId) {
    const { data: artist, error } = await supabase
      .from("artists")
      .insert({
        full_name: result.full_name,
        artist_name: result.artist_name,
        location: result.location,
        bio: result.bio,
        technique: result.technique,
        website: result.website,
        instagram: result.instagram,
        email: result.email,
        other_links: result.portfolio_links,
        fit_assessment: result.fit_assessment,
        fit_rationale: result.fit_rationale,
        source: "research",
        status: "candidate",
        owner_id: ownerId,
        created_by: me.id,
      })
      .select("id")
      .single();
    if (error || !artist) throw new Error("Failed to save candidate");
    artistId = artist.id as string;
    await logArtistEvent(artistId, "created", null, "research");
  }

  await supabase.from("artist_research_results").update({ state: "saved", saved_artist_id: artistId }).eq("id", resultId);
  revalidateArtistViews();
  return artistId;
}

// ---------------------------------------------------------------------------
// Outreach (spec §14-15) — uses the shared Gmail connection, never Communication.
// ---------------------------------------------------------------------------

export async function generateArtistOutreachDraft(artistId: string): Promise<string> {
  const supabase = await createClient();
  const { data: artist } = await supabase.from("artists").select("full_name, artist_name, bio, technique, fit_rationale").eq("id", artistId).single();
  if (!artist) return "";
  return generateOutreachDraft(artist, artistId);
}

export async function sendArtistOutreach(artistId: string, subject: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: artist } = await supabase.from("artists").select("email, full_name, status").eq("id", artistId).single();
  if (!artist) throw new Error("Artist not found");
  if (!artist.email) throw new Error("NO_VERIFIED_EMAIL");

  const admin = createAdminClient();
  const { data: gmailIntegration } = await admin
    .from("gmail_integration")
    .select("connected_email")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gmailIntegration) throw new Error("GMAIL_NOT_CONNECTED");

  const { gmailThreadId, gmailMessageId } = await sendNewMessage({
    to: artist.email,
    subject,
    body,
    from: gmailIntegration.connected_email,
  });

  const { data: thread, error } = await supabase
    .from("artist_outreach_threads")
    .insert({ artist_id: artistId, gmail_thread_id: gmailThreadId, subject, last_message_at: new Date().toISOString() })
    .select("id")
    .single();
  if (error || !thread) throw new Error("Failed to record outreach thread");

  await supabase.from("artist_outreach_messages").insert({
    thread_id: thread.id,
    gmail_message_id: gmailMessageId,
    sender: me.full_name,
    is_inbound: false,
    sanitized_body: body,
    sent_at: new Date().toISOString(),
  });

  if (artist.status === "candidate") {
    await supabase.from("artists").update({ status: "contacted" }).eq("id", artistId);
    await logArtistEvent(artistId, "status_changed", "candidate", "contacted");
  }

  revalidateArtistViews();
}

/** Replies within an existing Artist outreach thread — never touches Communication. */
export async function replyArtistOutreach(threadId: string, body: string) {
  if (!body.trim()) return;
  const supabase = await createClient();
  const me = await getCurrentProfile();

  const { data: thread } = await supabase.from("artist_outreach_threads").select("*, artist:artists(email, status, id)").eq("id", threadId).single();
  if (!thread) throw new Error("Outreach thread not found");
  const artist = thread.artist as unknown as { email: string | null; status: string; id: string };
  if (!artist?.email) throw new Error("NO_VERIFIED_EMAIL");
  if (!thread.gmail_thread_id) throw new Error("Thread has no Gmail conversation to reply to");

  const admin = createAdminClient();
  const { data: gmailIntegration } = await admin
    .from("gmail_integration")
    .select("connected_email")
    .order("connected_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!gmailIntegration) throw new Error("GMAIL_NOT_CONNECTED");

  await sendGmailReply({
    gmailThreadId: thread.gmail_thread_id,
    to: artist.email,
    subject: thread.subject ?? "(no subject)",
    body,
    from: gmailIntegration.connected_email,
  });

  const now = new Date().toISOString();
  await supabase.from("artist_outreach_messages").insert({
    thread_id: threadId,
    gmail_message_id: `local-sent-${crypto.randomUUID()}`,
    sender: me.full_name,
    is_inbound: false,
    sanitized_body: body,
    sent_at: now,
  });
  await supabase.from("artist_outreach_threads").update({ last_message_at: now }).eq("id", threadId);

  revalidateArtistViews();
}
