import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAiInstruction } from "./instructions";

/**
 * Provider-abstracted artist research (spec §23). Everything the app needs
 * from "AI research" goes through these two functions — swap providers here
 * without touching callers. Requires a provider with real web-browsing
 * capability; Anthropic's web search tool is the default per the master
 * spec ("Claude if suitable research/web capability is available").
 */

const RESEARCH_MODEL = process.env.ANTHROPIC_RESEARCH_MODEL || "claude-sonnet-5";
const EXTRACT_MODEL = process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-haiku-4-5-20251001";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  // web_search-backed calls can legitimately take longer (multiple searches
  // within one completion), but still need a hard ceiling so a stuck request
  // can't hang indefinitely.
  return new Anthropic({ apiKey, timeout: 45_000, maxRetries: 1 });
}

export function isResearchProviderConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

async function buildResearchSystemPrompt(): Promise<string> {
  const [global, artistResearch] = await Promise.all([getAiInstruction("global"), getAiInstruction("artist_research")]);
  return `You are Artbridge's artist-research assistant.

${global}

${artistResearch}

Your job: given a research brief and the conversation so far, use web search to find real, currently-active artists who plausibly fit the brief. For each artist you find, report in your text response:
- Full name and artist/display name if different
- Location (country/city) if known
- A short bio / description of their practice
- Technique/medium/style
- Website URL if you found one
- Instagram handle/URL if you found one
- Email address ONLY if you actually found one publicly listed — never guess or construct one
- 1-2 source URLs you used
- A concise Artbridge-fit assessment (Strong fit / Possible fit / Weak fit) with one sentence of reasoning, based on whether their style/practice suits a curated print-friendly gallery — not follower counts or generic popularity

Never invent facts, emails, exhibitions or biographical details you did not find. If you're not confident about something, say so explicitly rather than guessing. Treat follow-up messages as refinements of the same research thread (e.g. "these are too commercial" should narrow future results, not start over) — use the conversation history to understand what's being refined.

Write clearly, in a numbered or clearly-separated list per artist, since a later step will parse this into structured records.`;
}

export interface ResearchTurnInput {
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
}

/** One turn of the conversational research session. Throws on provider failure — the session/prompt is preserved by the caller either way. */
export async function runResearchTurn(input: ResearchTurnInput): Promise<string> {
  const response = await client().messages.create({
    model: RESEARCH_MODEL,
    max_tokens: 4096,
    system: await buildResearchSystemPrompt(),
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 } as unknown as Anthropic.Tool],
    messages: [
      ...input.history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: input.message },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");
  return text.trim();
}

const CandidateSchema = z.object({
  full_name: z.string(),
  artist_name: z.string().nullable(),
  location: z.string().nullable(),
  bio: z.string().nullable(),
  technique: z.string().nullable(),
  website: z.string().nullable(),
  instagram: z.string().nullable(),
  email: z.string().nullable(),
  source_links: z.array(z.string()).default([]),
  fit_assessment: z.enum(["strong", "possible", "weak"]).nullable(),
  fit_rationale: z.string().nullable(),
});

export type CandidateExtraction = z.infer<typeof CandidateSchema>;

/**
 * Structures the assistant's freeform research text into discrete
 * candidates. Extraction-only — must not add facts beyond what the text
 * already states (enforced by prompt, not just schema).
 */
export async function extractCandidates(researchText: string): Promise<CandidateExtraction[]> {
  const response = await client().messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 4096,
    system:
      "Extract each distinct artist mentioned in the given research text into a structured list. Use null for any field not explicitly present in the text — never infer or fabricate a value, especially email addresses. Copy source URLs and fit assessment verbatim from the text.",
    tools: [
      {
        name: "extract_candidates",
        description: "Return the list of artist candidates found in the research text.",
        input_schema: {
          type: "object",
          properties: {
            candidates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  full_name: { type: "string" },
                  artist_name: { type: ["string", "null"] },
                  location: { type: ["string", "null"] },
                  bio: { type: ["string", "null"] },
                  technique: { type: ["string", "null"] },
                  website: { type: ["string", "null"] },
                  instagram: { type: ["string", "null"] },
                  email: { type: ["string", "null"] },
                  source_links: { type: "array", items: { type: "string" } },
                  fit_assessment: { type: ["string", "null"], enum: ["strong", "possible", "weak", null] },
                  fit_rationale: { type: ["string", "null"] },
                },
                required: [
                  "full_name",
                  "artist_name",
                  "location",
                  "bio",
                  "technique",
                  "website",
                  "instagram",
                  "email",
                  "source_links",
                  "fit_assessment",
                  "fit_rationale",
                ],
              },
            },
          },
          required: ["candidates"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "extract_candidates" },
    messages: [{ role: "user", content: researchText }],
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return [];
  const parsed = z.object({ candidates: z.array(CandidateSchema) }).parse(toolUse.input);
  return parsed.candidates;
}

/**
 * Focused single-candidate deep dive — a separate, targeted search pass
 * distinct from the broad discovery turn. Finding a public email usually
 * means specifically visiting that artist's own site/contact page, which a
 * broad multi-artist search pass under-invests in; naming the artist and
 * explicitly directing several distinct queries at them gets meaningfully
 * further. Returns free text — pipe through extractCandidates() same as the
 * broad turn, since it's the same "text -> structured, never fabricate" step.
 */
export async function researchCandidateContact(fullName: string, context: string): Promise<string> {
  const [global, artistResearch] = await Promise.all([getAiInstruction("global"), getAiInstruction("artist_research")]);
  const response = await client().messages.create({
    model: RESEARCH_MODEL,
    max_tokens: 2048,
    system: `You are Artbridge's artist-research assistant doing a focused deep dive on one specific, already-identified artist candidate.

${global}

${artistResearch}

Run several distinct searches to build a complete, sourced picture of this one artist — do not stop after the first result:
1. Their official website or portfolio (try "${fullName} artist website", "${fullName} portfolio").
2. Their Instagram or other social/professional profile.
3. A publicly listed contact email — specifically check their site's contact/about page and any gallery/representation page ("${fullName} contact email", "${fullName} represented by"). Only report an email you actually found published somewhere; if you genuinely cannot find one after trying, say "Email not found" rather than guessing or constructing one from a name pattern.
4. Location, technique/medium, and enough about their practice to judge fit for a curated print-friendly gallery.

Report full_name, artist_name (if different), location, bio, technique, website, instagram, email (or explicitly "not found"), 2-3 source URLs actually used, and a fit assessment (Strong/Possible/Weak fit) with one sentence of reasoning. Never invent anything you did not find.`,
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 } as unknown as Anthropic.Tool],
    messages: [{ role: "user", content: `Research this candidate in depth: ${fullName}. Context from initial discovery: ${context}` }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n\n");
  return text.trim();
}

/** Generates a personalized outreach draft from verified artist context. Never sends anything. */
export async function generateOutreachDraft(artist: {
  full_name: string;
  artist_name: string | null;
  bio: string | null;
  technique: string | null;
  fit_rationale: string | null;
}): Promise<string> {
  const response = await client().messages.create({
    model: RESEARCH_MODEL,
    max_tokens: 1024,
    system:
      "You write short, warm, non-generic outreach emails from Artbridge (a curated art gallery/print shop) to artists Artbridge would like to represent, sent from info@artbridge.hu. Tone: genuine, specific to the artist's actual work, concise. Reference only the verified context provided — never invent details about the artist. Write only the email body, no subject line.",
    messages: [
      {
        role: "user",
        content: `Artist: ${artist.artist_name ?? artist.full_name}\nTechnique: ${artist.technique ?? "unknown"}\nBio: ${artist.bio ?? "unknown"}\nWhy we like their work: ${artist.fit_rationale ?? "n/a"}\n\nWrite the outreach email.`,
      },
    ],
  });
  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
  return textBlock?.text?.trim() ?? "";
}
