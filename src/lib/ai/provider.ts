import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLASSIFICATION_RULES, DEFAULT_ROUTING } from "./rules";

/**
 * Thin, provider-swappable AI layer. Everything the rest of the app needs
 * from "AI" goes through these three functions — swap the Anthropic calls
 * for another provider here without touching callers.
 */

// Bump when the prompt/logic changes meaningfully enough that existing
// classifications should be considered stale (see src/lib/ai/rules.ts).
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

const CLASSIFY_SYSTEM_PROMPT = `You triage the shared Artbridge inbox (info@artbridge.hu) for a small art business (Ádám and Eszter). For each thread, decide whether it needs an active case at all, then classify it — always from the actual content, never from sender/domain alone.

should_create_case = false for newsletters, spam, phishing, irrelevant promotions, and routine no-reply/automated notifications that require no action. When genuinely uncertain whether something matters, set should_create_case = true with category "other" and status "needs_review" rather than discarding it — never silently drop something that might be important.

Business rules:
${CLASSIFICATION_RULES}

Default routing (content, not just sender, decides which of these applies):
${DEFAULT_ROUTING}

issue_type: for category "customer", pick one of damaged_product, wrong_product, missing_item, delivery_problem, delivery_status, order_change, cancellation, return, refund, product_question, payment_problem, other. For other categories, a short free-text label or null.

status: needs_reply (external party is waiting on us), needs_review (something needs a human decision but isn't simply "reply"), in_progress (actively being worked, not just waiting for a reply), or waiting (we're waiting on an external party or a follow-up date — only set suggested_follow_up_date in that case).

Write the summary in the same language as the email (Hungarian email -> Hungarian summary, English -> English). Be concise: 1-2 sentences. When genuinely unsure about the owner, return owner: null rather than guessing.`;

/** Classifies a thread. Throws if the AI provider call fails — callers decide how to handle that (e.g. leave status as-is and retry later). */
export async function classifyThread(thread: ThreadForAI): Promise<ClassificationResult> {
  const message = await client().messages.create({
    model: CLASSIFY_MODEL,
    max_tokens: 1024,
    system: CLASSIFY_SYSTEM_PROMPT,
    tools: [
      {
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
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "classify_email_thread" },
    messages: [
      {
        role: "user",
        content: `Subject: ${thread.subject ?? "(no subject)"}\nParticipants: ${thread.participants.join(
          ", "
        )}\n\n${conversationText(thread)}`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("AI did not return a classification tool call");

  return ClassificationSchema.parse(toolUse.input);
}

const DRAFT_SYSTEM_PROMPT = `You draft email replies for Artbridge (an art business), sent from info@artbridge.hu. Tone: human, concise, friendly, helpful, direct — never corporate or overly verbose. Reply in the same language the conversation is in (natural Hungarian for Hungarian threads, English for English threads). Write only the reply body — no subject line, no "Dear ..." boilerplate signature block beyond a brief natural sign-off, no explanation of what you did.`;

/** Generates a reply draft body for a thread. Never sends anything — the caller is responsible for the explicit send action. */
export async function generateReplyDraft(thread: ThreadForAI): Promise<string> {
  const message = await client().messages.create({
    model: DRAFT_MODEL,
    max_tokens: 1024,
    system: DRAFT_SYSTEM_PROMPT,
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
