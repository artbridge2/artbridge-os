import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAiInstruction } from "./instructions";
import { loggedCreate } from "./usage-log";
import { findShopifyCustomerByEmail } from "@/lib/shopify/lookup";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Thin, provider-swappable AI layer. Everything the rest of the app needs
 * from "AI" goes through these three functions — swap the Anthropic calls
 * for another provider here without touching callers.
 */

// Bump when the prompt/logic changes meaningfully enough that existing
// classifications should be considered stale (business rules themselves now
// live in the admin-editable ai_instructions table, see Settings → AI).
// v3->v4: forces reprocessing under the Starred-calibration corrections
// (customer replies to automated emails, cold-outreach false positives)
// saved to communication_business_rules/communication_routing as v2.
export const CLASSIFICATION_VERSION = 4;

const CATEGORIES = ["customer", "artist", "developer", "supplier", "internal", "other"] as const;
const STATUSES = ["needs_reply", "needs_review", "in_progress", "waiting"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
const OWNERS = ["adam", "eszter"] as const;

const ClassificationSchema = z.object({
  /** False for newsletters/spam/routine no-reply notifications with no required action — never becomes an active case. */
  should_create_case: z.boolean(),
  category: z.enum(CATEGORIES),
  issue_type: z.string().nullable(),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  owner: z.enum(OWNERS).nullable(),
  summary: z.string(),
  suggested_next_action: z.string().nullable(),
  suggested_follow_up_date: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  /** Only ever set from a real look_up_shopify_customer tool result — never guessed. */
  shopify_customer_id: z.string().nullable(),
  shopify_order_id: z.string().nullable(),
  shopify_match_confidence: z.enum(["confirmed"]).nullable(),
  /** Concrete, case-specific actions only (e.g. "Replace damaged item", "Wait for customer reply") — empty when nothing genuinely useful, never filler. */
  next_actions: z.array(z.string()).default([]),
  /** True only when this is genuinely someone applying/proposing to have their work sold via Artbridge for the first time — never for an existing artist's routine business email, order question, or general inquiry. Drives automatic Artist-record creation/routing, so it must be conservative. */
  is_artist_application: z.boolean().default(false),
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

export interface ThreadMessageInput {
  sender: string | null;
  body: string;
  sentAt: string | null;
  isInbound: boolean;
}

export interface ThreadForAI {
  subject: string | null;
  participants: string[];
  messages: ThreadMessageInput[];
}

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  // The SDK's default timeout/retry behavior can let one slow or transiently
  // failing call consume most of a serverless invocation's entire time
  // budget on its own — cap it so a single thread can never blow the batch.
  return new Anthropic({ apiKey, timeout: 20_000, maxRetries: 1 });
}

const CLASSIFY_MODEL = process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-haiku-4-5-20251001";
const DRAFT_MODEL = process.env.ANTHROPIC_DRAFT_MODEL || "claude-sonnet-5";

// Guards against real-world pathological threads (a 220k-token thread body
// hit Haiku's 200k context window in production) — cap each message body and
// the message count so one oversized thread can't fail classification
// outright instead of just losing some quoted-history detail.
const MAX_MESSAGE_CHARS = 6000;
const MAX_MESSAGES = 20;

function truncateBody(body: string): string {
  if (body.length <= MAX_MESSAGE_CHARS) return body;
  return body.slice(0, MAX_MESSAGE_CHARS) + "\n[...truncated, message continues...]";
}

/** Gmail headers store "Display Name <email@domain.com>" — pull out just the address for anything that needs a real email (Shopify lookups). Falls back to the raw string if there's no angle-bracket form. */
export function extractEmail(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

function conversationText(thread: ThreadForAI): string {
  // Keep the first message (original context) plus the most recent ones —
  // the middle of a very long back-and-forth matters least for classifying
  // current status.
  const messages =
    thread.messages.length > MAX_MESSAGES
      ? [thread.messages[0]!, ...thread.messages.slice(-(MAX_MESSAGES - 1))]
      : thread.messages;

  return messages
    .map(
      (m) =>
        `[${m.isInbound ? "INBOUND" : "OUTBOUND"}${m.sentAt ? " " + m.sentAt : ""}] ${
          m.sender ?? "unknown"
        }:\n${truncateBody(m.body)}`
    )
    .join("\n\n---\n\n");
}

const CORRECTIONS_PER_TYPE = 5;

/**
 * Bounded, recency-biased digest of real human corrections to past AI
 * classification/routing/relevance decisions (spec: "OS corrections become
 * the stronger long-term learning signal"). Few-shot guidance, not rules —
 * the current message and business rules still take priority. Kept small on
 * purpose so classification prompts don't grow indefinitely.
 */
async function buildCorrectionsDigest(): Promise<string> {
  const admin = createAdminClient();

  const [{ data: events }, { data: profiles }] = await Promise.all([
    admin
      .from("communication_case_events")
      .select("event_type, from_value, to_value, email_threads(subject)")
      .in("event_type", ["category_changed", "assigned", "marked_not_relevant"])
      .order("created_at", { ascending: false })
      .limit(90),
    admin.from("profiles").select("id, role"),
  ]);

  if (!events || events.length === 0) return "";

  const roleById = new Map((profiles ?? []).map((p) => [p.id, p.role]));
  const resolveOwner = (id: string | null) => (id ? roleById.get(id) ?? id : "unassigned");

  type Row = { event_type: string; from_value: string | null; to_value: string | null; email_threads: { subject: string | null } | { subject: string | null }[] | null };
  const subjectOf = (row: Row) => {
    const t = row.email_threads;
    return (Array.isArray(t) ? t[0]?.subject : t?.subject) ?? "(no subject)";
  };

  const categoryCorrections = (events as Row[]).filter((e) => e.event_type === "category_changed").slice(0, CORRECTIONS_PER_TYPE);
  const routingCorrections = (events as Row[]).filter((e) => e.event_type === "assigned").slice(0, CORRECTIONS_PER_TYPE);
  const notRelevant = (events as Row[]).filter((e) => e.event_type === "marked_not_relevant").slice(0, CORRECTIONS_PER_TYPE);

  const sections: string[] = [];
  if (categoryCorrections.length > 0) {
    sections.push(
      "Classification corrections (category was wrong, human fixed it):\n" +
        categoryCorrections.map((e) => `- "${subjectOf(e)}": ${e.from_value ?? "unclassified"} -> ${e.to_value}`).join("\n")
    );
  }
  if (routingCorrections.length > 0) {
    sections.push(
      "Routing corrections (owner was wrong, human fixed it):\n" +
        routingCorrections.map((e) => `- "${subjectOf(e)}": ${resolveOwner(e.from_value)} -> ${resolveOwner(e.to_value)}`).join("\n")
    );
  }
  if (notRelevant.length > 0) {
    sections.push(
      "Marked not relevant (AI created a case that shouldn't have been one):\n" +
        notRelevant.map((e) => `- "${subjectOf(e)}" (was category: ${e.from_value ?? "unknown"})`).join("\n")
    );
  }

  if (sections.length === 0) return "";

  return `\nRecent corrections from the team — treat as guidance from real feedback, not absolute rules; the current message's actual content and the business rules above still take priority:\n${sections.join("\n\n")}`;
}

async function buildClassifySystemPrompt(): Promise<string> {
  const [global, businessRules, routing, corrections] = await Promise.all([
    getAiInstruction("global"),
    getAiInstruction("communication_business_rules"),
    getAiInstruction("communication_routing"),
    buildCorrectionsDigest().catch((err) => {
      console.error("[ai] corrections digest failed", err);
      return "";
    }),
  ]);

  return `You triage the shared Artbridge inbox (info@artbridge.hu). For each thread, decide whether it needs an active case at all, then classify it — always from the actual content, never from sender/domain alone.

Call the appropriate tool immediately. Do not write out translations, analysis or reasoning as text first — think it through silently and go straight to the tool call.

${global}

should_create_case = false for newsletters, spam, phishing, irrelevant promotions, and routine no-reply/automated notifications that require no action. When genuinely uncertain whether something matters, set should_create_case = true with category "other" and status "needs_review" rather than discarding it — never silently drop something that might be important.

category "internal" is for Artbridge-to-Artbridge coordination and account/tooling administration between team members (e.g. accounting/bookkeeping correspondence, internal meeting scheduling, a colleague forwarding something for review) — not customer-, artist-, supplier-, or developer-facing. Use "other" when genuinely unsure it even belongs in one of the real categories, not as a synonym for "internal".

Business rules:
${businessRules}

Default routing (content, not just sender, decides which of these applies):
${routing}
${corrections}

issue_type: for category "customer", pick one of damaged_product, wrong_product, missing_item, delivery_problem, delivery_status, order_change, cancellation, return, refund, product_question, payment_problem, other. For other categories, a short free-text label or null.

status: needs_reply (external party is waiting on us), needs_review (something needs a human decision but isn't simply "reply"), in_progress (actively being worked, not just waiting for a reply), or waiting (we're waiting on an external party or a follow-up date — only set suggested_follow_up_date in that case).

is_artist_application: true ONLY when this is a genuine first-time proposal/application from someone wanting Artbridge to sell their art (portfolio links, a pitch to collaborate, "I'd like to apply" language) — this drives automatic Artist-record creation, so be conservative. False for an existing/known artist's routine correspondence (a delivery question, a commission update, general chat), even though category is still "artist". When genuinely unsure whether it's a real application, set confidence low rather than guessing is_artist_application true — a low-confidence thread is routed to a human review queue instead of being auto-created as an Artist.

Write the summary in the same language as the email (Hungarian email -> Hungarian summary, English -> English). Cover: what the actual issue/topic is, what (if anything) has already been resolved or agreed, and what we're currently waiting on or need to decide — 2-4 sentences, not a single generic line. When genuinely unsure about the owner, return owner: null rather than guessing.

next_actions: 0-4 short, concrete, case-specific actions inferred from THIS thread's actual content and status — e.g. "Replace damaged item", "Check order #1234 status", "Wait for customer to confirm size", "Hand off to Adam — technical issue". Never generic filler like "Follow up" with no basis, and never pad the list to look complete — an empty array is correct when nothing concrete is genuinely needed beyond a plain reply.

Shopify matching: call look_up_shopify_customer ONLY when the thread is plausibly a real end-customer (not a supplier, courier, or automated system) asking about their own order/shipping/product/return/payment, AND you can identify that specific customer's own email address (never info@artbridge.hu, never a courier/supplier/no-reply address like GLS, DHL, a webshop platform, etc.). Most threads do not qualify — when in doubt, skip the lookup and leave the shopify fields null. If you do call it, call it exactly once, WAIT for its actual result, and only THEN produce classify_email_thread in a separate response — never call both tools in the same turn, since that means you're guessing the outcome rather than using it. Use the result to set shopify_customer_id, and shopify_order_id only if the thread clearly refers to one specific order from the returned list. Set shopify_match_confidence to "confirmed" only when the tool actually returned a match; otherwise leave all three null. Never invent a Shopify ID without a real tool result.`;
}

const LOOKUP_TOOL: Anthropic.Tool = {
  name: "look_up_shopify_customer",
  description: "Looks up a real Shopify customer by exact email address, returning their id, name, order count, and up to 3 recent orders (id, order number, date, fulfillment status). Returns not_found if no customer has that email, or not_connected if Shopify isn't connected.",
  input_schema: {
    type: "object",
    properties: { email: { type: "string", description: "The customer's own email address, not info@artbridge.hu" } },
    required: ["email"],
  },
};

const CLASSIFY_TOOL: Anthropic.Tool = {
  name: "classify_email_thread",
  description: "Return the classification for this Artbridge inbox email thread.",
  input_schema: {
    type: "object",
    properties: {
      should_create_case: { type: "boolean" },
      category: { type: "string", enum: CATEGORIES as unknown as string[] },
      issue_type: { type: ["string", "null"] },
      status: { type: "string", enum: STATUSES as unknown as string[] },
      priority: { type: "string", enum: PRIORITIES as unknown as string[] },
      owner: {
        type: ["string", "null"],
        enum: [...OWNERS, null] as unknown as string[],
      },
      summary: { type: "string" },
      suggested_next_action: { type: ["string", "null"] },
      suggested_follow_up_date: {
        type: ["string", "null"],
        description: "YYYY-MM-DD, only when status is 'waiting'",
      },
      confidence: { type: "number", minimum: 0, maximum: 1 },
      shopify_customer_id: { type: ["string", "null"], description: "Only from a real look_up_shopify_customer result" },
      shopify_order_id: { type: ["string", "null"], description: "Only from a real look_up_shopify_customer result" },
      shopify_match_confidence: { type: ["string", "null"], enum: ["confirmed", null] },
      next_actions: { type: "array", items: { type: "string" }, description: "0-4 concrete, case-specific actions — empty array when nothing genuine is needed" },
      is_artist_application: { type: "boolean", description: "True only for a genuine first-time application/proposal to sell work via Artbridge — never for an existing artist's routine email" },
    },
    required: [
      "should_create_case",
      "category",
      "issue_type",
      "status",
      "priority",
      "owner",
      "summary",
      "suggested_next_action",
      "suggested_follow_up_date",
      "confidence",
      "shopify_customer_id",
      "shopify_order_id",
      "shopify_match_confidence",
      "next_actions",
      "is_artist_application",
    ],
  },
};

/** Executes the real Shopify lookup and returns a compact, model-readable result — never fabricated, and explicit about not_connected/not_found so the model doesn't treat silence as a match. */
async function runShopifyLookupTool(email: string): Promise<string> {
  try {
    const match = await findShopifyCustomerByEmail(extractEmail(email));
    if (!match) return JSON.stringify({ found: false });
    return JSON.stringify({
      found: true,
      customer_id: match.id,
      name: match.name,
      orders_count: match.ordersCount,
      recent_orders: match.recentOrders.map((o) => ({ order_id: o.id, name: o.name, created_at: o.createdAt, status: o.fulfillmentStatus })),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SHOPIFY_NOT_CONNECTED") return JSON.stringify({ connected: false });
    console.error("[ai] shopify lookup tool failed", err);
    return JSON.stringify({ found: false, error: "lookup_failed" });
  }
}

/**
 * Classifies a thread with real tool access to Shopify customer/order data —
 * a short, bounded (at most one lookup) tool-use loop, not a single blind
 * completion. Throws if the AI provider call fails — callers decide how to
 * handle that (e.g. leave status as-is and retry later).
 */
export async function classifyThread(thread: ThreadForAI, relatedObjectId?: string): Promise<ClassificationResult> {
  const system = await buildClassifySystemPrompt();
  const tools = [LOOKUP_TOOL, CLASSIFY_TOOL];
  const usageMeta = { capability: "communication_classify", relatedObjectId };
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Subject: ${thread.subject ?? "(no subject)"}\nParticipants: ${thread.participants.join(
        ", "
      )}\n\n${conversationText(thread)}`,
    },
  ];

  let response = await loggedCreate(client(), {
    model: CLASSIFY_MODEL,
    max_tokens: 1024,
    system,
    tools,
    tool_choice: { type: "auto" },
    messages,
  }, usageMeta);

  const lookupUse = response.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "look_up_shopify_customer");
  const classifyInSameTurn = response.content.some((block) => block.type === "tool_use" && block.name === "classify_email_thread");

  // The model sometimes calls both tools in the same turn — classifying
  // before it could have actually seen the lookup result. A real second
  // round trip (which is what actually makes the classification Shopify-
  // aware) only happens when the model asked for the lookup and is still
  // waiting on it; otherwise skip the extra latency entirely.
  if (lookupUse && !classifyInSameTurn) {
    const { email } = lookupUse.input as { email: string };
    const toolResult = await runShopifyLookupTool(email);

    messages.push({ role: "assistant", content: response.content });
    messages.push({
      role: "user",
      content: [{ type: "tool_result", tool_use_id: lookupUse.id, content: toolResult }],
    });

    response = await loggedCreate(client(), {
      model: CLASSIFY_MODEL,
      max_tokens: 1024,
      system,
      tools,
      tool_choice: { type: "tool", name: "classify_email_thread" },
      messages,
    }, usageMeta);
  }

  let classification = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "classify_email_thread"
  );

  // With tool_choice "auto" the model occasionally responds with plain text
  // and no tool call at all — force the classification tool directly rather
  // than losing the thread to a spurious error every time this happens.
  if (!classification) {
    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: "Call classify_email_thread now with your classification." });
    response = await loggedCreate(client(), {
      model: CLASSIFY_MODEL,
      max_tokens: 1024,
      system,
      tools,
      tool_choice: { type: "tool", name: "classify_email_thread" },
      messages,
    }, usageMeta);
    classification = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "classify_email_thread"
    );
  }

  if (!classification) throw new Error("AI did not return a classification tool call");

  const parsed = ClassificationSchema.parse(classification.input);

  // If this classification came from the same turn as an (unexecuted) lookup
  // attempt, any shopify_* fields it set are a guess, not a real tool
  // result — discard them rather than risk fabricated IDs.
  if (lookupUse && classifyInSameTurn) {
    return { ...parsed, shopify_customer_id: null, shopify_order_id: null, shopify_match_confidence: null };
  }

  return parsed;
}

async function buildDraftSystemPrompt(): Promise<string> {
  const global = await getAiInstruction("global");
  return `You draft email replies for Artbridge, sent from info@artbridge.hu. Tone: human, concise, friendly, helpful, direct — never corporate or overly verbose. Reply in the same language the conversation is in (natural Hungarian for Hungarian threads, English for English threads). Write only the reply body — no subject line, no "Dear ..." boilerplate signature block beyond a brief natural sign-off, no explanation of what you did. If real Shopify customer/order context is provided below, use it naturally where relevant (e.g. referencing the actual order number/status) — never invent order details that weren't given to you.

${global}`;
}

export interface ShopifyDraftContext {
  customerName: string;
  ordersCount: number;
  recentOrders: { name: string; createdAt: string; fulfillmentStatus: string | null }[];
}

/** Generates a reply draft body for a thread. Never sends anything — the caller is responsible for the explicit send action. */
export async function generateReplyDraft(thread: ThreadForAI, shopifyContext?: ShopifyDraftContext | null, relatedObjectId?: string): Promise<string> {
  const contextBlock = shopifyContext
    ? `\n\nReal Shopify context for this customer (use only what's relevant, never invent beyond this):\nCustomer: ${shopifyContext.customerName}\nOrders: ${shopifyContext.ordersCount}\n${shopifyContext.recentOrders.map((o) => `- ${o.name} (${o.createdAt.slice(0, 10)}) — ${o.fulfillmentStatus ?? "unknown status"}`).join("\n")}`
    : "";

  const message = await loggedCreate(client(), {
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: await buildDraftSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\n\n${conversationText(
          thread
        )}${contextBlock}\n\nWrite the reply to the most recent inbound message.`,
      },
    ],
  }, { capability: "communication_draft", relatedObjectId });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlock?.text?.trim() ?? "";
}

export interface ArtistDraftContext {
  name: string;
  bio: string | null;
  technique: string | null;
  location: string | null;
}

function artistContextBlock(artist: ArtistDraftContext): string {
  const facts = [
    artist.bio && `Bio: ${artist.bio}`,
    artist.technique && `Technique: ${artist.technique}`,
    artist.location && `Location: ${artist.location}`,
  ].filter(Boolean);
  return facts.length ? `\n\nWhat we know about this artist (use only what's relevant, never invent beyond this):\nName: ${artist.name}\n${facts.join("\n")}` : `\n\nArtist name: ${artist.name}`;
}

/**
 * Drafts an Artist outreach email — either the opening message (no prior
 * thread) or a reply within one, using the same shared draft system prompt
 * as Communication. Framing differs from generateReplyDraft because a cold
 * open isn't "a reply to the most recent inbound message".
 */
export async function generateArtistOutreachDraft(
  artist: ArtistDraftContext,
  thread: ThreadForAI,
  relatedObjectId?: string
): Promise<string> {
  const isOpening = thread.messages.length === 0;
  const instruction = isOpening
    ? "Write a short, warm opening outreach email inviting this artist to work with Artbridge — no prior conversation exists yet. Write only the message body — do not include a subject line, the subject is entered separately."
    : "Write the reply to the most recent inbound message.";

  const message = await loggedCreate(client(), {
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: await buildDraftSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\n\n${conversationText(thread)}${artistContextBlock(artist)}\n\n${instruction}`,
      },
    ],
  }, { capability: "artist_outreach_draft", relatedObjectId });

  const textBlock = message.content.find((block): block is Anthropic.TextBlock => block.type === "text");
  return textBlock?.text?.trim() ?? "";
}

/** Brief-guided variant of generateArtistOutreachDraft, same relationship as generateReplyDraftFromBrief has to generateReplyDraft. */
export async function generateArtistOutreachDraftFromBrief(
  artist: ArtistDraftContext,
  thread: ThreadForAI,
  brief: string,
  relatedObjectId?: string
): Promise<string> {
  const isOpening = thread.messages.length === 0;
  const instruction = isOpening
    ? "Write a short, warm opening outreach email inviting this artist to work with Artbridge — no prior conversation exists yet. Write only the message body — do not include a subject line, the subject is entered separately."
    : "Write the reply to the most recent inbound message.";

  const message = await loggedCreate(client(), {
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: await buildDraftSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\n\n${conversationText(thread)}${artistContextBlock(artist)}\n\nInstruction from the sender for this email — follow it, but keep using the real context above rather than ignoring it:\n${brief}\n\n${instruction}`,
      },
    ],
  }, { capability: "artist_outreach_draft", relatedObjectId });

  const textBlock = message.content.find((block): block is Anthropic.TextBlock => block.type === "text");
  return textBlock?.text?.trim() ?? "";
}

/** Same as generateReplyDraft, but guided by a short human brief on top of the existing context — the brief steers the reply, it doesn't replace what's already known about the thread. */
export async function generateReplyDraftFromBrief(
  thread: ThreadForAI,
  brief: string,
  shopifyContext?: ShopifyDraftContext | null,
  relatedObjectId?: string
): Promise<string> {
  const contextBlock = shopifyContext
    ? `\n\nReal Shopify context for this customer (use only what's relevant, never invent beyond this):\nCustomer: ${shopifyContext.customerName}\nOrders: ${shopifyContext.ordersCount}\n${shopifyContext.recentOrders.map((o) => `- ${o.name} (${o.createdAt.slice(0, 10)}) — ${o.fulfillmentStatus ?? "unknown status"}`).join("\n")}`
    : "";

  const message = await loggedCreate(client(), {
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: await buildDraftSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\n\n${conversationText(
          thread
        )}${contextBlock}\n\nInstruction from the sender for this reply — follow it, but keep using the real context above rather than ignoring it:\n${brief}\n\nWrite the reply to the most recent inbound message.`,
      },
    ],
  }, { capability: "communication_draft", relatedObjectId });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlock?.text?.trim() ?? "";
}
