import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getAiInstruction } from "./instructions";
import { findShopifyCustomerByEmail } from "@/lib/shopify/lookup";

/**
 * Thin, provider-swappable AI layer. Everything the rest of the app needs
 * from "AI" goes through these three functions — swap the Anthropic calls
 * for another provider here without touching callers.
 */

// Bump when the prompt/logic changes meaningfully enough that existing
// classifications should be considered stale (business rules themselves now
// live in the admin-editable ai_instructions table, see Settings → AI).
export const CLASSIFICATION_VERSION = 2;

const CATEGORIES = ["customer", "artist", "developer", "supplier", "other"] as const;
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
  return new Anthropic({ apiKey });
}

const CLASSIFY_MODEL = process.env.ANTHROPIC_CLASSIFY_MODEL || "claude-haiku-4-5-20251001";
const DRAFT_MODEL = process.env.ANTHROPIC_DRAFT_MODEL || "claude-sonnet-5";

function conversationText(thread: ThreadForAI): string {
  return thread.messages
    .map(
      (m) =>
        `[${m.isInbound ? "INBOUND" : "OUTBOUND"}${m.sentAt ? " " + m.sentAt : ""}] ${
          m.sender ?? "unknown"
        }:\n${m.body}`
    )
    .join("\n\n---\n\n");
}

async function buildClassifySystemPrompt(): Promise<string> {
  const [global, businessRules, routing] = await Promise.all([
    getAiInstruction("global"),
    getAiInstruction("communication_business_rules"),
    getAiInstruction("communication_routing"),
  ]);

  return `You triage the shared Artbridge inbox (info@artbridge.hu). For each thread, decide whether it needs an active case at all, then classify it — always from the actual content, never from sender/domain alone.

${global}

should_create_case = false for newsletters, spam, phishing, irrelevant promotions, and routine no-reply/automated notifications that require no action. When genuinely uncertain whether something matters, set should_create_case = true with category "other" and status "needs_review" rather than discarding it — never silently drop something that might be important.

Business rules:
${businessRules}

Default routing (content, not just sender, decides which of these applies):
${routing}

issue_type: for category "customer", pick one of damaged_product, wrong_product, missing_item, delivery_problem, delivery_status, order_change, cancellation, return, refund, product_question, payment_problem, other. For other categories, a short free-text label or null.

status: needs_reply (external party is waiting on us), needs_review (something needs a human decision but isn't simply "reply"), in_progress (actively being worked, not just waiting for a reply), or waiting (we're waiting on an external party or a follow-up date — only set suggested_follow_up_date in that case).

Write the summary in the same language as the email (Hungarian email -> Hungarian summary, English -> English). Be concise: 1-2 sentences. When genuinely unsure about the owner, return owner: null rather than guessing.

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
    ],
  },
};

/** Executes the real Shopify lookup and returns a compact, model-readable result — never fabricated, and explicit about not_connected/not_found so the model doesn't treat silence as a match. */
async function runShopifyLookupTool(email: string): Promise<string> {
  try {
    const match = await findShopifyCustomerByEmail(email);
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
export async function classifyThread(thread: ThreadForAI): Promise<ClassificationResult> {
  const system = await buildClassifySystemPrompt();
  const tools = [LOOKUP_TOOL, CLASSIFY_TOOL];
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Subject: ${thread.subject ?? "(no subject)"}\nParticipants: ${thread.participants.join(
        ", "
      )}\n\n${conversationText(thread)}`,
    },
  ];

  let response = await client().messages.create({
    model: CLASSIFY_MODEL,
    max_tokens: 1024,
    system,
    tools,
    tool_choice: { type: "auto" },
    messages,
  });

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

    response = await client().messages.create({
      model: CLASSIFY_MODEL,
      max_tokens: 1024,
      system,
      tools,
      tool_choice: { type: "tool", name: "classify_email_thread" },
      messages,
    });
  }

  const classification = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === "classify_email_thread"
  );
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
  return `You draft email replies for Artbridge, sent from info@artbridge.hu. Tone: human, concise, friendly, helpful, direct — never corporate or overly verbose. Reply in the same language the conversation is in (natural Hungarian for Hungarian threads, English for English threads). Write only the reply body — no subject line, no "Dear ..." boilerplate signature block beyond a brief natural sign-off, no explanation of what you did.

${global}`;
}

/** Generates a reply draft body for a thread. Never sends anything — the caller is responsible for the explicit send action. */
export async function generateReplyDraft(thread: ThreadForAI): Promise<string> {
  const message = await client().messages.create({
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: await buildDraftSystemPrompt(),
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\n\n${conversationText(
          thread
        )}\n\nWrite the reply to the most recent inbound message.`,
      },
    ],
  });

  const textBlock = message.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );
  return textBlock?.text?.trim() ?? "";
}
